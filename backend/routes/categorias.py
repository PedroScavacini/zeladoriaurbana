from fastapi import APIRouter
from supabase_client import supabase_get

router = APIRouter()

CATEGORIAS_DEFAULT = [
    {"id": 1, "nome": "Buraco na Via", "icone": "🕳️", "orgao_responsavel": "Departamento de Obras"},
    {"id": 2, "nome": "Lixo Irregular", "icone": "🗑️", "orgao_responsavel": "Secretaria de Limpeza"},
    {"id": 3, "nome": "Iluminação Defeituosa", "icone": "💡", "orgao_responsavel": "CPFL / ENEL"},
    {"id": 4, "nome": "Calçada Danificada", "icone": "🚶", "orgao_responsavel": "Departamento de Obras"},
    {"id": 5, "nome": "Árvore de Risco", "icone": "🌳", "orgao_responsavel": "Secretaria de Meio Ambiente"},
    {"id": 6, "nome": "Esgoto a Céu Aberto", "icone": "💧", "orgao_responsavel": "SAAE / SEMAE"},
    {"id": 7, "nome": "Pichação/Vandalismo", "icone": "🎨", "orgao_responsavel": "Secretaria de Conservação"},
    {"id": 8, "nome": "Sinalização Danificada", "icone": "🚦", "orgao_responsavel": "Departamento de Trânsito"},
]


@router.get("/")
async def listar_categorias():
    try:
        cats = await supabase_get("categorias", {"select": "*", "order": "nome.asc"})
        if cats:
            return {"categorias": cats}
    except Exception:
        pass
    return {"categorias": CATEGORIAS_DEFAULT}
