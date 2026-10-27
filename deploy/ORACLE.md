# Instalare asistată pe Oracle Cloud

Scriptul `deploy-oracle.sh` instalează aplicația pe o **instanță Ubuntu 24.04 deja creată**, folosind Docker Compose și Caddy. Configurează HTTPS automat, păstrează SQLite în volumul `prado_data`, adaugă 2 GB swap dacă VM-ul are sub 1,5 GB RAM și nu are swap și pornește serviciile automat după reboot.

Nu creează conturi Oracle, instanțe, reguli OCI sau înregistrări DNS. Nu solicită cheia SSH, nu activează servicii AI plătite și nu verifică eligibilitatea Always Free. Verifică în consola Oracle configurația și costul instanței înainte de creare.

## 1. Pregătește instanța și rețeaua

- Creează instanța cu **Ubuntu 24.04**, forma **VM.Standard.E2.1.Micro**, marcată **Always Free eligible**, subnet public și IPv4 public.
- Descarcă cheia SSH privată și așteaptă statutul **Running**.
- Notează IP-ul public.
- În Security List/NSG al subnetului/VNIC-ului, păstrează accesul SSH TCP 22 de la IP-ul tău și adaugă două reguli ingress stateless **debifat**: sursă `0.0.0.0/0`, protocol TCP, port destinație **80**, respectiv **443**. Source port range poate rămâne gol/All.
- VCN-ul trebuie să aibă Internet Gateway și rută `0.0.0.0/0` către acesta. Wizard-ul „VCN with Internet Connectivity” le pregătește.

Dacă ai un firewall propriu pe sistem, acesta trebuie să permită traficul web. Scriptul nu dezactivează firewall-ul și nu modifică regulile SSH. Docker publică numai Caddy pe 80/443; backend-ul nu are port public separat.

## 2. Configurează DNS

În contul unde administrezi domeniul, adaugă:

| Tip | Nume    | Valoare                   |
| --- | ------- | ------------------------- |
| A   | `prado` | IP-ul public al instanței |

Exemplu: `prado.domeniul-tau.ro`. Înlocuiește peste tot exemplul cu domeniul tău real, fără `https://` sau `/` în argumentul scriptului. Nu adăuga un AAAA decât dacă ai configurat și IPv6; o înregistrare AAAA greșită poate împiedica verificarea HTTPS.

## 3. Transferă codul de pe Mac

1. Descarcă ultima versiune GitHub: **Code → Download ZIP**. Păstrează `ArtQuiz-main.zip` în Downloads.
2. Redenumește cheia **privată** Oracle în `prado.key` și păstreaz-o în Downloads. Nu folosi fișierul `.pub` și nu trimite cheia în conversații.
3. În Terminal pe Mac, înlocuiește `IP_SERVER` cu IP-ul public real și rulează:

```bash
chmod 600 ~/Downloads/prado.key
scp -i ~/Downloads/prado.key ~/Downloads/ArtQuiz-main.zip ubuntu@IP_SERVER:~/ArtQuiz.zip
ssh -i ~/Downloads/prado.key ubuntu@IP_SERVER
```

## 4. Rulează instalarea pe server

Comenzile următoare se execută **în sesiunea SSH pe VM**, nu pe Mac și nu în Oracle Cloud Shell:

```bash
python3 -m zipfile -e ~/ArtQuiz.zip ~/prado-source
cd ~/prado-source/ArtQuiz-main
bash deploy-oracle.sh prado.domeniul-tau.ro
```

Scriptul cere:

- parola privată pentru contul `profesor`, minimum 12 caractere, și confirmarea ei;
- opțional, cheia Gemini. Poți apăsa Enter pentru evaluare manuală.

Caracterele parolei și cheii nu apar în timp ce tastezi. Nu pune parole sau chei în argumentele comenzii. Pentru publicare este necesară o parolă privată, diferită de parola inițială documentată.

Scriptul cere drepturi sudo, instalează pachetele din depozitele Ubuntu, copiază sursele în `/opt/prado/app`, păstrează configurația privată în `/opt/prado/.env` și construiește imaginea. Primul build poate dura câteva minute pe VM-ul cu 1 GB RAM. Nu întrerupe sesiunea în timpul instalării.

Abia după confirmarea `https://DOMENIU/api/health` scriptul afișează că aplicația a fost verificată. Dacă verificarea HTTPS eșuează, containerele pot rămâne pornite, dar publicarea nu este confirmată: verifică DNS, porturile Oracle 80/443 și mesajele Caddy.

## 5. Intră în aplicație

- Elevi: `https://prado.domeniul-tau.ro`
- Profesor: `https://prado.domeniul-tau.ro/admin`
- Utilizator: `profesor`; parola aleasă în script.
- Pentru Gemini: **Concurs & configurare → Google Gemini → Încarcă modele**, alege un model disponibil și verifică nivelul gratuit în AI Studio.

Această instalare nu transferă automat baza de date de pe Mac. O bază nouă se inițializează pe server. Dacă volumul `prado_data` conține deja o bază, aplicația păstrează parola și datele existente.

## Diagnostic și actualizări

Verificare locală a domeniului și pachetului, fără modificări de sistem:

```bash
bash deploy-oracle.sh --check prado.domeniul-tau.ro
```

Pe server, starea serviciilor și jurnalele Caddy:

```bash
sudo docker compose -p prado --env-file /opt/prado/.env -f /opt/prado/app/compose.oracle.yml ps
sudo docker compose -p prado --env-file /opt/prado/.env -f /opt/prado/app/compose.oracle.yml logs --tail 60 caddy
```

Actualizare: descarcă și transferă noul ZIP, extrage-l într-un folder nou, apoi rulează scriptul din acel folder cu același domeniu. Configurația existentă nu este suprascrisă. Imaginea se construiește înainte de oprirea aplicației existente. Înainte de înlocuire, scriptul oprește serviciul aplicației și salvează întregul volum într-un backup privat în `/opt/prado/backups`, inclusiv fișierele SQLite WAL/SHM. Verifică rezultatul actualizării; o eroare de pornire nu declanșează o restaurare automată a bazei.

Nu executa `docker compose down -v`, `docker volume prune` sau alte comenzi care șterg `prado_data`. Nu publica `.env` sau backupurile și nu trimite rezultatul complet al `docker compose config` — acesta poate conține secrete. Păstrează copii private ale backupurilor și în afara VM-ului.

Scriptul nu oprește alte site-uri pentru a ocupa porturile 80/443 și nu adoptă automat un volum folosit de altă instalare activă. Dacă întâlnește o astfel de situație, se oprește cu un mesaj explicit.

Validarea din mediul de dezvoltare este separată de rularea pe Oracle: crearea VM-ului, accesul SSH, apt pe Ubuntu, DNS-ul real și emiterea certificatului trebuie confirmate pe serverul tău.

Verificări efectuate în dezvoltare: sintaxa Bash și domeniile, configurația Docker Compose, păstrarea exactă a parolelor cu caractere speciale, validarea Caddy și un test real al containerului aplicației (healthcheck, autentificare, trimitere parțială, schimbare de parolă și persistență după recreare). Buildul în mediul de dezvoltare a folosit certificatul CA al proxyului platformei doar în etapa de instalare npm; verificarea TLS și integritatea pachetelor au rămas active. Configurarea Ubuntu pe VM și certificatul public nu sunt prezentate ca deja executate.
