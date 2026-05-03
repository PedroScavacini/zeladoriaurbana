# 🏙️ Zeladoria Urbana Inteligente

> Sistema Municipal de Gestão de Ocorrências Urbanas com Inteligência Artificial Integrada  
> **Versão 1.0 · Abril 2026**

---

## ✨ Funcionalidades

| Módulo | Descrição |
|---|---|
| 🔐 Autenticação | Login por e-mail com token OTP de 6 dígitos (sem senha) |
| 📍 Registro de Ocorrências | Fluxo guiado em 4 etapas: local → evidências → classificação → confirmação |
| 📷 Upload de Imagem | Compressão automática, preview e análise por IA mockada |
| 🎙️ Gravação de Áudio | Gravação no browser com transcrição automática via IA |
| 🤖 IA Simulada | Classificação de imagem e transcrição de áudio (mock realista) |
| 🗺️ Mapa Interativo | Leaflet + OpenStreetMap com marcadores coloridos por status |
| 📋 Histórico | Listagem de ocorrências do usuário com filtros por status |
| 📊 Dashboard | Estatísticas, gráfico de categorias e ranking de bairros |
| 🔍 Detecção de Duplicatas | Alerta de ocorrências similares no raio de 50m |

---

## 📁 Estrutura de Pastas

```
zeladoria/
├── backend/
│   ├── main.py                 # FastAPI entrypoint
│   ├── supabase_client.py      # Cliente HTTP para Supabase REST API
│   ├── requirements.txt        # Dependências Python
│   ├── .env.example            # Template de configuração
│   ├── routes/
│   │   ├── auth.py             # Autenticação e sessão
│   │   ├── ocorrencias.py      # CRUD de ocorrências + IA
│   │   ├── mapa.py             # Dados para o mapa
│   │   ├── dashboard.py        # Métricas e estatísticas
│   │   └── categorias.py       # Listagem de categorias
│   └── services/
│       ├── auth_service.py     # OTP, JWT
│       ├── ia_service.py       # Mock: classificação + transcrição
│       └── ocorrencia_service.py  # Geração de protocolo, utilitários
├── frontend/
│   ├── index.html              # SPA shell
│   ├── css/
│   │   └── style.css           # Estilo mobile-first (verde/bege)
│   └── js/
│       ├── api.js              # Cliente HTTP + utilitários
│       └── app.js              # SPA router + todas as views
├── supabase_schema.sql         # SQL para criar tabelas no Supabase
├── iniciar_backend.bat         # Script Windows para rodar o backend
├── iniciar_frontend.bat        # Script Windows para servir o frontend
└── README.md                   # Este arquivo
```

---

## 🚀 Como Configurar e Rodar

### Pré-requisitos

