#!/usr/bin/env bash
# Run on the Ubuntu 24.04 VM, not on your Mac or in Oracle Cloud Shell.
set -Eeuo pipefail
umask 077
SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR=/opt/prado
CHECK_ONLY=false
if [[ "${1:-}" == --check ]]; then CHECK_ONLY=true; shift; fi
DOMAIN="${1:-}"
if (( $# > 1 )); then echo 'Utilizare: bash deploy-oracle.sh [--check] [prado.domeniu.ro]' >&2; exit 1; fi
fail() { echo "EROARE: $*" >&2; exit 1; }
valid_domain() {
  local label
  [[ ${#1} -le 253 && "$1" == *.* && "$1" != *://* && "$1" != */* ]] || return 1
  [[ ! "$1" =~ ^[0-9.]+$ ]] || return 1
  local -a labels
  IFS=. read -r -a labels <<< "$1"
  [[ "$1" != .* && "$1" != *. && "$1" != *..* ]] || return 1
  for label in "${labels[@]}"; do
    [[ ${#label} -ge 1 && ${#label} -le 63 && "$label" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$ ]] || return 1
  done
}
[[ -f "$SOURCE_DIR/Dockerfile" && -f "$SOURCE_DIR/compose.oracle.yml" && -f "$SOURCE_DIR/deploy/Caddyfile" ]] || fail 'Rulează scriptul din pachetul complet al aplicației.'
if [[ "$CHECK_ONLY" == true ]]; then
  [[ -n "$DOMAIN" ]] && valid_domain "$DOMAIN" || fail 'Introdu un domeniu valid, fără https://, cale sau port.'
  printf 'Domeniu și pachet de surse valide pentru https://%s\n' "$DOMAIN"
  echo 'Plan: Ubuntu 24.04; Docker Compose; aplicație + Caddy; volum persistent; HTTPS.'
  echo 'Nu s-au instalat programe și nu s-au modificat fișiere, servicii sau volume.'
  exit 0
fi
if (( EUID != 0 )); then exec sudo -- bash "$SOURCE_DIR/deploy-oracle.sh" "$@"; fi
# Trusted operating-system metadata, never read application .env as shell code.
. /etc/os-release
[[ "${ID:-}" == ubuntu && "${VERSION_ID:-}" == 24.04 ]] || fail 'Acest script este pentru Ubuntu 24.04. Nu îl rula pe Mac, Oracle Linux sau în Cloud Shell.'
command -v systemctl >/dev/null || fail 'Este necesară o mașină Ubuntu cu systemd.'
exec 9>/run/lock/prado-deploy.lock
flock -n 9 || fail 'O altă instalare Prado rulează deja. Așteaptă finalizarea ei.'
if [[ -d "$INSTALL_DIR" && ! -f "$INSTALL_DIR/.managed-by-prado" ]]; then
  fail '/opt/prado există deja și nu este administrat de acest script. Nu s-a suprascris nimic.'
fi
if [[ -f "$INSTALL_DIR/.env" ]]; then
  EXISTING_DOMAIN="$(sed -n 's/^PRADO_DOMAIN=//p' "$INSTALL_DIR/.env" | head -n 1)"
  [[ -z "$DOMAIN" || "$DOMAIN" == "$EXISTING_DOMAIN" ]] || fail 'Există deja o instalare pentru alt domeniu. Configurația existentă a fost păstrată.'
  DOMAIN="$EXISTING_DOMAIN"
fi
if [[ -z "$DOMAIN" ]]; then read -r -p 'Subdomeniul aplicației (ex. prado.domeniu.ro, fără https://): ' DOMAIN; fi
valid_domain "$DOMAIN" || fail 'Domeniu invalid. Folosește un hostname fără https://, port, spații sau cale.'
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  read -r -s -p 'Parola privată a profesorului (minimum 12 caractere): ' ADMIN_PASSWORD; echo
  [[ ${#ADMIN_PASSWORD} -ge 12 && ${#ADMIN_PASSWORD} -le 200 ]] || fail 'Parola trebuie să aibă 12–200 caractere.'
  [[ "$ADMIN_PASSWORD" != Madridtoledo2026 ]] || fail 'Pentru site-ul public alege o parolă privată diferită de parola inițială cunoscută.'
  read -r -s -p 'Confirmă parola: ' CONFIRM_PASSWORD; echo
  [[ "$ADMIN_PASSWORD" == "$CONFIRM_PASSWORD" ]] || fail 'Parolele nu coincid.'
  read -r -s -p 'Cheia Gemini (Enter pentru evaluare manuală, fără AI): ' GEMINI_API_KEY; echo
fi
echo 'Instalez Docker și utilitarele din depozitele Ubuntu, cu verificarea normală a semnăturilor.'
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 ca-certificates curl rsync python3 iproute2
systemctl enable --now docker
# Help the selected 1 GB Always Free VM build the image without exhausting RAM.
MEM_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
SWAP_KB="$(awk '/SwapTotal/ {print $2}' /proc/meminfo)"
if (( MEM_KB < 1500000 && SWAP_KB == 0 )); then
  if [[ -e /swap-prado ]]; then
    fail '/swap-prado există, dar nu este activ. Verifică fișierul înainte de reluare; nu a fost suprascris.'
  fi
  FREE_KB="$(df -Pk / | awk 'NR==2 {print $4}')"
  (( FREE_KB > 2600000 )) || fail 'Nu există suficient spațiu liber pentru swap. Nu am creat fișierul.'
  echo 'Adaug 2 GB swap pentru mașina cu memorie redusă.'
  dd if=/dev/zero of=/swap-prado bs=1M count=2048 status=progress
  chmod 600 /swap-prado
  mkswap /swap-prado
  swapon /swap-prado
  grep -q '^/swap-prado[[:space:]]' /etc/fstab || printf '\n/swap-prado none swap sw 0 0\n' >> /etc/fstab
fi
# Keep unrelated websites and containers untouched.
for container in $(docker ps -q --filter volume=prado_data); do
  [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container")" == prado ]] || fail 'Volumul prado_data este folosit de o altă instalare activă. Nu am oprit-o și nu am modificat datele.'
done
if ! docker ps -a --filter label=com.docker.compose.project=prado --format '{{.ID}}' | grep -q .; then
  for port in 80 443; do
    if ss -H -ltn "sport = :$port" | grep -q .; then fail "Portul $port este folosit de alt serviciu. Nu l-am oprit; verifică serviciul înainte de instalare."; fi
  done
fi
install -d -m 700 "$INSTALL_DIR" "$INSTALL_DIR/backups"
touch "$INSTALL_DIR/.managed-by-prado"
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  printf '%s\0' "$DOMAIN" "$ADMIN_PASSWORD" "$GEMINI_API_KEY" | python3 "$SOURCE_DIR/deploy/write-env.py" > "$INSTALL_DIR/.env"
  chmod 600 "$INSTALL_DIR/.env"
fi
unset ADMIN_PASSWORD CONFIRM_PASSWORD GEMINI_API_KEY
if [[ "$SOURCE_DIR" != "$INSTALL_DIR/app" ]]; then
  install -d -m 700 "$INSTALL_DIR/app"
  rsync -a --delete --exclude=.git --exclude=.env --exclude=data --exclude=node_modules --exclude=test-results --exclude=playwright-report --exclude='*.log' "$SOURCE_DIR/" "$INSTALL_DIR/app/"
fi
export PRADO_ENV_FILE="$INSTALL_DIR/.env"
export PRADO_DATA_VOLUME=prado_data PRADO_CADDY_DATA_VOLUME=prado_caddy_data PRADO_CADDY_CONFIG_VOLUME=prado_caddy_config
COMPOSE=(docker compose --project-name prado --env-file "$INSTALL_DIR/.env" --file "$INSTALL_DIR/app/compose.oracle.yml")
# Validate silently: full 'compose config' would expose environment secrets.
"${COMPOSE[@]}" config --quiet
# Build before interrupting an existing deployment.
"${COMPOSE[@]}" build
if docker volume inspect prado_data >/dev/null 2>&1; then
  [[ "$(docker volume inspect --format '{{.Driver}}' prado_data)" == local ]] || fail 'Volumul folosește alt driver. Nu am încercat un backup nesuportat.'
  "${COMPOSE[@]}" stop app
  DATA_PATH="$(docker volume inspect --format '{{.Mountpoint}}' prado_data)"
  BACKUP="$INSTALL_DIR/backups/data-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
  tar -czf "$BACKUP" -C "$DATA_PATH" .
  echo "Backup privat creat: $BACKUP"
fi
"${COMPOSE[@]}" up --detach --wait --wait-timeout 180
# Verify through the public hostname: a running container alone is not readiness.
echo "Verific HTTPS la https://$DOMAIN/api/health ..."
READY=false
for attempt in $(seq 1 12); do
  if RESULT="$(curl --fail --silent --connect-timeout 5 --max-time 10 "https://$DOMAIN/api/health" 2>/dev/null)" && [[ "$RESULT" == '{"ok":true}' ]]; then READY=true; break; fi
  sleep 5
done
if [[ "$READY" != true ]]; then
  echo 'Containerele au pornit, dar HTTPS public NU a fost confirmat.' >&2
  echo "Verifică în DNS înregistrarea A pentru $DOMAIN către IP-ul public al VM-ului." >&2
  echo 'În Oracle, permite TCP 80 și 443 în Security List/NSG și folosește subnet public cu Internet Gateway.' >&2
  echo "Jurnale: sudo docker compose -p prado --env-file $INSTALL_DIR/.env -f $INSTALL_DIR/app/compose.oracle.yml logs --tail 60 caddy" >&2
  exit 1
fi
printf '\nAplicație verificată: https://%s\nProfesor: https://%s/admin\nUtilizator: profesor\n' "$DOMAIN" "$DOMAIN"
echo 'Folosește parola aleasă sau parola existentă dacă volumul conținea deja o bază de date.'
echo 'Pentru Gemini: Concurs & configurare → Google Gemini → Încarcă modele.'
echo 'Datele sunt în volumul prado_data. Nu șterge volumul la actualizări.'
