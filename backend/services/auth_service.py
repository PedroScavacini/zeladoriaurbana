import os
import jwt
import random
import hashlib
from datetime import datetime, timedelta
from typing import Optional

SECRET_KEY = os.getenv("JWT_SECRET", "zeladoria-urbana-secret-2026-dev")
ALGORITHM = "HS256"

# Storage em memória para tokens mock (em produção usar Redis/Supabase)
_tokens_otp: dict = {}
_sessoes: dict = {}


def gerar_token_otp(email: str) -> str:
    """Gera OTP de 6 dígitos e armazena com expiração."""
    token = str(random.randint(100000, 999999))
    expira = datetime.utcnow() + timedelta(minutes=10)
    _tokens_otp[email] = {
        "token": token,
        "expira": expira,
        "tentativas": 0
    }
    print(f"🔑 OTP para {email}: {token}")  # Em produção: enviar por e-mail
    return token


def validar_token_otp(email: str, token: str) -> bool:
    """Valida OTP com controle de tentativas."""
    if email not in _tokens_otp:
        return False
    dados = _tokens_otp[email]
    if dados["tentativas"] >= 3:
        return False
    if datetime.utcnow() > dados["expira"]:
        del _tokens_otp[email]
        return False
    dados["tentativas"] += 1
    if dados["token"] == token:
        del _tokens_otp[email]
        return True
    return False


def gerar_jwt(usuario_id: str, email: str, nome: str) -> dict:
    """Gera JWT com access + refresh token."""
    agora = datetime.utcnow()
    access_payload = {
        "sub": usuario_id,
        "email": email,
        "nome": nome,
        "iat": agora,
        "exp": agora + timedelta(hours=24),
        "tipo": "access"
    }
    refresh_payload = {
        "sub": usuario_id,
        "email": email,
        "iat": agora,
        "exp": agora + timedelta(days=30),
        "tipo": "refresh"
    }
    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expira_em": 86400
    }


def verificar_jwt(token: str) -> Optional[dict]:
    """Verifica e decodifica JWT."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def extrair_token_header(authorization: str) -> Optional[str]:
    """Extrai token do header Authorization: Bearer <token>."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1]
