@echo off
chcp 65001 >nul
cls
echo ╔══════════════════════════════════════════════════════╗
echo ║     ZELADORIA URBANA INTELIGENTE — Frontend          ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Verificar Python (para servidor HTTP simples)
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [AVISO] Python não encontrado. Abrindo o HTML diretamente no navegador...
    start "" "%~dp0frontend\index.html"
    echo.
    echo [!] ATENÇÃO: Algumas funcionalidades (câmera, geolocalização) requerem
    echo     servidor HTTP. Instale Python para usar o servidor embutido.
    pause
    exit /b 0
)

cd /d "%~dp0frontend"

echo [INFO] Iniciando servidor HTTP na porta 5500...
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  Frontend disponível em: http://localhost:5500       ║
echo ║  (Abra este endereço no seu navegador)               ║
echo ║  Pressione Ctrl+C para parar                         ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Aguardar 1 segundo e abrir navegador automaticamente
ping -n 2 127.0.0.1 >nul
start "" http://localhost:5500

python -m http.server 5500

pause
