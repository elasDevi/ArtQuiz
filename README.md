# Prado Art Challenge

Aplicație web mobile-first, RO/EN, pentru elevii care vizitează Prado. Node.js 24 + Express + SQLite, fără conturi de elevi și fără servicii externe obligatorii. Tema urmează automat setarea light/dark a dispozitivului; stilul se bazează pe captura Iter Artland furnizată.

## Pornire rapidă

```bash
npm ci --cache /tmp/prado-npm
cp .env.example .env
npm start
```

Serverul ascultă pe portul 3000. Pagina elevilor este `/`, iar panoul profesoarei `/admin`.

La prima pornire se creează automat contul profesoarei:

- **Utilizator:** `profesor`
- **Parolă inițială:** `Madridtoledo2026`

Nu este necesar un setup token. După autentificare, schimbă parola din **Concurs & configurare → Contul profesoarei → Schimbă parola**: introdu parola actuală, noua parolă (12–200 caractere) și confirmarea. Parola este stocată numai ca hash scrypt cu salt. Schimbarea ei deconectează celelalte sesiuni ale profesorului, păstrează sesiunea curentă și nu deconectează elevii.

**O instalare existentă își păstrează parola**; actualizarea nu o înlocuiește cu parola implicită. Modificările persistă după repornire. `ADMIN_PASSWORD` sau `ADMIN_PASSWORD_HASH` pot seta o parolă personalizată numai la inițializarea unei baze noi; nu suprascriu ulterior parola schimbată în aplicație. Fostul fișier `.setup-token`, dacă există într-o instalare veche, nu mai este folosit.

## Fluxul elevilor

1. Introdu un nume unic de echipă, descrierea cu membrii (preferabil prenume) și creează un cod unic (6–40 caractere, recomandat 10+ aleatorii). Pentru reluare selectează „Reia participarea” și introdu numele și codul, indiferent de majuscule; păstrați codul în echipă. Numele este unic după normalizarea majusculelor și spațiilor suplimentare. Numărul echipelor nu este fix. Codul este un secret de acces, nu un simplu număr public.
2. Completează cele 12 exerciții. Cele cinci detalii sunt imaginile originale extrase din PDF, fără regenerare. Textul întrebărilor este transcris și tradus; exercițiile cu subpuncte păstrează câmpuri distincte. Exercițiul 9 permite mai multe emoții.
3. Fiecare modificare se salvează imediat **numai pe telefon/dispozitiv**, în browser (localStorage), cu indicator „Salvat pe acest dispozitiv · netrimis”. Navigarea între exerciții nu trimite răspunsuri serverului. După înscriere și încărcarea inițială, fișierele publice sunt păstrate de service worker pentru reluarea ciornei și reîncărcarea paginii offline (HTTPS sau localhost). Ciorna nu se sincronizează cu alte dispozitive; păstrează același telefon și browser și nu șterge datele site-ului.
4. Verifică și apasă „Trimite”. Numai acum întregul set de răspunsuri este salvat pe server într-o operațiune atomică, împreună cu data trimiterii. Completarea tuturor câmpurilor nu este obligatorie: se pot trimite formulare parțiale sau fără răspunsuri. Înainte de trimitere se afișează numărul și lista exercițiilor incomplete, explicând că părțile fără răspuns primesc 0 puncte și punctele din oficiu se păstrează; echipa poate confirma sau reveni la formular. Este nevoie de internet pentru înscriere și trimitere, nu pentru completarea formularului deja încărcat. Trimiterea este unică pentru cod; răspunsurile devin nemodificabile. Dacă trimiterea nu este confirmată, ciorna rămâne pe dispozitiv pentru reîncercare; se elimină numai după confirmarea serverului.

## Fluxul profesoarei

