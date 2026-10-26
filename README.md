# Prado Art Challenge

Aplicație web mobile-first, RO/EN, pentru elevii care vizitează Prado. Node.js 24 + Express + SQLite, fără conturi de elevi și fără servicii externe obligatorii. Tema urmează automat setarea light/dark a dispozitivului; stilul se bazează pe captura Iter Artland furnizată.

## Pornire rapidă

```bash
npm ci --cache /tmp/prado-npm
cp .env.example .env
npm start
```

Serverul ascultă pe portul 3000. Pagina elevilor este `/`, iar panoul profesoarei `/admin`.

La prima pornire, dacă nu există `ADMIN_PASSWORD`, serverul creează `data/.setup-token` (fișier privat, ignorat de Git). Citește-l **local pe server** și introdu tokenul în formularul de configurare din `/admin`, împreună cu o parolă de minimum 12 caractere. Nu trimite tokenul în conversații sau jurnale publice. Alternativ, configurează `ADMIN_PASSWORD` prin secretul platformei înainte de pornire. Parola este stocată numai ca hash scrypt cu salt. Nu există o parolă implicită. O valoare `ADMIN_PASSWORD` nouă configurează/resetază parola la repornire.

## Fluxul elevilor

1. Selectează grupa și creează un cod unic (6–40 caractere, recomandat 10+ aleatorii). Același cod, indiferent de majuscule, reia aceeași participare; păstrați-l în echipă. Codul este un secret de acces, nu un simplu număr public.
2. Completează cele 12 exerciții. Cele cinci detalii sunt imaginile originale extrase din PDF, fără regenerare. Textul întrebărilor este transcris și tradus; exercițiile cu subpuncte păstrează câmpuri distincte. Exercițiul 9 permite mai multe emoții.
3. Modificările sunt salvate automat pe server, cu indicator de stare. O copie locală permite recuperarea modificărilor nesalvate; aplicația nu promite funcționare offline completă.
4. Verifică și trimite. Toate câmpurile sunt obligatorii. Trimiterea este atomică și unică pentru cod; răspunsurile devin nemodificabile.

## Fluxul profesoarei

- `/admin`: filtrează participările pe grupe, citește răspunsuri și ciorne.
- Completează manual punctajele/justificările sau cere o propunere AI. Fiecare exercițiu are un maxim; totalul este 100. AI nu validează rezultate.
- Revizuiește punctajele, modifică-le și bifează validarea. Salvările concurente sunt detectate; nicio evaluare nu se suprascrie silențios.
- Închide concursul, validează toate participările trimise și desemnează câștigătorul. La egalitate alegerea este explicită dintre grupele cu punctaj maxim.
- Clasamentul folosește **media participărilor trimise ale fiecărei grupe**. O singură participare pe grupă este recomandată dacă se lucrează exclusiv în echipă. Ciornele sunt excluse, iar o grupă nu primește un total publicabil până când toate participările ei sunt validate. Schimbarea evaluării sau a stării concursului resetează anunțul câștigătorului.
- Exportă Excel (răspunsuri, punctaje, justificări, clasament) sau PDF. Descarcă QR PNG și distribuie linkul public al elevilor.
- Istoricul operațiunilor se păstrează în baza de date. Nu sunt colectate nume sau emailuri de elevi.

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

În „Concurs & configurare” editează JSON-ul **înainte de prima participare**: titlu, muzeu, grupe, întrebări RO/EN, câmpuri, imagini, punctaje și barem. Totalul trebuie să fie exact 100; ID-urile și câmpurile trebuie să fie unice. Pune imaginile noi în `public/images`, apoi folosește căi `/images/fisier.jpg`. Nu folosi informații de răspuns în numele imaginilor destinate elevilor.

Pentru o ediție sau un muzeu nou, oprește serverul și configurează un `DATA_DIR` nou. Pornește, configurează accesul și importă în editor configurația JSON modificată. Nu șterge baza anterioară; aceasta este arhiva rezultatelor. Configurația este blocată după prima participare pentru a nu schimba întrebările în timpul evaluării. `content.js` este doar șablonul pentru baze noi, nu suprascrie configurația unei baze existente.

## Găzduire cu persistență

Un singur proces/replică Node.js 24 pe un VPS mic sau un container cu **volum persistent** este suficient. Nu folosi un filesystem efemer/serverless pentru SQLite și nu porni mai multe replici cu baze separate. Costul este cel al instanței mici + discul persistent; verifică tariful curent al furnizorului. Nu este necesar un abonament la o bază de date. Costurile AI sunt separate, numai la cereri explicite ale profesoarei.

- Dockerfile inclus; construiește cu `docker build -t prado .` și montează un volum la `/app/data`.
- Pune un reverse proxy HTTPS în față. Setează `NODE_ENV=production`, `TRUST_PROXY=1` **numai dacă există exact un proxy de încredere** și `PUBLIC_URL=https://domeniul-tau` pentru QR. Cookie-urile sunt Secure în producție; autentificarea nu va funcționa prin HTTP simplu în acest mod.
- Setează parola și cheia prin secretele platformei, nu în imagine sau Git. Include `SESSION_SECRET` opțional (32+ caractere); altfel este generat și păstrat în volumul de date.
- Volumul păstrează SQLite, hash-ul parolei, secretul sesiunilor și sesiunile. Port 3000; healthcheck `/api/health` verifică și accesul bazei de date.
- Backup: oprește aplicația și copiază **întreg directorul de date**, inclusiv fișierele WAL/SHM dacă există, într-o arhivă privată. Pentru backup fără oprire, folosește API-ul SQLite de backup. Protejează arhiva ca date de concurs. Testează restaurarea înainte de un eveniment.
- Nu expune directorul `data`: serverul servește numai `public`. Nu se livrează `.env` sau baza către browser. Nu utiliza coduri triviale și nu distribui codurile altor grupe. Limite de autentificare, cookie HttpOnly/SameSite, verificare Origin și CSRF sunt incluse.

## Verificare

```bash
npm test
npm run test:browser
npm audit --omit=dev
```

Testul contractului AI folosește un furnizor simulat numai în teste și verifică salvarea propunerilor nevalidate și respingerea punctajelor invalide; nu dovedește conectarea la serviciul real. Testele API folosesc o bază temporară și verifică fluxul complet, accesul neautorizat, CSRF, reluarea de pe altă sesiune, persistența după repornire, conflictele de versiune, blocarea duplicatelor, limitele punctajului, validarea, clasamentul, Excel/PDF și QR. Testul browser folosește o bază separată, Chromium și verifică fluxul elev–profesoară, mobilul, limba și schimbarea automată a temei. Pe acest mediu Chromium este `/usr/bin/chromium`; setează `CHROMIUM_PATH` dacă este în altă locație. Pentru repetarea testului browser folosește un director gol: `E2E_DATA_DIR=/tmp/prado-e2e-nou npm run test:browser`.

Nu este necesar un build de frontend: fișierele statice sunt livrate direct, iar Node execută backend-ul. Publicarea într-un serviciu de găzduire și testarea cu cheia AI reală rămân operațiuni separate de rularea și testarea locală.
