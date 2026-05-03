from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from services.auth_service import (
    gerar_token_otp, validar_token_otp, gerar_jwt, verificar_jwt, extrair_token_header
)
from supabase_client import supabase_get, supabase_post, supabase_patch
from typing import Optional
import uuid

router = APIRouter()


class SolicitarTokenRequest(BaseModel):
    email: str
    nome: Optional[str] = None


class ValidarTokenRequest(BaseModel):
    email: str
    token: str


class AtualizarNomeRequest(BaseModel):
    nome: str


@router.post("/solicitar-token")
async def solicitar_token(req: SolicitarTokenRequest):
    """Envia token OTP por e-mail (mock: exibe no log)."""
    email = req.email.lower().strip()

    # Verificar se usuário existe no Supabase
    try:
        usuarios = await supabase_get("usuarios", {"email": f"eq.{email}", "select": "id,nome,email"})
    except Exception:
        usuarios = []

    if not usuarios:
        # Criar novo usuário
        nome = req.nome or email.split("@")[0].replace(".", " ").title()
        novo_usuario = {
            "id": str(uuid.uuid4()),
            "nome": nome,
            "email": email,
            "ativo": True
        }
        try:
            await supabase_post("usuarios", novo_usuario)
        except Exception as e:
            print(f"Erro ao criar usuário no Supabase: {e}")

    otp = gerar_token_otp(email)

    return {
        "mensagem": f"Token enviado para {email}",
        "instrucao": "Verifique o console do backend para o token OTP (modo desenvolvimento)",
        "token_dev": otp  # REMOVER EM PRODUÇÃO
    }


@router.post("/validar-token")
async def validar_token(req: ValidarTokenRequest):
    """Valida OTP e retorna JWT de sessão."""
    email = req.email.lower().strip()

    if not validar_token_otp(email, req.token):
        raise HTTPException(status_code=401, detail="Token inválido, expirado ou tentativas esgotadas")

    # Buscar usuário
    try:
        usuarios = await supabase_get("usuarios", {"email": f"eq.{email}", "select": "id,nome,email"})
        usuario = usuarios[0] if usuarios else None
    except Exception:
        usuario = None

    if not usuario:
        usuario = {"id": str(uuid.uuid4()), "nome": email.split("@")[0], "email": email}

    tokens = gerar_jwt(usuario["id"], usuario["email"], usuario["nome"])

    return {
        "usuario": {
            "id": usuario["id"],
            "nome": usuario["nome"],
            "email": usuario["email"]
        },
        **tokens
    }


@router.get("/me")
async def me(authorization: Optional[str] = Header(None)):
    """Retorna dados do usuário autenticado."""
    token = extrair_token_header(authorization or "")
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")

    payload = verificar_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    try:
        usuarios = await supabase_get(
            "usuarios",
            {"id": f"eq.{payload['sub']}", "select": "id,nome,email,criado_em"}
        )
        usuario = usuarios[0] if usuarios else None
    except Exception:
        usuario = None

    return usuario or {
        "id": payload["sub"],
        "nome": payload["nome"],
        "email": payload["email"]
    }


@router.patch("/me")
async def atualizar_nome(req: AtualizarNomeRequest, authorization: Optional[str] = Header(None)):
    """Atualiza nome do usuário."""
    token = extrair_token_header(authorization or "")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    payload = verificar_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")

    try:
        await supabase_patch("usuarios", {"nome": req.nome}, "id", payload["sub"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"mensagem": "Nome atualizado com sucesso"}
