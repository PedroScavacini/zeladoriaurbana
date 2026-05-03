-- ═══════════════════════════════════════════════════════════════════════════
-- ZELADORIA URBANA INTELIGENTE — Schema Supabase (PostgreSQL)
-- Execute este SQL no Supabase SQL Editor: https://supabase.com/dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- Habilitar extensão UUID (já vem por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tabela: categorias ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL UNIQUE,
  icone           VARCHAR(10) DEFAULT '📍',
  orgao_responsavel VARCHAR(150),
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: usuarios ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  ativo           BOOLEAN DEFAULT TRUE,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- ── Tabela: ocorrencias ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ocorrencias (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocolo       VARCHAR(25) NOT NULL UNIQUE,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  categoria_id    INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  categoria_nome  VARCHAR(100),
  categoria_icone VARCHAR(10) DEFAULT '📍',
  descricao       TEXT NOT NULL CHECK (char_length(descricao) >= 10 AND char_length(descricao) <= 500),
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  status          VARCHAR(30) DEFAULT 'Aberta'
                  CHECK (status IN ('Aberta','Em Análise','Em Andamento','Resolvida','Cancelada','Prioritária')),
  imagem_url      TEXT DEFAULT '',
  audio_transcricao TEXT DEFAULT '',
  confianca_ia    FLOAT DEFAULT 0,
  apoiadores      INTEGER DEFAULT 0,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_usuario ON ocorrencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_categoria ON ocorrencias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_geo ON ocorrencias(lat, lng);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_criado ON ocorrencias(criado_em DESC);

-- ── Tabela: evidencias ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidencias (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ocorrencia_id   UUID REFERENCES ocorrencias(id) ON DELETE CASCADE,
  tipo            VARCHAR(10) DEFAULT 'foto' CHECK (tipo IN ('foto','audio')),
  url             TEXT NOT NULL,
  transcricao     TEXT,
  tamanho         BIGINT DEFAULT 0,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidencias_ocorrencia ON evidencias(ocorrencia_id);

-- ── Tabela: status_historico ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_historico (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ocorrencia_id   UUID REFERENCES ocorrencias(id) ON DELETE CASCADE,
  status_anterior VARCHAR(30),
  status_novo     VARCHAR(30) NOT NULL,
  observacao      TEXT,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: ocorrencia_vinculos (duplicatas / apoios) ─────────────────────
CREATE TABLE IF NOT EXISTS ocorrencia_vinculos (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ocorrencia_principal_id   UUID REFERENCES ocorrencias(id) ON DELETE CASCADE,
  usuario_id                UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em                 TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed: categorias padrão ───────────────────────────────────────────────
INSERT INTO categorias (nome, icone, orgao_responsavel) VALUES
  ('Buraco na Via',          '🕳️', 'Departamento de Obras'),
  ('Lixo Irregular',         '🗑️', 'Secretaria de Limpeza'),
  ('Iluminação Defeituosa',  '💡', 'CPFL / ENEL'),
  ('Calçada Danificada',     '🚶', 'Departamento de Obras'),
  ('Árvore de Risco',        '🌳', 'Secretaria de Meio Ambiente'),
  ('Esgoto a Céu Aberto',   '💧', 'SAAE / SEMAE'),
  ('Pichação/Vandalismo',    '🎨', 'Secretaria de Conservação'),
  ('Sinalização Danificada', '🚦', 'Departamento de Trânsito')
ON CONFLICT (nome) DO NOTHING;

-- ── Row Level Security (RLS) ──────────────────────────────────────────────
-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura para ocorrências (mapa)
CREATE POLICY "Leitura pública de ocorrências" ON ocorrencias
  FOR SELECT USING (true);

CREATE POLICY "Leitura pública de categorias" ON categorias
  FOR SELECT USING (true);

-- Política de escrita via service_role (backend usa SUPABASE_KEY = anon ou service)
-- Para acesso total via backend, use a chave service_role no .env em produção

-- ── Trigger: atualizar apoiadores quando vinculo é criado ─────────────────
CREATE OR REPLACE FUNCTION incrementar_apoiadores()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ocorrencias
  SET apoiadores = apoiadores + 1,
      status = CASE WHEN apoiadores + 1 >= 10 THEN 'Prioritária' ELSE status END
  WHERE id = NEW.ocorrencia_principal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_apoiadores
AFTER INSERT ON ocorrencia_vinculos
FOR EACH ROW EXECUTE FUNCTION incrementar_apoiadores();

-- ── View: ocorrencias_mapa (view simplificada para o frontend) ────────────
CREATE OR REPLACE VIEW v_ocorrencias_mapa AS
SELECT
  o.id, o.protocolo, o.lat, o.lng,
  o.categoria_nome, o.categoria_icone,
  o.status, o.descricao, o.criado_em,
  o.imagem_url, o.apoiadores,
  c.orgao_responsavel
FROM ocorrencias o
LEFT JOIN categorias c ON c.id = o.categoria_id
WHERE o.status != 'Cancelada'
ORDER BY o.criado_em DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIM DO SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
