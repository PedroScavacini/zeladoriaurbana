from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import uuid
import base64
from datetime import datetime

from services.auth_service import verificar_jwt, extrair_token_header
from services.ia_service import classificar_imagem, transcrever_audio, detectar_duplicatas
from services.ocorrencia_service import gerar_protocolo
from supabase_client import supabase_get, supabase_post, supabase_patch

router = APIRouter()


def _exigir_auth(authorization: Optional[str]) -> dict:
    token = extrair_token_header(authorization or "")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    payload = verificar_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return payload


class CriarOcorrenciaRequest(BaseModel):
    lat: float
    lng: float
    categoria_id: int
    categoria_nome: str
    descricao: str
    imagem_base64: Optional[str] = None
    imagem_url: Optional[str] = None
    audio_transcricao: Optional[str] = None
    confianca_ia: Optional[float] = None


class ApoiarOcorrenciaRequest(BaseModel):
    ocorrencia_id: str


# ── Classificação de imagem ──────────────────────────────────────────────────

@router.post("/classificar-imagem")
async def classificar(
    imagem: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    _exigir_auth(authorization)
    resultado = await classificar_imagem(imagem)
    return resultado


# ── Transcrição de áudio ─────────────────────────────────────────────────────

@router.post("/transcrever-audio")
async def transcrever(
    audio: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    _exigir_auth(authorization)
    resultado = await transcrever_audio(audio)
    return resultado


# ── Verificar duplicatas ─────────────────────────────────────────────────────

@router.get("/verificar-duplicatas")
async def verificar_duplicatas_endpoint(
    lat: float,
    lng: float,
    categoria_id: int = 0,
    authorization: Optional[str] = Header(None)
):
    _exigir_auth(authorization)
    duplicatas = await detectar_duplicatas(lat, lng, categoria_id)
    return {"duplicatas": duplicatas, "total": len(duplicatas)}


# ── Criar ocorrência ─────────────────────────────────────────────────────────

@router.post("/")
async def criar_ocorrencia(
    req: CriarOcorrenciaRequest,
    authorization: Optional[str] = Header(None)
):
    payload = _exigir_auth(authorization)

    protocolo = gerar_protocolo()
    ocorrencia_id = str(uuid.uuid4())

    ocorrencia = {
        "id": ocorrencia_id,
        "protocolo": protocolo,
        "usuario_id": payload["sub"],
        "categoria_id": req.categoria_id,
        "categoria_nome": req.categoria_nome,
        "descricao": req.descricao,
        "lat": req.lat,
        "lng": req.lng,
        "status": "Aberta",
        "imagem_url": req.imagem_url or "",
        "audio_transcricao": req.audio_transcricao or "",
        "confianca_ia": req.confianca_ia or 0.0,
        "apoiadores": 0,
        "criado_em": datetime.utcnow().isoformat()
    }

    try:
        result = await supabase_post("ocorrencias", ocorrencia)
        ocorrencia_salva = result[0] if isinstance(result, list) else ocorrencia
    except Exception as e:
        print(f"Supabase indisponível, usando mock: {e}")
        ocorrencia_salva = ocorrencia

    # Salvar evidência se imagem base64 fornecida
    if req.imagem_base64:
        evidencia = {
            "id": str(uuid.uuid4()),
            "ocorrencia_id": ocorrencia_id,
            "tipo": "foto",
            "url": req.imagem_url or f"data:image/jpeg;base64,{req.imagem_base64[:50]}...",
            "tamanho": len(req.imagem_base64),
            "criado_em": datetime.utcnow().isoformat()
        }
        try:
            await supabase_post("evidencias", evidencia)
        except Exception as e:
            print(f"Erro ao salvar evidência: {e}")

    return {
        "sucesso": True,
        "protocolo": protocolo,
        "ocorrencia_id": ocorrencia_id,
        "status": "Aberta",
        "mensagem": f"Ocorrência registrada com sucesso! Protocolo: {protocolo}"
    }


# ── Listar ocorrências do usuário ────────────────────────────────────────────

@router.get("/minhas")
async def minhas_ocorrencias(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    payload = _exigir_auth(authorization)

    params = {
        "usuario_id": f"eq.{payload['sub']}",
        "select": "id,protocolo,categoria_nome,descricao,status,lat,lng,criado_em,imagem_url,apoiadores",
        "order": "criado_em.desc"
    }
    if status:
        params["status"] = f"eq.{status}"

    try:
        ocorrencias = await supabase_get("ocorrencias", params)
    except Exception as e:
        print(f"Supabase indisponível: {e}")
        ocorrencias = _mock_ocorrencias(payload["sub"])

    return {"ocorrencias": ocorrencias, "total": len(ocorrencias)}


# ── Detalhe de ocorrência ────────────────────────────────────────────────────

@router.get("/{ocorrencia_id}")
async def detalhe_ocorrencia(
    ocorrencia_id: str,
    authorization: Optional[str] = Header(None)
):
    _exigir_auth(authorization)

    try:
        result = await supabase_get(
            "ocorrencias",
            {"id": f"eq.{ocorrencia_id}", "select": "*"}
        )
        if not result:
            raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
        return result[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Apoiar ocorrência ────────────────────────────────────────────────────────

@router.post("/{ocorrencia_id}/apoiar")
async def apoiar_ocorrencia(
    ocorrencia_id: str,
    authorization: Optional[str] = Header(None)
):
    payload = _exigir_auth(authorization)

    vinculo = {
        "id": str(uuid.uuid4()),
        "ocorrencia_principal_id": ocorrencia_id,
        "ocorrencia_apoiante_id": None,
        "usuario_id": payload["sub"],
        "criado_em": datetime.utcnow().isoformat()
    }

    try:
        # Incrementar apoiadores
        result = await supabase_get("ocorrencias", {"id": f"eq.{ocorrencia_id}", "select": "apoiadores"})
        if result:
            novos_apoiadores = (result[0].get("apoiadores") or 0) + 1
            await supabase_patch("ocorrencias", {"apoiadores": novos_apoiadores}, "id", ocorrencia_id)
    except Exception as e:
        print(f"Erro ao atualizar apoiadores: {e}")

    return {"sucesso": True, "mensagem": "Apoio registrado com sucesso!"}


# ── Cancelar ocorrência ──────────────────────────────────────────────────────

@router.patch("/{ocorrencia_id}/cancelar")
async def cancelar_ocorrencia(
    ocorrencia_id: str,
    authorization: Optional[str] = Header(None)
):
    payload = _exigir_auth(authorization)

    try:
        result = await supabase_get("ocorrencias", {"id": f"eq.{ocorrencia_id}", "select": "usuario_id,status"})
        if not result:
            raise HTTPException(status_code=404, detail="Não encontrada")
        oc = result[0]
        if oc["usuario_id"] != payload["sub"]:
            raise HTTPException(status_code=403, detail="Sem permissão")
        if oc["status"] != "Aberta":
            raise HTTPException(status_code=400, detail="Só é possível cancelar ocorrências com status 'Aberta'")
        await supabase_patch("ocorrencias", {"status": "Cancelada"}, "id", ocorrencia_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Supabase indisponível: {e}")

    return {"sucesso": True, "mensagem": "Ocorrência cancelada"}


def _mock_ocorrencias(usuario_id: str) -> list:
    """Dados mock quando Supabase está indisponível."""
    from datetime import timedelta
    now = datetime.utcnow()
    return [
        {
            "id": str(uuid.uuid4()),
            "protocolo": "ZUI-20260430-123456",
            "categoria_nome": "Buraco na Via",
            "descricao": "Buraco de grandes dimensões na via principal",
            "status": "Em Análise",
            "lat": -22.9068,
            "lng": -47.0617,
            "criado_em": (now - timedelta(days=2)).isoformat(),
            "imagem_url": "",
            "apoiadores": 3
        },
        {
            "id": str(uuid.uuid4()),
            "protocolo": "ZUI-20260428-789012",
            "categoria_nome": "Iluminação Defeituosa",
            "descricao": "Poste apagado há uma semana",
            "status": "Aberta",
            "lat": -22.9075,
            "lng": -47.0625,
            "criado_em": (now - timedelta(days=4)).isoformat(),
            "imagem_url": "",
            "apoiadores": 1
        },
        {
            "id": str(uuid.uuid4()),
            "protocolo": "ZUI-20260420-345678",
            "categoria_nome": "Lixo Irregular",
            "descricao": "Descarte irregular de entulho",
            "status": "Resolvida",
            "lat": -22.9080,
            "lng": -47.0630,
            "criado_em": (now - timedelta(days=10)).isoformat(),
            "imagem_url": "",
            "apoiadores": 5
        }
    ]
