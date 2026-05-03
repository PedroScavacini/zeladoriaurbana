import random
import string
from datetime import datetime


def gerar_protocolo() -> str:
    """Gera protocolo único no formato ZUI-YYYYMMDD-XXXXXX."""
    data = datetime.now().strftime("%Y%m%d")
    sufixo = ''.join(random.choices(string.digits, k=6))
    return f"ZUI-{data}-{sufixo}"


def formatar_ocorrencia_para_mapa(oc: dict) -> dict:
    """Transforma ocorrência do banco em formato para o mapa."""
    return {
        "id": oc.get("id"),
        "protocolo": oc.get("protocolo"),
        "lat": oc.get("lat"),
        "lng": oc.get("lng"),
        "categoria_nome": oc.get("categoria_nome", "Ocorrência"),
        "categoria_icone": oc.get("categoria_icone", "📍"),
        "status": oc.get("status", "Aberta"),
        "descricao": oc.get("descricao", ""),
        "criado_em": oc.get("criado_em"),
        "imagem_url": oc.get("imagem_url"),
        "apoiadores": oc.get("apoiadores", 0),
    }


def status_badge_color(status: str) -> str:
    cores = {
        "Aberta": "#e74c3c",
        "Em Análise": "#f39c12",
        "Em Andamento": "#3498db",
        "Resolvida": "#27ae60",
        "Cancelada": "#95a5a6",
        "Prioritária": "#9b59b6",
    }
    return cores.get(status, "#95a5a6")