- **Python 3.10+** — [python.org/downloads](https://www.python.org/downloads/)  
  ✅ Marque **"Add Python to PATH"** durante a instalação
- **Navegador moderno** — Chrome, Firefox, Edge, Safari (últimas versões)
- **Conta Supabase gratuita** — [supabase.com](https://supabase.com) (opcional para testar com mock)

---

### Passo 1 — Configurar o Supabase (opcional, mas recomendado)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **"New Project"** e preencha:
   - Nome: `zeladoria-urbana`
   - Senha do banco (anote!)
   - Região: South America (São Paulo)
3. Aguarde o projeto ser criado (~2 minutos)
4. Vá em **Settings → API** e copie:
   - `Project URL` → ex: `https://xyzabc.supabase.co`
   - `anon public` key → chave longa
5. Vá em **SQL Editor** → clique em **"New query"**
6. Cole o conteúdo de `supabase_schema.sql` e clique em **Run**
7. As tabelas e dados iniciais serão criados automaticamente

---

### Passo 2 — Configurar o Backend

1. Abra a pasta `backend/`
2. Copie `.env.example` para `.env`:
   ```
   copy backend\.env.example backend\.env
   ```
3. Edite `backend/.env` com suas credenciais:
   ```env
   SUPABASE_URL=https://SEU_PROJETO.supabase.co
   SUPABASE_KEY=sua_anon_key_aqui
   JWT_SECRET=troque-por-uma-string-secreta-longa
   ```

> 💡 **Sem Supabase?** O sistema funciona em **modo mock** com dados simulados. Apenas deixe os valores padrão no `.env`.

---

### Passo 3 — Iniciar o Backend

**Windows (recomendado):**
```
Duplo clique em: iniciar_backend.bat
```

**Ou manualmente:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python main.py
```

O backend estará disponível em:
- API: `http://localhost:8000`
- Documentação interativa: `http://localhost:8000/docs`

---

### Passo 4 — Iniciar o Frontend

**Windows (recomendado):**
```
Duplo clique em: iniciar_frontend.bat
```

**Ou manualmente:**
```bash
cd frontend
python -m http.server 5500
```

Abra no navegador: `http://localhost:5500`

> ⚠️ **Não abra o `index.html` diretamente** como arquivo (`file://`). Use sempre o servidor HTTP para que a câmera e geolocalização funcionem corretamente.

---

## 🔑 Como Fazer Login (Modo Desenvolvimento)

1. Abra `http://localhost:5500`
2. Digite seu nome e e-mail
3. Clique em **"Receber código"**
4. O código OTP aparecerá **no console do backend** (terminal) e também **na tela** (aviso dev)
5. Digite o código de 6 dígitos e clique em **"Entrar"**

> 🔒 Em produção, o código seria enviado por e-mail real via SMTP/SendGrid/Resend.

---

## 🔌 Endpoints da API

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/auth/solicitar-token` | Gera e envia OTP por e-mail |
| POST | `/api/v1/auth/validar-token` | Valida OTP e retorna JWT |
| GET | `/api/v1/auth/me` | Dados do usuário autenticado |
| PATCH | `/api/v1/auth/me` | Atualiza nome do usuário |

### Ocorrências
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/ocorrencias/` | Criar nova ocorrência |
| GET | `/api/v1/ocorrencias/minhas` | Listar ocorrências do usuário |
| GET | `/api/v1/ocorrencias/{id}` | Detalhe de uma ocorrência |
| POST | `/api/v1/ocorrencias/classificar-imagem` | IA: classificar imagem |
| POST | `/api/v1/ocorrencias/transcrever-audio` | IA: transcrever áudio |
| GET | `/api/v1/ocorrencias/verificar-duplicatas` | Verificar duplicatas próximas |
| POST | `/api/v1/ocorrencias/{id}/apoiar` | Apoiar ocorrência existente |
| PATCH | `/api/v1/ocorrencias/{id}/cancelar` | Cancelar ocorrência |

### Mapa, Dashboard e Categorias
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/mapa/ocorrencias` | Ocorrências para o mapa |
| GET | `/api/v1/dashboard/` | Métricas e estatísticas |
| GET | `/api/v1/categorias/` | Listar categorias |

---

## 🤖 IA Simulada (Mock)

O sistema inclui funções de IA mockadas que simulam comportamento realista:

### `classificar_imagem()`
- Retorna categoria aleatória da lista de categorias disponíveis
- Confiança entre 72% e 97%
- Latência simulada de 0.5 a 1.5 segundos

### `transcrever_audio()`
- Retorna transcrições pré-definidas realistas em pt-BR
- Latência simulada de 0.3 a 1.0 segundos

**Para conectar IA real:** Em `backend/services/ia_service.py`, substitua os retornos mock por chamadas à API desejada:
- **Groq (LLaMA Vision):** `https://api.groq.com/openai/v1/chat/completions`
- **OpenAI Vision:** `https://api.openai.com/v1/chat/completions`
- **Groq Whisper (áudio):** `https://api.groq.com/openai/v1/audio/transcriptions`

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas criadas pelo `supabase_schema.sql`

| Tabela | Descrição |
|---|---|
| `usuarios` | Dados dos cidadãos cadastrados |
| `categorias` | Tipos de ocorrência (8 categorias padrão) |
| `ocorrencias` | Registro principal com localização, status e protocolo |
| `evidencias` | Fotos e áudios vinculados às ocorrências |
| `status_historico` | Auditoria de mudanças de status |
| `ocorrencia_vinculos` | Apoios de cidadãos a ocorrências existentes |

### Views e Triggers
- **`v_ocorrencias_mapa`** — View otimizada para exibição no mapa
- **`trigger_apoiadores`** — Atualiza contador e promove ocorrência a Prioritária quando ≥10 apoios

---

## 🎨 Design System

| Elemento | Valor |
|---|---|
| Verde principal | `#3f7d58` |
| Verde escuro | `#2d5c40` |
| Fundo bege | `#fff5e4` |
| Tipografia | Segoe UI, -apple-system |
| Border radius | 16px (cards), 10px (campos) |
| Mobile breakpoint | < 640px |

---

## 🔧 Problemas Comuns

**"Geolocalização não funciona"**  
→ Use sempre `http://localhost:5500`, nunca abra o arquivo HTML diretamente.

**"Câmera não abre no celular"**  
→ Acesse pelo IP local da sua rede: `http://192.168.x.x:5500`.  
→ Câmera requer HTTPS em dispositivos reais — use ngrok para testes externos.

**"CORS error no console"**  
→ Verifique se o backend está rodando em `http://localhost:8000`.

**"Supabase: permission denied"**  
→ No Supabase, vá em **Authentication → Policies** e verifique as políticas RLS.  
→ Ou use a `service_role` key no `.env` (nunca exponha no frontend!).

**"Token OTP inválido"**  
→ O token expira em 10 minutos. Solicite um novo clicando em "Voltar".

---

## 📱 Testando no Celular

1. Descubra o IP da sua máquina: `ipconfig` (Windows)
2. Acesse pelo celular (mesma rede Wi-Fi): `http://192.168.x.x:5500`
3. Para HTTPS (necessário para câmera): use [ngrok](https://ngrok.com):
   ```bash
   ngrok http 5500
   ```

---

## 🚀 Próximos Passos para Produção

- [ ] Substituir IA mock por Groq/OpenAI real
- [ ] Configurar envio de e-mail (Resend, SendGrid, SMTP)
- [ ] Habilitar HTTPS (Nginx + Let's Encrypt)
- [ ] Usar `service_role` key do Supabase no backend
- [ ] Adicionar upload de imagens para Supabase Storage ou S3
- [ ] Configurar rate limiting (ex: slowapi)
- [ ] Deploy: Railway, Render, ou VPS

---

## 📄 Licença

Sistema desenvolvido como protótipo funcional para fins municipais.  
Baseado na especificação **Zeladoria Urbana Inteligente v1.0 — Abril 2026**.
