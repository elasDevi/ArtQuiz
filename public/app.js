let rubricDirty = false;
const $ = (s, root = document) => root.querySelector(s),
  $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = $("#app");
let lang = localStorage.getItem("prado.lang") || "ro",
  csrf = "",
  session = {},
  content,
  open,
  progress = null,
  step = 0,
  dirty = false,
  saving = false,
  navigating = false,
  saveTimer,
  adminData,
  selectedId = null,
  adminTab = "entries";
const tr = (ro, en) => (lang === "ro" ? ro : en);
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 5500);
}
async function api(url, method = "GET", body) {
  const r = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || `HTTP ${r.status}`);
  return data;
}
async function busy(button, fn) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    await fn();
  } catch (e) {
    toast(e.message);
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}
async function confirm(title, copy) {
  $("#confirm-title").textContent = title;
  $("#confirm-copy").textContent = copy;
  $("#confirm-cancel").textContent = tr("Înapoi", "Go back");
  $("#confirm-ok").textContent = tr("Confirmă", "Confirm");
  const d = $("#confirm");
  d.showModal();
  return new Promise((resolve) =>
    d.addEventListener("close", () => resolve(d.returnValue === "ok"), {
      once: true,
    }),
  );
}
function chrome() {
  document.documentElement.lang = lang;
  $("#language").textContent = lang === "ro" ? "EN" : "RO";
  $("#admin-link").textContent = tr("Profesori ↗", "Teachers ↗");
  $("#footnote").textContent = tr(
    "Privește. Descoperă. Creează conexiuni.",
    "Look closer. Discover. Make connections.",
  );
}
$("#language").onclick = async () => {
  if (
    rubricDirty &&
    !window.confirm(
      tr(
        "Ai modificări nesalvate în barem. Le abandonezi?",
        "Discard unsaved rubric changes?",
      ),
    )
  )
    return;
  rubricDirty = false;
  if (dirty)
    try {
      await save();
    } catch (e) {
      toast(e.message);
      return;
    }
  lang = lang === "ro" ? "en" : "ro";
  localStorage.setItem("prado.lang", lang);
  chrome();
  render();
};
function render() {
  chrome();
  if (content) document.title = content.title;
  if (location.pathname === "/admin")
    return session.admin ? renderAdmin() : renderLogin();
  if (progress)
    return progress.submittedAt ? renderSubmitted() : renderQuestion();
  renderHome();
}
function renderHome() {
  root.innerHTML = `<section class="hero"><div class="hero-text"><span class="eyebrow">${escape(content.museum)}</span><h1>${tr("Arta de a privi.<br><em>Bucuria de a descoperi.</em>", "The art of looking.<br><em>The joy of discovery.</em>")}</h1><p class="intro">${tr("Un muzeu. Sute de povești. O provocare pentru echipa ta. Descoperă capodoperele Prado și lasă arta să-ți pună întrebări.", "One museum. Hundreds of stories. A challenge for your team. Discover Prado’s masterpieces and let art ask the questions.")}</p><div class="pill"><span class="dot"></span>${open ? tr("CONCURS DESCHIS", "CHALLENGE OPEN") : tr("CONCURS ÎNCHIS", "CHALLENGE CLOSED")}</div><div class="facts"><div><b>${content.questions.length}</b>${tr("exerciții de explorat", "exercises to explore")}</div><div><b>100</b>${tr("de puncte posibile", "possible points")}</div><div><b>RO / EN</b>${tr("două limbi, aceeași artă", "two languages, one art")}</div></div></div><div class="hero-art"><img src="/images/page1-2.jpeg" alt="Detaliu din Coborârea de pe cruce, Rogier van der Weyden"><div class="seal"><b>✦</b>${tr("PRIVEȘTE<br>MAI ATENT", "LOOK<br>CLOSER")}</div><div class="hero-caption"><span>ROGIER VAN DER WEYDEN · C. 1435</span><p>${tr("Fiecare detaliu spune o poveste.", "Every detail tells a story.")}</p></div></div></section>${window.winner ? `<div class="winner"><span class="eyebrow">${tr("REZULTAT FINAL VALIDAT", "VALIDATED FINAL RESULT")}</span><h2>${escape(window.winner.group)}</h2><p>${window.winner.total} / 100</p></div>` : ""}<section class="join" id="join"><div><span class="eyebrow">01 · ${tr("ÎNCEPE EXPLORAREA", "START EXPLORING")}</span><h2>${tr("Echipa ta.<br>Perspectiva voastră.", "Your team.<br>Your perspective.")}</h2><p class="muted">${tr("Alege un nume unic pentru echipă, descrie membrii și păstrează codul pentru a relua răspunsurile. Numărul de echipe nu este limitat.", "Choose a unique team name, describe its members and keep your code to resume. There is no fixed number of teams.")}</p><p class="help">${tr("Fără conturi individuale. Folosește doar prenumele membrilor. Păstrează codul în echipă: acesta oferă acces la răspunsurile voastre.", "No individual accounts. Use members’ first names only. Keep the code within your team: it grants access to your answers.")}</p></div><form id="join-form" class="card"><div class="field"><label for="join-mode">${tr("Participare", "Entry")}</label><select id="join-mode"><option value="register">${tr("Înscrie o echipă nouă", "Register a new team")}</option><option value="resume">${tr("Reia participarea unei echipe", "Resume your team’s entry")}</option></select></div><div class="form-row"><div class="field"><label for="group">${tr("Numele echipei", "Team name")}</label><input id="group" required minlength="2" maxlength="80" autocomplete="organization" placeholder="${tr("Ex. Exploratorii Prado", "e.g. Prado Explorers")}"></div><div class="field"><label for="code">${tr("Codul echipei", "Team code")}</label><input id="code" required minlength="6" maxlength="40" pattern="[A-Za-z0-9-]{6,40}" autocomplete="off" placeholder="ex. PRADO-7K29" aria-describedby="code-help"></div></div><div class="field" id="members-field"><label for="members">${tr("Descrierea echipei și membrii", "Team description and members")}</label><textarea id="members" required minlength="2" maxlength="1500" placeholder="${tr("Prenumele membrilor și o scurtă descriere a echipei", "Members’ first names and a short team description")}"></textarea></div><p class="help" id="code-help">${tr("6–40 litere sau cifre. Recomandăm minimum 10 caractere aleatorii. Un cod = o participare.", "6–40 letters or numbers. At least 10 random characters recommended. One code = one entry.")}</p><p class="error-text" id="join-error"></p><button class="wide" ${!open ? "disabled" : ""}>${tr("Intră în provocare", "Enter the challenge")} <span>→</span></button>${!open ? `<p class="help">${tr("Concursul este închis. Profesoara îl poate redeschide.", "The challenge is closed. Your teacher can reopen it.")}</p>` : ""}<p class="help">${tr("Răspunsurile se salvează automat cât timp ești conectat. Trimiterea finală blochează modificările.", "Answers save automatically while connected. Final submission locks your entry.")}</p></form></section>`;
  $("#join-mode").onchange = () => {
    const resume = $("#join-mode").value === "resume";
    $("#members-field").classList.toggle("hidden", resume);
    $("#members").required = !resume;
  };
  $("#join-form").onsubmit = (e) => {
    e.preventDefault();
    busy($("#join-form button"), async () => {
      try {
        progress = await api("/api/join", "POST", {
          group: $("#group").value,
          code: $("#code").value,
          members: $("#members").value,
          mode: $("#join-mode").value,
        });
        step = 0;
        dirty = false;
        render();
        window.scrollTo(0, 0);
      } catch (err) {
        $("#join-error").textContent = err.message;
      }
    });
  };
}
const complete = (q) =>
  q.fields.every((f) => progress.answers[q.id]?.[f.key]?.trim()) &&
  (!q.emotions || progress.answers[q.id]?.emotions?.length);
