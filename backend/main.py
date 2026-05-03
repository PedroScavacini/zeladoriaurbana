from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, ocorrencias, mapa, dashboard, categorias
import uvicorn

app = FastAPI(
    title="Zeladoria Urbana Inteligente API",
    description="Sistema Municipal de Gestão de Ocorrências Urbanas",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticação"])
app.include_router(ocorrencias.router, prefix="/api/v1/ocorrencias", tags=["Ocorrências"])
app.include_router(mapa.router, prefix="/api/v1/mapa", tags=["Mapa"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(categorias.router, prefix="/api/v1/categorias", tags=["Categorias"])

@app.get("/")
def root():
    return {"status": "ok", "sistema": "Zeladoria Urbana Inteligente", "versao": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
