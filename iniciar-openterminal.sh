#!/bin/bash
# Arranque con doble clic para macOS y Linux. Windows usa Iniciar OpenTerminal.bat.
# Bash 3.2 (el de macOS) a propósito: sin funciones de bash 4.

APP_URL="http://127.0.0.1:3000/"
BROWSER_URL="http://localhost:3000"

pause() {
  if [ -t 0 ]; then
    read -r -p "Pulsa Enter para cerrar... " _ || true
  fi
}

die() {
  echo ""
  echo "$1"
  echo ""
  pause
  exit 1
}

script_dir() {
  CDPATH= cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

prepare_path() {
  # Doble clic no carga el PATH de la terminal. Sumar sitios habituales sin
  # borrar el PATH que ya funciona (ahí está Python del sistema).
  PATH="$PATH:/usr/local/bin:/usr/bin:/bin"
  if [ -d /opt/homebrew/bin ]; then PATH="/opt/homebrew/bin:$PATH"; fi
  if [ -d "$HOME/.nvm/versions/node" ]; then
    local d
    for d in "$HOME/.nvm/versions/node"/v24.*/bin "$HOME/.nvm/versions/node"/v22.*/bin; do
      if [ -x "$d/node" ]; then
        PATH="$d:$PATH"
        break
      fi
    done
  fi
  export PATH
}

cd_repo() {
  local dir
  dir=$(script_dir) || die "No pude entrar a la carpeta de OpenTerminal."
  cd "$dir" || die "No pude entrar a la carpeta de OpenTerminal."
  if [ ! -f package.json ]; then
    die "No encuentro package.json. Deja este archivo dentro de la carpeta de OpenTerminal."
  fi
}

need_node() {
  local major=""
  if command -v node >/dev/null 2>&1; then
    major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || true)
  fi
  if [ "$major" != "22" ] && [ "$major" != "24" ]; then
    die "Hace falta Node.js 22 o 24 (la versión LTS). No está instalado, o es otra versión. Descárgalo aquí: https://nodejs.org/es/download y vuelve a abrir este archivo."
  fi
}

python_cmd() {
  local cmd
  for cmd in python3 python; do
    if command -v "$cmd" >/dev/null 2>&1 && "$cmd" -c 'import sys; raise SystemExit(0 if sys.version_info[0]==3 else 1)' >/dev/null 2>&1; then
      command -v "$cmd"
      return 0
    fi
  done
  return 1
}

need_python() {
  local cmd
  cmd=$(python_cmd) || die "Hace falta Python 3. No lo encuentro en este equipo. Descárgalo aquí: https://www.python.org/downloads/ y vuelve a abrir este archivo. En Windows, durante la instalación, marca «Add python.exe to PATH»."
  export PYTHON="$cmd"
}

valid_sec() {
  case "$1" in
    *" "*"@"*|*"@"*" "*) return 0 ;;
    *) return 1 ;;
  esac
}

read_sec_from() {
  local f="$1" line val
  [ -f "$f" ] || return 1
  line=$(sed '1s/^\xEF\xBB\xBF//' "$f" | grep -E '^[[:space:]]*SEC_USER_AGENT=' | tail -n 1 || true)
  [ -n "$line" ] || return 1
  val=${line#*=}
  val=${val#"${val%%[![:space:]]*}"}
  val=${val%"${val##*[![:space:]]}"}
  case "$val" in
    \"*\") val=${val#\"}; val=${val%\"} ;;
    \'*\') val=${val#\'}; val=${val%\'} ;;
  esac
  [ -n "$val" ] || return 1
  SEC_USER_AGENT=$val
}

write_sec_file() {
  local escaped=$1
  escaped=${escaped//\\/\\\\}
  escaped=${escaped//\"/\\\"}
  printf 'SEC_USER_AGENT="%s"\n' "$escaped" > .openterminal.local
}

ensure_sec() {
  if [ -n "${SEC_USER_AGENT:-}" ]; then
    export SEC_USER_AGENT
    return 0
  fi
  local f
  for f in .openterminal.local .env.local .env; do
    if read_sec_from "$f"; then
      export SEC_USER_AGENT
      return 0
    fi
  done
  local tries=0 val
  while [ "$tries" -lt 3 ]; do
    echo "Tu nombre y correo para la SEC"
    echo "Por ejemplo: María López maria@example.com"
    if [ -t 0 ]; then
      read -r val || true
    else
      read -r val || true
    fi
    if valid_sec "$val"; then
      write_sec_file "$val"
      SEC_USER_AGENT=$val
      export SEC_USER_AGENT
      echo "Listo. Lo guardé en .openterminal.local (solo en este equipo)."
      return 0
    fi
    echo "Escribe tu nombre y un correo, separados por un espacio."
    tries=$((tries + 1))
  done
  die "No guardé el contacto de la SEC. Vuelve a abrir este archivo para intentarlo otra vez."
}

health_ok() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS -o /dev/null --max-time 2 "$APP_URL" 2>/dev/null
    return $?
  fi
  python3 -c 'import urllib.request,sys
try:
    urllib.request.urlopen("http://127.0.0.1:3000/", timeout=2)
except Exception:
    sys.exit(1)' >/dev/null 2>&1
}

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$BROWSER_URL" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    (xdg-open "$BROWSER_URL" >/dev/null 2>&1 || true) &
  else
    echo "Abre el navegador en $BROWSER_URL"
  fi
}

need_install() {
  if [ ! -d node_modules ]; then
    return 0
  fi
  if [ -f package-lock.json ] && ! cmp -s package-lock.json node_modules/.package-lock.json; then
    return 0
  fi
  return 1
}

ensure_install() {
  if need_install; then
    echo "Instalando dependencias (solo esta vez, o porque cambió package-lock.json)..."
    npm install || die "npm install falló. Revisa el mensaje de arriba."
    if [ -f package-lock.json ]; then
      cp package-lock.json node_modules/.package-lock.json
    fi
  fi
}

already_running() {
  open_browser
  echo "OpenTerminal ya está abierto. Abrí el navegador en $BROWSER_URL."
  echo "Puedes cerrar esta ventana: la otra sigue en marcha."
  pause
  exit 0
}

start_app() {
  echo "Cierra esta ventana para apagar OpenTerminal"
  (
    i=0
    while [ "$i" -lt 90 ]; do
      if health_ok; then
        open_browser
        exit 0
      fi
      sleep 1
      i=$((i + 1))
    done
    echo "No pude abrir $BROWSER_URL. Revisa los mensajes de arriba."
  ) &
  waiter=$!
  npm run dev
  status=$?
  kill "$waiter" >/dev/null 2>&1 || true
  wait "$waiter" 2>/dev/null || true
  if [ "$status" -ne 0 ] && [ "$status" -ne 130 ] && [ "$status" -ne 143 ]; then
    echo ""
    echo "OpenTerminal se detuvo (código $status)."
    echo "Si el puerto ya estaba ocupado, cierra la otra ventana de OpenTerminal y vuelve a intentar."
    pause
  fi
  exit "$status"
}

main() {
  cd_repo
  prepare_path
  need_node
  need_python
  if health_ok; then
    already_running
  fi
  ensure_sec
  ensure_install
  start_app
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