const completed = () => content.questions.filter(complete).length;
function statusText() {
  const el = $("#save-status");
  if (el)
    el.textContent = saving
      ? tr("Se salvează…", "Saving…")
      : dirty
        ? tr("Modificări nesalvate", "Unsaved changes")
        : tr("✓ Salvat pe server", "✓ Saved on server");
}
async function save() {
  clearTimeout(saveTimer);
  if (saving) {
    await new Promise((r) => setTimeout(r, 100));
    return save();
  }
  if (!dirty || !progress || progress.submittedAt) return;
  saving = true;
  statusText();
  const answers = structuredClone(progress.answers);
  try {
    const r = await api("/api/progress", "PUT", {
      answers,
      revision: progress.revision,
    });
    progress.revision = r.revision;
    if (JSON.stringify(progress.answers) === JSON.stringify(answers)) {
      dirty = false;
      localStorage.removeItem("prado.backup." + progress.id);
    }
  } finally {
    saving = false;
    statusText();
  }
}
function schedule() {
  dirty = true;
  localStorage.setItem(
    "prado.backup." + progress.id,
    JSON.stringify({ answers: progress.answers, at: Date.now() }),
  );
  statusText();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(
    () =>
      save().catch((e) => {
        const s = $("#save-status");
        if (s)
          s.textContent = tr(
            "Nesalvat. Verifică internetul și apasă Salvează.",
            "Not saved. Check your connection and press Save.",
          );
        toast(e.message);
      }),
    900,
  );
  updateSteps();
}
function updateSteps() {
  const n = completed();
  $("#completed-count") &&
    ($("#completed-count").textContent = `${n} / ${content.questions.length}`);
  const b = $("#progress-bar");
  if (b) b.style.width = `${(n / content.questions.length) * 100}%`;
  $$(".step").forEach((s, i) =>
    s.classList.toggle("done", !!complete(content.questions[i])),
  );
}
async function move(next) {
  if (navigating) return;
  navigating = true;
  try {
    await save();
    step = next;
    renderQuestion();
    $("#question-area").scrollIntoView({ block: "start", behavior: "smooth" });
  } catch (e) {
    toast(e.message);
  } finally {
    navigating = false;
  }
}
function renderQuestion() {
  const q = content.questions[step];
  root.innerHTML = `<div class="page-head"><div><span class="eyebrow">${escape(content.museum)}</span><h1>${escape(content.title)}</h1><span class="subtitle">${escape(progress.group)} · ${tr("Explorează în ritmul tău", "Explore at your own pace")}</span></div><button id="leave" class="secondary">${tr("Ieși", "Leave")} ↗</button></div>${!open ? `<div class="notice error">${tr("Concursul este închis. Răspunsurile salvate sunt păstrate; modificările sunt oprite.", "The challenge is closed. Saved answers are preserved; editing is paused.")}</div>` : ""}<div class="workspace"><aside class="sidebar"><div class="card"><span class="eyebrow">${tr("PARCURSUL ECHIPEI", "YOUR TEAM’S JOURNEY")}</span><div class="review-head"><span class="muted">${tr("Completate", "Completed")}</span><b id="completed-count">${completed()} / ${content.questions.length}</b></div><div class="progress-line"><span id="progress-bar"></span></div><div class="steps">${content.questions.map((x, i) => `<button class="step ${step === i ? "active" : ""} ${complete(x) ? "done" : ""}" data-step="${i}" aria-label="${x.id}. ${escape(x[lang])}" ${step === i ? 'aria-current="step"' : ""}><span class="num">${String(x.id).padStart(2, "0")}</span><span class="step-label">${escape(x[lang])}</span></button>`).join("")}</div><p class="help">${tr("Observă detaliile. Discută cu echipa. Răspunsurile voastre contează.", "Observe details. Talk with your team. Your perspective matters.")}</p></div></aside><section id="question-area" class="card question">${q ? questionMarkup(q) : summaryMarkup()}</section></div>`;
  $$("[data-step]").forEach(
    (b) => (b.onclick = () => move(Number(b.dataset.step))),
  );
  $("#leave").onclick = () =>
    busy($("#leave"), async () => {
      await save();
      await api("/api/logout", "POST");
      progress = null;
      session = await api("/api/session");
      csrf = session.csrf;
      render();
    });
  if (q) {
    $$("[data-field]").forEach((el) => {
      el.disabled = !open;
      el.oninput = () => {
        progress.answers[q.id] ||= {};
        progress.answers[q.id][el.dataset.field] = el.value;
        schedule();
      };
    });
    $$("[data-emotion]").forEach((el) => {
      el.disabled = !open;
      el.onchange = () => {
        progress.answers[q.id] ||= {};
        progress.answers[q.id].emotions = $$("[data-emotion]:checked").map(
          (x) => x.value,
        );
        schedule();
      };
    });
    $("#previous").onclick = () => move(Math.max(0, step - 1));
    $("#next").onclick = () => move(step + 1);
    $("#save-now").onclick = () =>
      busy($("#save-now"), async () => {
        await save();
        toast(tr("Progres salvat", "Progress saved"));
      });
  } else {
    $$("[data-edit]").forEach(
      (b) => (b.onclick = () => move(Number(b.dataset.edit))),
    );
    $("#final-submit").onclick = () =>
      busy($("#final-submit"), async () => {
        await save();
        if (
          !(await confirm(
            tr("Trimiți răspunsurile finale?", "Submit final answers?"),
            tr(
              "După trimitere nu vei mai putea modifica răspunsurile. Verifică împreună cu echipa.",
              "You cannot edit answers after submitting. Review them with your team.",
            ),
          ))
        )
          return;
        await api("/api/submit", "POST", { revision: progress.revision });
        progress = await api("/api/progress");
        renderSubmitted();
      });
  }
  statusText();
  updateSteps();
}
function questionMarkup(q) {
  const a = progress.answers[q.id] || {};
  return `<div class="question-top"><span class="eyebrow">${tr("EXERCIȚIUL", "EXERCISE")} ${String(q.id).padStart(2, "0")} / ${content.questions.length}</span><span class="pill">${q.points} ${tr("puncte", "points")}</span></div><h2>${escape(q[lang])}</h2>${q.hint ? `<div class="hint">${escape(q.hint[lang])}</div>` : ""}${q.image ? `<img class="question-image" src="${escape(q.image)}" alt="${tr("Detaliu original din fișa Prado, exercițiul", "Original detail from the Prado worksheet, exercise")} ${q.id}"><p class="image-caption">${tr("DETALIU DIN FIȘA DE VIZITĂ · PRIVEȘTE CU ATENȚIE", "DETAIL FROM YOUR WORKSHEET · LOOK CLOSELY")}</p>` : ""}${q.fields.map((f) => `<div class="field"><label for="field-${f.key}">${escape(f[lang])}</label><textarea id="field-${f.key}" data-field="${escape(f.key)}" maxlength="6000" placeholder="${tr("Scrie răspunsul echipei…", "Write your team’s answer…")}">${escape(a[f.key] || "")}</textarea></div>`).join("")}${
    q.emotions
      ? `<div class="field"><label>${tr("Ce emoții îți transmite pictura? Alege una sau mai multe.", "How does the painting make you feel? Choose one or more.")}</label><div class="check-grid">${[
          ["fear", "Teamă", "Fear"],
          ["sadness", "Tristețe", "Sadness"],
          ["surprise", "Surpriză", "Surprise"],
          ["joy", "Bucurie", "Joy"],
          ["unease", "Neliniște", "Unease"],
          ["anger", "Furie", "Anger"],
        ]
          .map(
            ([v, ro, en]) =>
              `<label><input type="checkbox" data-emotion value="${v}" ${a.emotions?.includes(v) ? "checked" : ""}>${tr(ro, en)}</label>`,
          )
          .join("")}</div></div>`
      : ""
  }<div class="actions"><button id="save-now" class="secondary">${tr("Salvează acum", "Save now")}</button><span class="save-status" id="save-status"></span></div><div class="actions question-nav"><button class="secondary" id="previous" ${step === 0 ? "disabled" : ""}>← ${tr("Înapoi", "Back")}</button><button id="next">${step === content.questions.length - 1 ? tr("Verifică răspunsurile", "Review answers") : tr("Mai departe", "Continue")} →</button></div>`;
}
function summaryMarkup() {
  return `<span class="eyebrow">${tr("ULTIMUL PAS", "ONE LAST STEP")}</span><h2>${tr("O ultimă privire.", "One last look.")}</h2><p class="muted">${tr("Verifică răspunsurile înainte de trimitere.", "Review your answers before submitting.")}</p><div class="summary-list">${content.questions.map((q, i) => `<div class="summary-row"><span>${q.id}. ${escape(q[lang])}<br><small class="muted">${complete(q) ? tr("✓ Completat", "✓ Complete") : tr("○ Mai sunt câmpuri de completat", "○ Some fields are missing")}</small></span><button class="secondary" data-edit="${i}">${tr("Verifică", "Review")}</button></div>`).join("")}</div><p class="help">${tr("Poți trimite o singură dată pentru acest cod.", "You can only submit once with this code.")}</p><button class="wide" id="final-submit" ${completed() !== content.questions.length || !open ? "disabled" : ""}>${tr("Trimite răspunsurile finale", "Submit final answers")} →</button>`;
}
function renderSubmitted() {
  root.innerHTML = `<section class="center card"><div class="big-mark">✦</div><span class="eyebrow">${tr("PROVOCARE ÎNCHEIATĂ", "CHALLENGE COMPLETED")}</span><h1>${tr("Arta rămâne cu voi.", "Art stays with you.")}</h1><p>${tr("Răspunsurile au fost trimise cu succes. Profesoara le va evalua și va valida rezultatele înainte de desemnarea câștigătorului.", "Your answers have been submitted. Your teacher will assess and validate results before announcing a winner.")}</p><div class="notice success">${escape(progress.group)} · ${tr("Trimis", "Submitted")}: ${escape(new Date(progress.submittedAt).toLocaleString(lang === "ro" ? "ro-RO" : "en-GB"))}<br>ID: ${escape(progress.id.slice(0, 8))}</div><p class="help">${tr("Răspunsurile sunt salvate pe server și nu mai pot fi modificate.", "Your answers are stored on the server and can no longer be edited.")}</p><button id="home">${tr("Înapoi la început", "Back to the start")}</button></section>`;
  $("#home").onclick = () => {
    progress = null;
    renderHome();
  };
}
function renderLogin() {
  root.innerHTML = `<section class="login card"><span class="eyebrow">${tr("SPAȚIUL PROFESOAREI", "TEACHER’S SPACE")}</span><h1>${session.needsSetup ? tr("Prima configurare", "First-time setup") : tr("Bine ai revenit.", "Welcome back.")}</h1><p class="muted">${session.needsSetup ? tr("Creează parola administratorului folosind tokenul din fișierul data/.setup-token de pe server.", "Create an administrator password using the token in data/.setup-token on the server.") : tr("Răspunsuri, evaluare și clasament — într-un singur loc.", "Answers, assessment and rankings — all in one place.")}</p><form id="login-form">${session.needsSetup ? `<div class="field"><label for="setup-token">Setup token</label><input id="setup-token" type="password" required autocomplete="off"></div>` : ""}<div class="field"><label for="password">${tr("Parolă administrator", "Administrator password")}</label><input id="password" type="password" required ${session.needsSetup ? 'minlength="12"' : ""} maxlength="200" autocomplete="${session.needsSetup ? "new-password" : "current-password"}"></div><p class="error-text" id="login-error"></p><button class="wide">${session.needsSetup ? tr("Configurează accesul", "Configure access") : tr("Intră în panou", "Open dashboard")} →</button></form></section>`;
  $("#login-form").onsubmit = (e) => {
    e.preventDefault();
    busy($("#login-form button"), async () => {
      try {
        if (session.needsSetup) {
          await api("/api/admin/setup", "POST", {
            token: $("#setup-token").value,
            password: $("#password").value,
          });
          session.needsSetup = false;
        }
        const r = await api("/api/admin/login", "POST", {
          password: $("#password").value,
        });
        csrf = r.csrf;
        session.admin = true;
        await loadAdmin();
      } catch (err) {
        $("#login-error").textContent = err.message;
      }
    });
  };
}
async function loadAdmin() {
  adminData = await api("/api/admin");
  renderAdmin();
}
function renderAdmin() {
  if (!adminData) {
    loadAdmin().catch((e) => toast(e.message));
    return;
  }
  const d = adminData;
  root.innerHTML = `<div class="page-head"><div><span class="eyebrow">${tr("PANOU DE ADMINISTRARE", "TEACHER DASHBOARD")}</span><h1>${escape(d.content.title)}</h1><span class="pill"><span class="dot"></span>${d.open ? tr("CONCURS DESCHIS", "CHALLENGE OPEN") : tr("CONCURS ÎNCHIS", "CHALLENGE CLOSED")}</span></div><button class="secondary" id="logout">${tr("Deconectare", "Sign out")} ↗</button></div><div class="stats"><div class="card stat"><b>${d.entries.length}</b><span>${tr("participări", "entries")}</span></div><div class="card stat"><b>${d.entries.filter((e) => e.submitted_at).length}</b><span>${tr("trimise", "submitted")}</span></div><div class="card stat"><b>${d.entries.filter((e) => e.validated).length}</b><span>${tr("validate", "validated")}</span></div></div><div class="admin-tabs">${[
    ["entries", "Răspunsuri & evaluare", "Answers & assessment"],
    ["rubric", "Barem & răspunsuri corecte", "Rubric & correct answers"],
    ["ranking", "Clasament", "Rankings"],
    ["settings", "Concurs & configurare", "Challenge & settings"],
  ]
    .map(
      ([id, ro, en]) =>
        `<button data-tab="${id}" class="${adminTab === id ? "active" : ""}">${tr(ro, en)}</button>`,
    )
    .join(
      "",
    )}<button id="refresh">↻ ${tr("Actualizează", "Refresh")}</button></div><div id="admin-body"></div>`;
  $("#logout").onclick = () =>
    busy($("#logout"), async () => {
      await api("/api/logout", "POST");
      session = await api("/api/session");
      csrf = session.csrf;
      adminData = null;
      render();
    });
  $$("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        if (
          rubricDirty &&
          !window.confirm(
            tr(
              "Ai modificări nesalvate în barem. Le abandonezi?",
              "Discard unsaved rubric changes?",
            ),
          )
        )
          return;
        rubricDirty = false;
        adminTab = b.dataset.tab;
        renderAdmin();
      }),
  );
  $("#refresh").onclick = () =>
    busy($("#refresh"), async () => {
      if (
        rubricDirty &&
        !window.confirm(
          tr(
            "Ai modificări nesalvate în barem. Le abandonezi?",
            "Discard unsaved rubric changes?",
          ),
        )
      )
        return;
      rubricDirty = false;
      await loadAdmin();
    });
  if (adminTab === "entries") renderEntries();
  if (adminTab === "ranking") renderRanking();
  if (adminTab === "settings") renderSettings();
  if (adminTab === "rubric") renderRubric();
}
function renderEntries() {
  const d = adminData;
  const groups = ["", ...new Set(d.entries.map((e) => e.group_name))];
  $("#admin-body").innerHTML =
    `<div class="admin-grid"><aside><div class="field"><label for="filter-group">${tr("Filtrează pe echipă", "Filter by team")}</label><select id="filter-group">${groups.map((g) => `<option value="${escape(g)}">${escape(g) || tr("Toate echipele", "All teams")}</option>`).join("")}</select></div><div class="entry-list" id="entry-list"></div></aside><section class="card" id="entry-detail"></section></div>`;
  $("#filter-group").onchange = renderEntryList;
  renderEntryList();
  renderEntryDetail();
}
function renderEntryList() {
  const group = $("#filter-group").value;
  const es = adminData.entries.filter((e) => !group || e.group_name === group);
  $("#entry-list").innerHTML = es.length
    ? es
        .map(
          (e) =>
            `<button class="entry-button ${selectedId === e.id ? "active" : ""}" data-entry="${e.id}">${escape(e.group_name)} · ${e.id.slice(0, 6)}<span>${e.validated ? tr("✓ Validat", "✓ Validated") : e.submitted_at ? tr("Trimis · de evaluat", "Submitted · to assess") : tr("Ciornă", "Draft")}${e.scores ? " · " + evaluationTotal(e.scores) + "/100" : ""}</span></button>`,
        )
        .join("")
    : `<p class="empty">${tr("Nicio participare încă.", "No entries yet.")}</p>`;
  $$("[data-entry]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedId = b.dataset.entry;
        renderEntryList();
        renderEntryDetail();
      }),
  );
}
const bonus = () => Number(adminData?.content.bonusPoints || 0);
const evaluationTotal = (s) => Math.round((sum(s) + bonus()) * 100) / 100;
const sum = (s) =>
  Math.round((s || []).reduce((a, x) => a + Number(x.score || 0), 0) * 100) /
  100;
