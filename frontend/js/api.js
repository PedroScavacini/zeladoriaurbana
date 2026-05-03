// api.js — Cliente HTTP para a API Zeladoria Urbana Inteligente

const API_BASE = 'http://localhost:8000/api/v1';

// ── Helpers ────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('zui_access_token');
}

function setSession(data) {
  localStorage.setItem('zui_access_token', data.access_token);
  localStorage.setItem('zui_refresh_token', data.refresh_token || '');
  localStorage.setItem('zui_usuario', JSON.stringify(data.usuario));
}

function clearSession() {
  localStorage.removeItem('zui_access_token');
  localStorage.removeItem('zui_refresh_token');
  localStorage.removeItem('zui_usuario');
}

function getUsuario() {
  const raw = localStorage.getItem('zui_usuario');
  return raw ? JSON.parse(raw) : null;
}

function isLoggedIn() {
  return !!getToken();
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    clearSession();
    window.location.hash = '#login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || `Erro ${res.status}`);
  }

  return data;
}

// ── Auth ───────────────────────────────────────────────────────────────────

const Auth = {
  async solicitarToken(email, nome = '') {
    return request('POST', '/auth/solicitar-token', { email, nome }, false);
  },

  async validarToken(email, token) {
    const data = await request('POST', '/auth/validar-token', { email, token }, false);
    setSession(data);
    return data;
  },

  async me() {
    return request('GET', '/auth/me');
  },

  async atualizarNome(nome) {
    return request('PATCH', '/auth/me', { nome });
  },

  logout() {
    clearSession();
    window.location.hash = '#login';
  }
};

// ── Ocorrências ────────────────────────────────────────────────────────────

const Ocorrencias = {
  async classificarImagem(imagemBase64 = null) {
    return request('POST', '/ocorrencias/classificar-imagem', { imagem: imagemBase64 });
  },

  async transcreverAudio(audioBase64 = null) {
    return request('POST', '/ocorrencias/transcrever-audio', { audio: audioBase64 });
  },

  async verificarDuplicatas(lat, lng, categoriaId = 0) {
    return request('GET', `/ocorrencias/verificar-duplicatas?lat=${lat}&lng=${lng}&categoria_id=${categoriaId}`);
  },

  async criar(dados) {
    return request('POST', '/ocorrencias/', dados);
  },

  async minhas(status = null) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request('GET', `/ocorrencias/minhas${qs}`);
  },

  async detalhe(id) {
    return request('GET', `/ocorrencias/${id}`);
  },

  async apoiar(id) {
    return request('POST', `/ocorrencias/${id}/apoiar`, {});
  },

  async cancelar(id) {
    return request('PATCH', `/ocorrencias/${id}/cancelar`, {});
  }
};

// ── Mapa ───────────────────────────────────────────────────────────────────

const Mapa = {
  async ocorrencias(categoria = null, status = null) {
    let qs = '?limit=200';
    if (categoria) qs += `&categoria=${encodeURIComponent(categoria)}`;
    if (status) qs += `&status=${encodeURIComponent(status)}`;
    return request('GET', `/mapa/ocorrencias${qs}`, null, false);
  }
};

// ── Dashboard ──────────────────────────────────────────────────────────────

const Dashboard = {
  async resumo(periodoDias = 30) {
    return request('GET', `/dashboard/?periodo_dias=${periodoDias}`);
  }
};

// ── Categorias ─────────────────────────────────────────────────────────────

const Categorias = {
  async listar() {
    return request('GET', '/categorias/', null, false);
  }
};

// ── Geolocalização ─────────────────────────────────────────────────────────

function obterGeolocalizacao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste dispositivo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error('Não foi possível obter sua localização. ' + err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// ── Utilitários de imagem ──────────────────────────────────────────────────

function comprimirImagem(file, maxSizeMB = 1) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxPx = 1920;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = (height * maxPx) / width; width = maxPx; }
          else { width = (width * maxPx) / height; height = maxPx; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > maxSizeMB * 1024 * 1024 * 1.33 && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl.split(',')[1]); // retorna só o base64
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatarData(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatarDataCurta(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Exports globais
window.Auth = Auth;
window.Ocorrencias = Ocorrencias;
window.Mapa = Mapa;
window.Dashboard = Dashboard;
window.Categorias = Categorias;
window.obterGeolocalizacao = obterGeolocalizacao;
window.comprimirImagem = comprimirImagem;
window.formatarData = formatarData;
window.formatarDataCurta = formatarDataCurta;
window.getUsuario = getUsuario;
window.isLoggedIn = isLoggedIn;
window.clearSession = clearSession;
