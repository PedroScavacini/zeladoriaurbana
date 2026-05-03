import random
import time
import base64
from typing import Optional


CATEGORIAS_IA = [
    {"categoria": "Buraco na Via", "icone": "🕳️", "id": 1},
    {"categoria": "Lixo Irregular", "icone": "🗑️", "id": 2},
    {"categoria": "Iluminação Defeituosa", "icone": "💡", "id": 3},
    {"categoria": "Calçada Danificada", "icone": "🚶", "id": 4},
    {"categoria": "Árvore de Risco", "icone": "🌳", "id": 5},
    {"categoria": "Esgoto a Céu Aberto", "icone": "💧", "id": 6},
    {"categoria": "Pichação/Vandalismo", "icone": "🎨", "id": 7},
    {"categoria": "Sinalização Danificada", "icone": "🚦", "id": 8},
]

TRANSCRICOES_MOCK = [
    "Tem um buraco enorme na rua, quase caí de bicicleta. Está muito perigoso para os motoristas e pedestres.",
    "O lixo está acumulado há dias neste local. O cheiro é insuportável e está atraindo ratos.",
    "O poste está apagado há uma semana. À noite fica completamente escuro e é perigoso.",
    "A calçada está toda quebrada, impossível passar com carrinho de bebê ou cadeira de rodas.",
    "Uma árvore grande está caindo na direção da rua, corre risco de cair sobre carros ou pedestres.",
    "Tem esgoto vazando na rua há vários dias. Está causando mau cheiro e risco à saúde.",
    "A placa de trânsito foi arrancada. Os motoristas ficam sem referência na esquina.",
]


async def classificar_imagem(image_data: Optional[str] = None) -> dict:
    """
    Simula classificação de imagem via IA.
    Em produção, chamaria API Groq/OpenAI Vision.
    """
    # Simular latência de processamento
    await _simular_latencia(0.5, 1.5)

    categoria = random.choice(CATEGORIAS_IA)
    confianca = round(random.uniform(0.72, 0.97), 2)

    return {
        "categoria_id": categoria["id"],
        "categoria_nome": categoria["categoria"],
        "categoria_icone": categoria["icone"],
        "confianca": confianca,
        "confianca_percentual": f"{int(confianca * 100)}%",
        "modelo": "mock-vision-v1",
        "processado_em_ms": random.randint(400, 1200)
    }


async def transcrever_audio(audio_data: Optional[str] = None) -> dict:
    """
    Simula transcrição de áudio via IA.
    Em produção, chamaria API Groq Whisper ou OpenAI.
    """
    await _simular_latencia(0.3, 1.0)

    transcricao = random.choice(TRANSCRICOES_MOCK)

    return {
        "transcricao": transcricao,
        "idioma": "pt-BR",
        "confianca": round(random.uniform(0.85, 0.99), 2),
        "duracao_segundos": random.randint(5, 55),
        "modelo": "mock-whisper-v1",
        "processado_em_ms": random.randint(300, 900)
    }


async def detectar_duplicatas(lat: float, lng: float, categoria_id: int, raio_metros: int = 50) -> list:
    """
    Verifica ocorrências próximas no raio especificado.
    """
    # Retorna mock de duplicatas próximas com baixa probabilidade
    if random.random() < 0.25:  # 25% de chance de ter duplicata
        return [{
            "protocolo": f"ZUI-20260401-{random.randint(100000, 999999)}",
            "categoria": random.choice(CATEGORIAS_IA)["categoria"],
            "distancia_metros": random.randint(10, 49),
            "status": random.choice(["Aberta", "Em Análise"]),
            "apoiadores": random.randint(1, 8)
        }]
    return []


async def _simular_latencia(min_s: float, max_s: float):
    import asyncio
    await asyncio.sleep(random.uniform(min_s, max_s))