function renderEntryDetail() {
  const e = adminData.entries.find((e) => e.id === selectedId);
  if (!e) {
    $("#entry-detail").innerHTML =
      `<div class="empty"><div class="big-mark">✦</div><h2>${tr("Fiecare perspectivă contează.", "Every perspective matters.")}</h2><p>${tr("Selectează o participare pentru a citi și evalua răspunsurile.", "Select an entry to read and assess its answers.")}</p></div>`;
    return;
  }
  const qs = adminData.content.questions;
  $("#entry-detail").innerHTML =
    `<div class="review-head"><div><span class="eyebrow">${e.submitted_at ? tr("PARTICIPARE TRIMISĂ", "SUBMITTED ENTRY") : tr("CIORNĂ · DOAR CITIRE", "DRAFT · READ ONLY")}</span><h2>${escape(e.group_name)}</h2><p class="subtitle">${escape(e.members || tr("Membri nespecificați", "Members not specified"))}</p><p class="subtitle">ID ${e.id.slice(0, 8)} · ${e.submitted_at ? escape(new Date(e.submitted_at).toLocaleString()) : tr("În lucru", "In progress")}</p></div><div class="total"><span id="score-total">${e.scores ? evaluationTotal(e.scores) : "—"}</span><small> / 100</small></div></div>${e.validated ? `<div class="notice success">${tr("Rezultat validat de profesoară. Orice modificare invalidează desemnarea câștigătorului.", "Teacher-validated result. Changes reset the winner announcement.")}</div>` : ""}${e.submitted_at ? `<button id="ai-score" class="secondary" ${e.validated || !adminData.aiConfigured ? "disabled" : ""}>✦ ${tr("Propune evaluare cu AI", "Suggest scores with AI")}</button><p class="help">${adminData.aiConfigured ? tr("Răspunsurile vor fi trimise serviciului AI configurat. Verifică toate propunerile înainte de validare.", "Answers will be sent to the configured AI service. Review every proposal before validation.") : tr("AI nu este configurat. Adaugă AI_API_KEY pe server pentru evaluare automată. Evaluarea manuală funcționează acum.", "AI is not configured. Add AI_API_KEY on the server for automated assessment. Manual assessment is available now.")}</p>` : ""}<form id="scores-form">${qs
      .map((q) => {
        const s = e.scores?.find((x) => x.id === q.id),
          a = e.answers[q.id] || {};
        return `<section class="score-card"><h3>${q.id}. ${escape(q[lang])}</h3>${q.fields.map((f) => `<label>${escape(f[lang])}</label><div class="answer">${escape(a[f.key] || "—")}</div>`).join("")}${a.emotions ? `<div class="answer">${escape(a.emotions.join(", "))}</div>` : ""}<details><summary class="help">${tr("Barem orientativ", "Assessment rubric")} · ${q.points} ${tr("puncte", "points")}</summary><p class="help"><b>${tr("Răspuns corect / repere", "Correct answer / reference")}</b><br>${escape(q.correctAnswer)}</p><p class="help">${escape(q.rubric)}</p></details>${e.submitted_at ? `<div class="score-fields"><div><label for="score-${q.id}">${tr("Punctaj", "Score")} / ${q.points}</label><input type="number" id="score-${q.id}" data-score="${q.id}" min="0" max="${q.points}" step="0.01" value="${s?.score ?? ""}" required></div><div><label for="reason-${q.id}">${tr("Justificare / feedback", "Reason / feedback")}</label><textarea id="reason-${q.id}" data-reason="${q.id}" required maxlength="6000">${escape(s?.reason || "")}</textarea></div></div>` : ""}</section>`;
      })
      .join(
        "",
      )}${e.submitted_at ? `<div class="review-bar"><label class="inline-check"><input type="checkbox" id="validated" ${e.validated ? "checked" : ""}>${tr("Am verificat toate răspunsurile și validez rezultatul.", "I have reviewed every answer and validate this result.")}</label><div class="actions"><button type="submit">${tr("Salvează evaluarea", "Save assessment")}</button><span class="help">${tr(`Include ${bonus()} puncte din oficiu · maximum 100`, `Includes ${bonus()} participation points · maximum 100`)}</span></div></div>` : ""}</form>`;
  if (e.submitted_at) {
    $$("[data-score]").forEach(
      (el) =>
        (el.oninput = () =>
          ($("#score-total").textContent = evaluationTotal(
            $$("[data-score]").map((x) => ({ score: Number(x.value) })),
          ))),
    );
    $("#ai-score").onclick = () =>
      busy($("#ai-score"), async () => {
        if (
          !(await confirm(
            tr("Propunere AI", "AI assessment"),
            tr(
              "AI va înlocui propunerea curentă nevalidată. Răspunsurile sunt trimise către OpenAI pentru evaluare. Continui?",
              "AI will replace the current unvalidated proposal. Answers are sent to OpenAI for assessment. Continue?",
            ),
          ))
        )
          return;
        $("#ai-score").textContent = tr(
          "Se evaluează… poate dura un minut",
          "Assessing… may take a minute",
        );
        await api(`/api/admin/entries/${e.id}/ai`, "POST", {});
        await loadAdmin();
        toast(
          tr(
            "Propunerea AI este gata. Verifică fiecare justificare.",
            "AI proposal is ready. Review every explanation.",
          ),
        );
      });
    $("#scores-form").onsubmit = (ev) => {
      ev.preventDefault();
      busy($("#scores-form button[type=submit]"), async () => {
        const scores = qs.map((q) => ({
          id: q.id,
          score: Number($(`#score-${q.id}`).value),
          reason: $(`#reason-${q.id}`).value,
        }));
        await api(`/api/admin/entries/${e.id}/scores`, "PUT", {
          scores,
          validated: $("#validated").checked,
          revision: e.revision,
        });
        await loadAdmin();
        toast(tr("Evaluare salvată", "Assessment saved"));
      });
    };
  }
}
function renderRanking() {
  const d = adminData;
  $("#admin-body").innerHTML =
    `${d.winner ? `<div class="winner"><span class="eyebrow">${tr("ECHIPA CÂȘTIGĂTOARE · REZULTAT VALIDAT", "WINNING TEAM · VALIDATED RESULT")}</span><h2>✦ ${escape(d.winner.group)}</h2><p>${d.winner.total} / 100</p></div>` : ""}<div class="card"><span class="eyebrow">${tr("CLASAMENTUL ECHIPELOR", "TEAM RANKINGS")}</span><h2>${tr("Priviri diferite. Reușite împreună.", "Different perspectives. Shared achievements.")}</h2><p class="help">${tr("Fiecare echipă nouă are o singură participare. Totalul include punctele din oficiu și apare după validarea profesoarei. Ciornele nu intră în calcul. La egalitate, profesoara alege dintre echipele cu punctaj maxim. Participările istorice cu același nume sunt grupate prin medie.", "Each new team has one entry. Totals include participation points and appear after teacher validation. Drafts are excluded. Ties are resolved by choosing among top-scoring teams. Historical entries sharing a name are averaged.")}</p><div class="table-wrap"><table><thead><tr><th>#</th><th>${tr("Numele echipei", "Team name")}</th><th>${tr("Participări", "Entries")}</th><th>${tr("Punctaj", "Score")}</th><th>${tr("Validare", "Validation")}</th></tr></thead><tbody>${d.ranking.map((r, i) => `<tr><td>${r.validated ? i + 1 : "—"}</td><td>${escape(r.group)}</td><td>${r.count}</td><td>${r.total ?? "—"} / 100</td><td>${r.validated ? "✓" : tr("În așteptare", "Pending")}</td></tr>`).join("")}</tbody></table></div><div class="actions"><a class="button secondary" href="/api/admin/export.xlsx">↓ Excel</a><a class="button secondary" href="/api/admin/export.pdf">↓ PDF</a></div><div class="notice">${tr("Câștigătorul poate fi desemnat după închiderea concursului și validarea tuturor participărilor trimise.", "Announce a winner after closing the challenge and validating all submitted entries.")}</div><div class="form-row"><div><label for="winner-group">${tr("Echipa câștigătoare", "Winning team")}</label><select id="winner-group">${d.ranking
      .filter((r) => r.validated && r.total === d.ranking[0]?.total)
      .map((r) => `<option>${escape(r.group)}</option>`)
      .join(
        "",
      )}</select></div><div class="actions"><button id="announce" ${d.open || !d.entries.some((e) => e.submitted_at) || d.entries.some((e) => e.submitted_at && !e.validated) ? "disabled" : ""}>✦ ${tr("Desemnează câștigătorul", "Announce winner")}</button></div></div></div>`;
  $("#announce").onclick = () =>
    busy($("#announce"), async () => {
      if (
        !(await confirm(
          tr("Publică rezultatul final?", "Announce final result?"),
          tr(
            "Echipa câștigătoare va apărea pe pagina de start.",
            "The winning team will be displayed on the home page.",
          ),
        ))
      )
        return;
      await api("/api/admin/winner", "POST", {
        group: $("#winner-group").value,
      });
      await loadAdmin();
    });
}
function renderSettings() {
  const d = adminData;
  $("#admin-body").innerHTML =
    `<section class="card"><span class="eyebrow">${tr("CONTROLUL CONCURSULUI", "CHALLENGE CONTROLS")}</span><h2>${tr("Pregătește următoarea descoperire.", "Prepare the next discovery.")}</h2><div class="actions"><button id="toggle-contest" class="secondary">${d.open ? tr("Închide concursul", "Close challenge") : tr("Deschide concursul", "Open challenge")}</button></div><p class="help">${tr("Închiderea oprește intrările, salvările și trimiterile noi. Răspunsurile existente rămân păstrate. Schimbarea stării resetează anunțul câștigătorului.", "Closing stops new entries, saves and submissions. Existing answers are preserved. Changing status resets the winner announcement.")}</p><h3>${tr("Invită echipele", "Invite your teams")}</h3><p class="help">${tr("Codul QR folosește PUBLIC_URL dacă este configurat, altfel adresa curentă. Verifică adresa publică înainte de distribuire.", "The QR uses PUBLIC_URL when configured, otherwise the current address. Verify the public URL before sharing.")}</p><img src="/api/admin/qr" class="qr" alt="QR code"><div class="actions"><button class="secondary" id="copy-link">${tr("Copiază linkul elevilor", "Copy student link")}</button><a class="button secondary" href="/api/admin/qr" download="prado-qr.png">↓ QR PNG</a></div><hr><h3>${tr("Întrebări, imagini și barem", "Questions, images and rubric")}</h3><p class="help">${tr("Editează JSON înainte de prima participare. Punctajele întrebărilor plus punctele din oficiu trebuie să totalizeze exact 100. Folosește ecranul Barem pentru editarea simplă, inclusiv după înscrieri. Imaginile sunt fișiere locale din public/images; folosește căi /images/nume.jpg. Pentru un alt muzeu, păstrează baza curentă și pornește cu un DATA_DIR nou.", "Edit JSON before the first entry. Question points plus participation points must total exactly 100. Use the Rubric screen for simple editing, including after registration. Images are local files in public/images; use /images/name.jpg paths. For another museum, preserve the current database and start with a new DATA_DIR.")}</p><form id="content-form"><label for="content-json">${tr("Configurație completă", "Complete configuration")}</label><textarea class="config-editor" id="content-json" spellcheck="false" ${d.entries.length ? "readonly" : ""}>${escape(JSON.stringify(d.content, null, 2))}</textarea><div class="actions"><button ${d.entries.length ? "disabled" : ""}>${tr("Salvează configurația", "Save configuration")}</button><button type="button" id="download-config" class="secondary">↓ JSON</button></div></form><details><summary class="help">${tr("Istoric operațiuni (ultimele 100)", "Audit log (latest 100)")}</summary><div class="answer">${d.audit.map((a) => escape(`${a.at} · ${a.action} · ${a.entry_id?.slice(0, 8) || ""}`)).join("\n")}</div></details></section>`;
  $("#toggle-contest").onclick = () =>
    busy($("#toggle-contest"), async () => {
      if (
        !(await confirm(
          d.open
            ? tr("Închizi concursul?", "Close the challenge?")
            : tr("Redeschizi concursul?", "Reopen the challenge?"),
          tr(
            "Anunțul câștigătorului, dacă există, va fi resetat.",
            "Any winner announcement will be reset.",
          ),
        ))
      )
        return;
      await api("/api/admin/contest", "POST", { open: !d.open });
      await loadAdmin();
    });
  $("#copy-link").onclick = async () => {
    try {
      await navigator.clipboard.writeText(d.publicUrl);
      toast(tr("Linkul elevilor a fost copiat.", "Student link copied."));
    } catch {
      toast(d.publicUrl);
    }
  };
  $("#content-form").onsubmit = (e) => {
    e.preventDefault();
    busy($("#content-form button"), async () => {
      let c;
      try {
        c = JSON.parse($("#content-json").value);
      } catch {
        throw Error(tr("JSON invalid", "Invalid JSON"));
      }
      await api("/api/admin/content", "PUT", c);
      await loadAdmin();
      toast(tr("Configurație salvată", "Configuration saved"));
    });
  };
  $("#download-config").onclick = () => {
    const blob = new Blob([JSON.stringify(d.content, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "museum-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };
}
window.addEventListener("beforeunload", (e) => {
  if (dirty || rubricDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("online", () => {
  if (dirty) save().catch((e) => toast(e.message));
});
async function init() {
  try {
    session = await api("/api/session");
    csrf = session.csrf;
    const c = await api("/api/content");
    content = c.content;
    open = c.open;
    window.winner = c.winner;
    if (location.pathname !== "/admin" && session.student) {
      progress = await api("/api/progress");
      const backup = localStorage.getItem("prado.backup." + progress.id);
      if (backup && !progress.submittedAt) {
        const local = JSON.parse(backup);
        if (
          await confirm(
            tr("Recuperezi modificările locale?", "Recover local changes?"),
            tr(
              "Există răspunsuri care nu au fost salvate pe server de acest dispozitiv.",
              "This device has answers that were not saved to the server.",
            ),
          )
        ) {
          progress.answers = local.answers;
          dirty = true;
        }
      }
    }
    render();
  } catch (e) {
    root.innerHTML = `<section class="card center"><h2>${tr("Conexiune întreruptă", "Connection interrupted")}</h2><p>${escape(e.message)}</p><button id="retry">${tr("Reîncearcă", "Retry")}</button></section>`;
    $("#retry").onclick = init;
  }
}
init();

function renderRubric() {
  const d = adminData,
    c = d.content;
  $("#admin-body").innerHTML =
    `<section class="card"><span class="eyebrow">${tr("BAREMUL PROFESOAREI", "TEACHER’S RUBRIC")}</span><h2>${tr("Un barem clar. O evaluare echitabilă.", "Clear criteria. Fair assessment.")}</h2><p class="muted">${tr("Completează răspunsurile corecte sau reperele pentru întrebările deschise și explică modul de acordare. AI va folosi exact acest barem, iar tu poți modifica și valida orice punctaj.", "Set correct answers or reference answers for open questions and explain how points are awarded. AI uses this rubric; you can edit and validate every score.")}</p><div class="notice">${tr("Modificarea baremului păstrează răspunsurile echipelor, dar șterge evaluările anterioare și anunțul câștigătorului. Echipele vor trebui reevaluate și validate din nou. La exercițiul 6, confirmă identificarea detaliului înainte de evaluarea AI.", "Changing the rubric preserves team answers but clears previous assessments and the winner announcement. Entries must be reassessed and validated again. Confirm the artwork identification in exercise 6 before AI assessment.")}</div>${d.rubricProposal ? `<button type="button" class="secondary" id="rubric-proposal">✦ ${tr("Încarcă propunerea: 90 + 10 din oficiu", "Load suggested rubric: 90 + 10 participation points")}</button><p class="help">${tr("Propunerea rămâne editabilă și nu se aplică până nu apeși Salvează. Baremul este orientativ, nu o cheie oficială a muzeului.", "The suggestion remains editable and applies only when saved. It is a draft, not an official museum answer key.")}</p>` : ""}<form id="rubric-form">${c.questions.map((q) => `<section class="score-card rubric-question"><div class="rubric-heading"><h3>${q.id}. ${escape(q[lang])}</h3><div class="field"><label for="rubric-points-${q.id}">${tr("Punctaj maxim", "Maximum points")}</label><input type="number" required min="0" max="100" step="0.01" data-rubric-points id="rubric-points-${q.id}" value="${q.points}"></div></div>${q.image ? `<img class="rubric-thumb" src="${escape(q.image)}" alt="${tr("Detaliul exercițiului", "Exercise detail")} ${q.id}">` : ""}<p class="help">${q.fields.map((f) => escape(f[lang])).join(" · ")}</p><div class="field"><label for="rubric-answer-${q.id}">${tr("Răspuns corect / răspunsuri acceptate / repere de interpretare", "Correct answer / accepted answers / interpretation guidance")}</label><textarea required maxlength="12000" id="rubric-answer-${q.id}">${escape(q.correctAnswer || "")}</textarea></div><div class="field"><label for="rubric-criteria-${q.id}">${tr("Mod de acordare a punctajului și punctaj parțial", "Scoring criteria and partial credit")}</label><textarea required maxlength="12000" id="rubric-criteria-${q.id}">${escape(q.rubric)}</textarea></div></section>`).join("")}<section class="score-card"><h3>${tr("Puncte din oficiu", "Participation points")}</h3><p class="help">${tr("Se adaugă automat o singură dată la totalul fiecărei participări evaluate. Nu sunt acordate de AI.", "Automatically added once to each assessed entry. These points are not awarded by AI.")}</p><label for="rubric-bonus">${tr("Număr de puncte din oficiu", "Number of participation points")}</label><input id="rubric-bonus" type="number" min="0" max="100" step="0.01" required value="${c.bonusPoints || 0}"></section><div class="review-bar rubric-footer"><div class="rubric-totals"><span>${tr("Întrebări", "Questions")}: <b id="rubric-subtotal"></b></span><span>${tr("Din oficiu", "Participation")}: <b id="rubric-bonus-total"></b></span><strong>${tr("TOTAL", "TOTAL")}: <span id="rubric-total"></span> / 100</strong></div><p id="rubric-validation" role="status" aria-live="polite"></p><button type="submit" id="save-rubric">${tr("Salvează baremul", "Save rubric")}</button></div></form></section>`;
  const update = () => {
    const values = $$("[data-rubric-points]").map((x) =>
        x.value === "" ? NaN : Number(x.value),
      ),
      b =
        $("#rubric-bonus").value === ""
          ? NaN
          : Number($("#rubric-bonus").value),
      subtotal = Math.round(values.reduce((n, v) => n + v, 0) * 100) / 100,
      total = Math.round((subtotal + b) * 100) / 100;
    const valid =
      values.every((v) => Number.isFinite(v) && v >= 0 && v <= 100) &&
      Number.isFinite(b) &&
      b >= 0 &&
      b <= 100 &&
      total === 100;
    $("#rubric-subtotal").textContent = Number.isFinite(subtotal)
      ? subtotal
      : "—";
    $("#rubric-bonus-total").textContent = Number.isFinite(b) ? b : "—";
    $("#rubric-total").textContent = Number.isFinite(total) ? total : "—";
    $("#rubric-validation").textContent = valid
      ? tr("✓ Total valid: 100 de puncte.", "✓ Valid total: 100 points.")
      : tr(
          "Totalul trebuie să fie exact 100 de puncte, inclusiv punctele din oficiu.",
          "The total must be exactly 100 points, including participation points.",
        );
    $("#rubric-validation").className = valid ? "help" : "error-text";
    $("#save-rubric").disabled = !valid;
  };
  $("#rubric-form").oninput = () => {
    rubricDirty = true;
    update();
  };
  update();
  $("#rubric-proposal")?.addEventListener("click", async () => {
    if (
      !(await confirm(
        tr("Încarci propunerea de barem?", "Load the suggested rubric?"),
        tr(
          "Modificările nesalvate vor fi înlocuite. Nimic nu se aplică până la salvare.",
          "Unsaved edits will be replaced. Nothing applies until you save.",
        ),
      ))
    )
      return;
    const p = d.rubricProposal;
    for (const q of p.questions) {
      $(`#rubric-points-${q.id}`).value = q.points;
      $(`#rubric-answer-${q.id}`).value = q.correctAnswer;
      $(`#rubric-criteria-${q.id}`).value = q.rubric;
    }
    $("#rubric-bonus").value = p.bonusPoints;
    rubricDirty = true;
    update();
  });
  $("#rubric-form").onsubmit = (e) => {
    e.preventDefault();
    busy($("#save-rubric"), async () => {
      const questions = c.questions.map((q) => ({
        id: q.id,
        points: Number($(`#rubric-points-${q.id}`).value),
        correctAnswer: $(`#rubric-answer-${q.id}`).value.trim(),
        rubric: $(`#rubric-criteria-${q.id}`).value.trim(),
      }));
      if (
        d.entries.some((e) => e.scores || e.validated) &&
        !(await confirm(
          tr(
            "Reevaluare după modificarea baremului",
            "Reassessment after rubric change",
          ),
          tr(
            "Evaluările existente vor fi șterse. Răspunsurile echipelor rămân păstrate. Continui?",
            "Existing assessments will be cleared. Team answers are preserved. Continue?",
          ),
        ))
      )
        return;
      await api("/api/admin/rubric", "PUT", {
        questions,
        bonusPoints: Number($("#rubric-bonus").value),
        revision: d.rubricRevision,
      });
      rubricDirty = false;
      await loadAdmin();
      toast(
        tr(
          "Barem salvat. Evaluările vor folosi noul punctaj.",
          "Rubric saved. Assessments will use the new scores.",
        ),
      );
    });
  };
}
