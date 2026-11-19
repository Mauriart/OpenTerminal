@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title OpenTerminal

where node >nul 2>&1
if errorlevel 1 goto no_node
for /f "delims=" %%V in ('node -p "process.versions.node"') do set "NODE_VER=%%V"
for /f "tokens=1 delims=." %%M in ("%NODE_VER%") do set "NODE_MAJOR=%%M"
if "%NODE_MAJOR%"=="22" goto have_node
if "%NODE_MAJOR%"=="24" goto have_node
goto no_node

:have_node
set "PYTHON_CMD="
where python3 >nul 2>&1 && python3 -c "import sys; raise SystemExit(0 if sys.version_info[0]==3 else 1)" >nul 2>&1 && set "PYTHON_CMD=python3"
if not defined PYTHON_CMD (
  where python >nul 2>&1 && python -c "import sys; raise SystemExit(0 if sys.version_info[0]==3 else 1)" >nul 2>&1 && set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD goto no_python
set "PYTHON=%PYTHON_CMD%"

curl.exe -fsS -o NUL --max-time 2 http://127.0.0.1:3000/
if not errorlevel 1 goto already

if defined SEC_USER_AGENT goto have_sec
call :load_sec ".openterminal.local"
if defined SEC_USER_AGENT goto have_sec
call :load_sec ".env.local"
if defined SEC_USER_AGENT goto have_sec
call :load_sec ".env"
if defined SEC_USER_AGENT goto have_sec

set "SEC_TRIES=0"
:ask_sec
echo Tu nombre y correo para la SEC
echo Por ejemplo: Maria Lopez maria@example.com
set /p SEC_USER_AGENT=^> 
echo %SEC_USER_AGENT% | find "@" >nul
if errorlevel 1 goto bad_sec
echo %SEC_USER_AGENT% | find " " >nul
if errorlevel 1 goto bad_sec
powershell -NoProfile -Command "$v = $env:SEC_USER_AGENT; $out = 'SEC_USER_AGENT=\"' + $v.Replace('\','\\').Replace([char]34,'\"') + '\"'; $utf8 = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText((Join-Path (Get-Location) '.openterminal.local'), $out + [char]10, $utf8)"
if errorlevel 1 goto sec_write_failed
echo Listo. Lo guarde en .openterminal.local ^(solo en este equipo^).
goto have_sec

:bad_sec
echo Escribe tu nombre y un correo, separados por un espacio.
set /a SEC_TRIES+=1
if %SEC_TRIES% GEQ 3 goto sec_giveup
goto ask_sec

:have_sec
set "NEED_INSTALL=0"
if not exist "node_modules\" set "NEED_INSTALL=1"
if exist "package-lock.json" (
  if not exist "node_modules\.package-lock.json" set "NEED_INSTALL=1"
)
if exist "package-lock.json" if exist "node_modules\.package-lock.json" (
  fc /b "package-lock.json" "node_modules\.package-lock.json" >nul
  if errorlevel 1 set "NEED_INSTALL=1"
)
if "%NEED_INSTALL%"=="0" goto launch
echo Instalando dependencias ^(solo esta vez, o porque cambio package-lock.json^)...
call npm install
if errorlevel 1 goto install_failed
if exist "package-lock.json" copy /y "package-lock.json" "node_modules\.package-lock.json" >nul

:launch
echo Cierra esta ventana para apagar OpenTerminal
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($i=0; $i -lt 90; $i++) { try { $r = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000/' -TimeoutSec 2; if ($r.StatusCode -ge 200) { Start-Process 'http://localhost:3000'; exit 0 } } catch { Start-Sleep -Seconds 1 } }"
call npm run dev
echo.
echo OpenTerminal se detuvo.
echo Si el puerto ya estaba ocupado, cierra la otra ventana de OpenTerminal y vuelve a intentar.
pause
exit /b %ERRORLEVEL%

:already
start "" "http://localhost:3000"
echo OpenTerminal ya esta abierto. Abri el navegador en http://localhost:3000.
echo Puedes cerrar esta ventana: la otra sigue en marcha.
pause
exit /b 0

:load_sec
if not exist "%~1" exit /b 1
set "SEC_USER_AGENT="
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "$p = '%~1'; if (-not (Test-Path -LiteralPath $p)) { exit 2 }; $l = Get-Content -LiteralPath $p | Where-Object { $_ -match '^\s*SEC_USER_AGENT=' } | Select-Object -Last 1; if (-not $l) { exit 2 }; $v = $l.Substring($l.IndexOf('=')+1).Trim(); if (($v.StartsWith([char]34) -and $v.EndsWith([char]34)) -or ($v.StartsWith([char]39) -and $v.EndsWith([char]39))) { $v = $v.Substring(1, $v.Length-2) }; [Console]::Out.Write($v)"`) do set "SEC_USER_AGENT=%%L"
if not defined SEC_USER_AGENT exit /b 1
exit /b 0

:no_node
echo.
echo Hace falta Node.js 22 o 24 ^(la version LTS^). No esta instalado, o es otra version.
echo Descargalo aqui: https://nodejs.org/es/download y vuelve a abrir este archivo.
echo.
pause
exit /b 1

:no_python
echo.
echo Hace falta Python 3. No lo encuentro en este equipo.
echo Descargalo aqui: https://www.python.org/downloads/ y vuelve a abrir este archivo.
echo Durante la instalacion, marca «Add python.exe to PATH».
echo.
pause
exit /b 1

:install_failed
echo.
echo npm install fallo. Revisa el mensaje de arriba.
echo.
pause
exit /b 1

:sec_write_failed
echo.
echo No pude guardar .openterminal.local.
echo.
pause
exit /b 1

:sec_giveup
echo.
echo No guarde el contacto de la SEC. Vuelve a abrir este archivo para intentarlo otra vez.
echo.
pause
exit /b 1
