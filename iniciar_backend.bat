@echo off
chcp 65001 >nul
cls
echo ╔══════════════════════════════════════════════════════╗
echo ║     ZELADORIA URBANA INTELIGENTE — Backend Setup     ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Verificar Python
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERRO] Python não encontrado!
    echo Instale em: https://www.python.org/downloads/
    echo Marque "Add Python to PATH" durante a instalação.
    pause
    exit /b 1
)
echo [OK] Python encontrado.

REM Entrar na pasta backend
cd /d "%~dp0backend"

REM Criar .env se não existir
IF NOT EXIST ".env" (
    echo.
    echo [AVISO] Arquivo .env não encontrado. Criando a partir do exemplo...
    copy ".env.example" ".env" >nul
    echo [!] Edite o arquivo backend\.env com suas credenciais do Supabase antes de continuar!
    echo.
    notepad .env
    pause
)

REM Criar ambiente virtual se não existir
IF NOT EXIST "venv" (
    echo.
    echo [INFO] Criando ambiente virtual Python...
    python -m venv venv
    echo [OK] Ambiente virtual criado.
)

REM Ativar ambiente virtual
echo.
echo [INFO] Ativando ambiente virtual...
call venv\Scripts\activate.bat

REM Instalar dependências
echo.
echo [INFO] Instalando dependências (pode demorar na 1ª vez)...
pip install -r requirements.txt --quiet
IF ERRORLEVEL 1 (
    echo [ERRO] Falha na instalação das dependências.
    pause
    exit /b 1
)
echo [OK] Dependências instaladas.

REM Iniciar servidor
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  Servidor iniciando em: http://localhost:8000        ║
echo ║  Documentação API:  http://localhost:8000/docs       ║
echo ║  Pressione Ctrl+C para parar o servidor              ║
echo ╚══════════════════════════════════════════════════════╝
echo.

python main.py

pause
