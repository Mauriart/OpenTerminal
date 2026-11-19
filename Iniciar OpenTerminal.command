#!/bin/bash
# Doble clic en macOS. La primera vez: clic derecho > Abrir.
here=$(CDPATH= cd -- "$(dirname "$0")" && pwd) || exit 1
cd "$here" || exit 1
exec /bin/bash "$here/iniciar-openterminal.sh"