- `/admin`: filtrează participările pe echipe, citește răspunsurile trimise și vede echipele înscrise. Răspunsurile în curs de completare rămân doar pe dispozitivele elevilor.
- Completează manual punctajele/justificările sau cere o propunere AI. Fiecare exercițiu are un maxim; totalul întrebărilor plus punctele din oficiu este exact 100. Propunerea pentru baze noi este 90 + 10. AI nu validează rezultate. Exercițiile complet necompletate primesc automat 0 puncte; pentru cele parțiale, AI aplică baremul numai părților completate, fără a inventa răspunsuri. Profesoara păstrează posibilitatea de a corecta evaluarea.
- Revizuiește punctajele, modifică-le și bifează validarea. Salvările concurente sunt detectate; nicio evaluare nu se suprascrie silențios.
- Închide concursul, validează toate participările trimise și desemnează câștigătorul. La egalitate alegerea este explicită dintre echipele cu punctaj maxim.
- Fiecare echipă nouă are o singură participare. Totalul include o singură dată punctele din oficiu și apare după validare. Ciornele sunt excluse. Pentru participările istorice care aveau același nume de grupă se păstrează media, până la validarea tuturor acestora. Schimbarea evaluării sau a stării concursului resetează anunțul câștigătorului.
- Exportă Excel (răspunsuri, punctaje, justificări, clasament) sau PDF. Descarcă QR PNG și distribuie linkul public al elevilor.
- Istoricul operațiunilor se păstrează în baza de date. Descrierea membrilor este vizibilă profesoarei și în exporturi, fără conturi sau emailuri de elevi. Folosiți doar prenume. Membrii și codurile nu sunt trimise către AI.

## Evaluarea AI

Setează **numai pe server**, în `.env` ignorat sau în managerul de secrete:

```
AI_API_KEY=<cheia ta>
AI_MODEL=gpt-4.1-mini
```

Destinație HTTPS: `api.openai.com`. Modelul poate fi schimbat cu unul compatibil cu Chat Completions și JSON object mode. Cheia nu este inclusă în JavaScript-ul clientului, răspunsuri API sau exporturi. Datele trimise sunt întrebările, baremul și răspunsurile; codurile de acces nu sunt transmise. Anunță participanții conform regulilor instituției înainte de folosirea AI. Poți utiliza exclusiv evaluarea manuală.

Baremul inițial este **orientativ**, deoarece PDF-ul conține întrebări, nu răspunsuri oficiale. Verifică-l cu profesoara înainte de concurs, inclusiv atribuirea „Celor șapte păcate capitale”, alternativele pentru statuia de la intrare și identificarea detaliului de la exercițiul 6. Interpretările și emoțiile nu au un singur răspuns corect. Răspunsurile sunt tratate ca date neîncrezătoare în prompt, iar rezultatul AI este verificat pe server ca structură, intervale și acoperire a întrebărilor. Aceste măsuri nu înlocuiesc verificarea umană.

Fără o cheie, butonul AI este dezactivat și evaluarea manuală funcționează. Apelul real către furnizor nu a fost validat în mediul de livrare: nu a fost furnizată o cheie. Nu există o simulare prezentată ca evaluare AI.

## Reutilizare / configurare

În **„Barem & răspunsuri corecte”**, profesoara are câte o secțiune pentru fiecare dintre cele 12 exerciții: punctaj maxim, răspuns corect sau repere de interpretare și criterii de acordare cu punctaj parțial. Răspunsurile și criteriile sunt precompletate cu o propunere editabilă. Identificarea detaliului de la exercițiul 6 necesită confirmarea profesoarei; nu este prezentată drept certitudine.

La final există câmpul **Puncte din oficiu** și totalul actualizat în timp real: întrebări + oficiu = **100**. Formularul și serverul resping alte totaluri, valori negative, valori cu peste două zecimale, răspunsuri sau criterii lipsă. Punctele din oficiu sunt adăugate automat de server, nu de AI, în evaluare, clasament și exporturi.

Baremul poate fi schimbat și după înscrieri. Salvarea păstrează răspunsurile echipelor, dar șterge evaluările anterioare, validările și desemnarea câștigătorului. Reevaluează și validează din nou. Conflictele de editare și rezultatele AI pornite cu un barem vechi sunt respinse.

În „Concurs & configurare” poți edita JSON-ul întrebărilor înainte de prima participare: titlu, muzeu, întrebări RO/EN, câmpuri și imagini. Pune imaginile noi în `public/images`, apoi folosește căi `/images/fisier.jpg`. Numele echipelor nu se configurează într-o listă; ele sunt înscrise liber.

Pentru o ediție sau un muzeu nou, oprește serverul și configurează un `DATA_DIR` nou. Păstrează baza veche drept arhivă. `content.js` este doar șablonul pentru baze noi.

### Actualizarea unei instalări locale existente

