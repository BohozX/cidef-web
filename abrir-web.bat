@echo off
REM ---------------------------------------------------------------
REM  CIDEF - abre el sitio en modo desarrollo.
REM  Doble clic en este archivo. Se abre el navegador solo.
REM  Para cerrar el servidor: Ctrl+C en esta ventana, o cerrarla.
REM ---------------------------------------------------------------

cd /d "%~dp0"

REM Node portable incluido en el proyecto (.tools). Si tienes Node
REM instalado en el sistema, esta linea igual funciona.
set "PATH=%~dp0.tools\node-v24.20.0-win-x64;%PATH%"

echo.
echo   CIDEF - iniciando servidor de desarrollo...
echo   La pagina se abrira en http://localhost:4321
echo.

REM Se espera un poco a que el servidor levante antes de abrir el navegador.
start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:4321"

npm run dev

pause
