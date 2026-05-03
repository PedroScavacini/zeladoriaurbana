import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  AVISO: SUPABASE_URL e SUPABASE_KEY não configurados. Configure o arquivo .env")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


def get_headers(prefer: str = "return=representation"):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer
    }


async def supabase_get(table: str, params: dict = None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=get_headers(), params=params)
        resp.raise_for_status()
        return resp.json()


async def supabase_post(table: str, data: dict):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=get_headers(), json=data)
        resp.raise_for_status()
        return resp.json()


async def supabase_patch(table: str, data: dict, filter_key: str, filter_val: str):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {filter_key: f"eq.{filter_val}"}
    async with httpx.AsyncClient() as client:
        resp = await client.patch(url, headers=get_headers(), json=data, params=params)
        resp.raise_for_status()
        return resp.json()


async def supabase_delete(table: str, filter_key: str, filter_val: str):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {filter_key: f"eq.{filter_val}"}
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, headers=get_headers(), params=params)
        resp.raise_for_status()
        return resp.json()