1. Oprește aplicația cu Ctrl+C în Terminal.
2. Copiază întregul director `data` și fișierul `.env` (dacă există) într-un loc privat de backup.
3. Descarcă noua versiune de pe GitHub și extrage-o într-un folder nou.
4. Copiază directorul `data` și `.env` din instalarea veche în noul folder. Nu publica aceste fișiere.
5. Pornește `node local-test.js` din noul folder. Lansatorul citește acum și `.env`, inclusiv cheia AI configurată local.
6. Migrarea adaugă câmpurile noi fără a șterge răspunsuri, parole sau evaluări. Pentru bazele existente punctajele se păstrează și oficiul este inițial 0; în ecranul Barem poți încărca propunerea **90 + 10** și o poți adapta înainte de salvare.

Ciornele salvate pe server de versiunile anterioare sunt păstrate pentru compatibilitate; noua versiune nu mai salvează răspunsuri intermediare pe server. Vechiul `PUT /api/progress` răspunde cu 410; `GET /api/progress` permite reluarea participării și citirea răspunsurilor istorice.

Nu suprascrie o bază existentă cu una goală. Înainte de modificarea baremului folosit, exportă rezultatele dacă vrei să păstrezi evaluările curente.

## Găzduire cu persistență

Un singur proces/replică Node.js 24 pe un VPS mic sau un container cu **volum persistent** este suficient. Nu folosi un filesystem efemer/serverless pentru SQLite și nu porni mai multe replici cu baze separate. Costul este cel al instanței mici + discul persistent; verifică tariful curent al furnizorului. Nu este necesar un abonament la o bază de date. Costurile AI sunt separate, numai la cereri explicite ale profesoarei.

- Dockerfile inclus; construiește cu `docker build -t prado .` și montează un volum la `/app/data`.
- Pune un reverse proxy HTTPS în față. Setează `NODE_ENV=production`, `TRUST_PROXY=1` **numai dacă există exact un proxy de încredere** și `PUBLIC_URL=https://domeniul-tau` pentru QR. Cookie-urile sunt Secure în producție; autentificarea nu va funcționa prin HTTP simplu în acest mod.
- Setează parola și cheia prin secretele platformei, nu în imagine sau Git. Include `SESSION_SECRET` opțional (32+ caractere); altfel este generat și păstrat în volumul de date.
- Volumul păstrează SQLite, hash-ul parolei, secretul sesiunilor și sesiunile. Port 3000; healthcheck `/api/health` verifică și accesul bazei de date.
- Backup: oprește aplicația și copiază **întreg directorul de date**, inclusiv fișierele WAL/SHM dacă există, într-o arhivă privată. Pentru backup fără oprire, folosește API-ul SQLite de backup. Protejează arhiva ca date de concurs. Testează restaurarea înainte de un eveniment.
- Nu expune directorul `data`: serverul servește numai `public`. Nu se livrează `.env` sau baza către browser. Nu utiliza coduri triviale și nu distribui codurile altor echipe. Limite de autentificare, cookie HttpOnly/SameSite, verificare Origin și CSRF sunt incluse.

## Verificare

```bash
npm test
npm run test:browser
npm audit --omit=dev
```

Testul contractului AI folosește un furnizor simulat numai în teste și verifică salvarea propunerilor nevalidate și respingerea punctajelor invalide; nu dovedește conectarea la serviciul real. Testele API folosesc o bază temporară și verifică fluxul complet, accesul neautorizat, CSRF, reluarea de pe altă sesiune, persistența după repornire, conflictele de versiune, blocarea duplicatelor, limitele punctajului, validarea, clasamentul, Excel/PDF și QR. Testele browser folosesc o bază separată și Chromium: verifică fluxul elev–profesoară, mobilul, limba, temele, editorul de barem, lipsa transmiterii răspunsurilor înainte de submit, recuperarea ciornei după reîncărcare offline, păstrarea ei după trimitere eșuată și încărcarea finală pe server și trimiterea formularelor incomplete după confirmare, inclusiv anularea fără transmiterea datelor. Pe acest mediu Chromium este `/usr/bin/chromium`; setează `CHROMIUM_PATH` dacă este în altă locație. Pentru repetarea testului browser folosește un director gol: `E2E_DATA_DIR=/tmp/prado-e2e-nou npm run test:browser`.

Nu este necesar un build de frontend: fișierele statice sunt livrate direct, iar Node execută backend-ul. Publicarea într-un serviciu de găzduire și testarea cu cheia AI reală rămân operațiuni separate de rularea și testarea locală.
