from fastapi import APIRouter, Header
from typing import Optional
from supabase_client import supabase_get
import uuid
from datetime import datetime, timedelta
import random

router = APIRouter()

CATEGORIAS_MOCK = [
    "Buraco na Via", "Lixo Irregular", "Iluminação Defeituosa",
    "Calçada Danificada", "Árvore de Risco", "Esgoto a Céu Aberto",
    "Pichação/Vandalismo", "Sinalização Danificada"
]
STATUS_LIST = ["Aberta", "Em Análise", "Em Andamento", "Resolvida"]
ICONES = ["🕳️", "🗑️", "💡", "🚶", "🌳", "💧", "🎨", "🚦"]

# Centro de Nova Odessa, SP
LAT_CENTER = -22.7833
LNG_CENTER = -47.2917


@router.get("/ocorrencias")
async def ocorrencias_mapa(
    categoria: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 200
):
    """Retorna ocorrências para exibir no mapa."""
    params = {
        "select": "id,protocolo,categoria_nome,categoria_icone,descricao,status,lat,lng,criado_em,imagem_url,apoiadores",
        "limit": str(limit),
        "order": "criado_em.desc"
    }
    if categoria:
        params["categoria_nome"] = f"eq.{categoria}"
    if status:
        params["status"] = f"eq.{status}"

    try:
        ocorrencias = await supabase_get("ocorrencias", params)
        if not ocorrencias:
            ocorrencias = _mock_ocorrencias_mapa(20)
    except Exception:
        ocorrencias = _mock_ocorrencias_mapa(20)

    return {"ocorrencias": ocorrencias, "total": len(ocorrencias)}


def _mock_ocorrencias_mapa(n: int) -> list:
    now = datetime.utcnow()
    ocs = []
    for i in range(n):
        idx = i % len(CATEGORIAS_MOCK)
        dias = random.randint(0, 30)
        ocs.append({
            "id": str(uuid.uuid4()),
            "protocolo": f"ZUI-2026{random.randint(100,430):04d}-{random.randint(100000,999999)}",
            "categoria_nome": CATEGORIAS_MOCK[idx],
            "categoria_icone": ICONES[idx],
            "descricao": f"Ocorrência de {CATEGORIAS_MOCK[idx].lower()} registrada por cidadão",
            "status": random.choice(STATUS_LIST),
            "lat": LAT_CENTER + random.uniform(-0.02, 0.02),
            "lng": LNG_CENTER + random.uniform(-0.02, 0.02),
            "criado_em": (now - timedelta(days=dias)).isoformat(),
            "imagem_url": "",
            "apoiadores": random.randint(0, 12)
        })
    return ocs
