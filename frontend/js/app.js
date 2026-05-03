// app.js — SPA Zeladoria Urbana Inteligente v2

// ── Estado global do registro ─────────────────────────────────────────────
const RS = {
  etapa: 1, lat: null, lng: null, accuracy: null,
  imagemBase64: null, imagemPreview: null,
  audioBase64: null, audioTranscricao: null,
  categoriaId: null, categoriaNome: null, categoriaIcone: null,
  confiancaIa: null, descricao: '', categorias: [], duplicatas: [],
  reset() {
    Object.assign(this, {
      etapa:1, lat:null, lng:null, accuracy:null,
      imagemBase64:null, imagemPreview:null,
      audioBase64:null, audioTranscricao:null,
      categoriaId:null, categoriaNome:null, categoriaIcone:null,
      confiancaIa:null, descricao:'', duplicatas:[]
    });
  }
};

let mapaL = null, mapaLayer = null;
let mediaRec = null, audioChunks = [], gravando = false;

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════
function initRouter() {
  window.addEventListener('hashchange', rotear);
  rotear();
}

function rotear() {
  const hash = (window.location.hash || '#mapa').split('?')[0];
  if (!isLoggedIn() && hash !== '#login') { window.location.hash = '#login'; return; }
  if (isLoggedIn() && hash === '#login') { window.location.hash = '#mapa'; return; }
  document.getElementById('app').innerHTML = '';
  ({ '#login': vLogin, '#mapa': vMapa, '#registrar': vRegistro,
     '#historico': vHistorico, '#dashboard': vDashboard }[hash] || vMapa)();
  const nav = document.getElementById('bottom-nav');
  nav.style.display = hash === '#login' ? 'none' : 'flex';
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.rota === hash));
}

function navegar(hash) { window.location.hash = hash; }

// ── Toast ─────────────────────────────────────────────────────────────────
function toast(msg, tipo = 'info', ms = 3400) {
  const icons = { success:'✓', error:'✕', warning:'!', info:'i' };
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.innerHTML = `<span style="font-weight:700;font-size:12px;opacity:.8">${icons[tipo]||'i'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, ms);
}

// ── Loading btn ───────────────────────────────────────────────────────────
function setBtnLoading(btn, on) {
  if (!btn) return;
  if (on) { btn.disabled = true; btn._txt = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Aguarde`; }
  else { btn.disabled = false; btn.innerHTML = btn._txt || 'OK'; }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════
function vLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="login-hero">
        <div class="login-mark">
          <img src="img/logo_transparent.png" alt="Zeladoria Urbana" class="login-logo-img" />
        </div>
        <h1>Zeladoria<br><em>Urbana</em></h1>
        <p>Registre e acompanhe problemas<br>na sua cidade em tempo real</p>
      </div>

      <div class="login-card">
        <div id="step-email">
          <p class="login-card-title">Entrar</p>
          <p class="login-card-sub">Informe seu e-mail para receber um código de acesso</p>
          <div class="field-group">
            <label>Nome</label>
            <input type="text" id="l-nome" placeholder="Seu nome completo" autocomplete="name" />
          </div>
          <div class="field-group">
            <label>E-mail <span class="required">*</span></label>
            <input type="email" id="l-email" placeholder="seu@email.com" autocomplete="email" />
          </div>
          <button class="btn btn-primary btn-full" id="btn-solicitar">Continuar →</button>
        </div>

        <div id="step-token" style="display:none">
          <p class="login-card-title">Código de acesso</p>
          <p class="login-card-sub">Enviamos um código para <strong id="l-email-show"></strong></p>
          <div id="dev-code-box" style="display:none" class="aviso-dev">
            <p>🔧 Modo desenvolvimento — código gerado:</p>
            <code id="dev-code-val"></code>
          </div>
          <div class="field-group">
            <label>Código</label>
            <input type="number" id="l-token" placeholder="000000" maxlength="6"
              inputmode="numeric" style="font-size:28px;letter-spacing:10px;text-align:center;font-weight:700" />
          </div>
          <button class="btn btn-primary btn-full" id="btn-validar">Entrar →</button>
          <div class="login-divider"><span>ou</span></div>
          <button class="btn btn-ghost btn-full" id="btn-back">← Usar outro e-mail</button>
        </div>
      </div>
      <p class="login-footer">Sistema municipal · Dados protegidos pela LGPD</p>
    </div>`;

  const btnS = document.getElementById('btn-solicitar');
  const btnV = document.getElementById('btn-validar');

  btnS.addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const nome  = document.getElementById('l-nome').value.trim();
    if (!email.includes('@')) { toast('Informe um e-mail válido', 'error'); return; }
    setBtnLoading(btnS, true);
    try {
      const r = await Auth.solicitarToken(email, nome);
      document.getElementById('l-email-show').textContent = email;
      if (r.token_dev) {
        document.getElementById('dev-code-box').style.display = 'block';
        document.getElementById('dev-code-val').textContent = r.token_dev;
      }
      document.getElementById('step-email').style.display = 'none';
      document.getElementById('step-token').style.display = 'block';
      setTimeout(() => document.getElementById('l-token')?.focus(), 100);
      toast('Código enviado!', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setBtnLoading(btnS, false);
  });

  btnV.addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const token = document.getElementById('l-token').value.trim();
    if (token.length !== 6) { toast('Código deve ter 6 dígitos', 'error'); return; }
    setBtnLoading(btnV, true);
    try {
      await Auth.validarToken(email, token);
      toast('Bem-vindo(a)! 🎉', 'success');
      navegar('#mapa');
    } catch (e) { toast(e.message, 'error'); }
    setBtnLoading(btnV, false);
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    document.getElementById('step-token').style.display = 'none';
    document.getElementById('step-email').style.display = 'block';
  });

  document.getElementById('l-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') btnS.click();
  });
  document.getElementById('l-token').addEventListener('keydown', e => {
    if (e.key === 'Enter') btnV.click();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPA
// ═══════════════════════════════════════════════════════════════════════════
function vMapa() {
  document.getElementById('app').innerHTML = `
    <div class="page-mapa">
      <div class="mapa-header">
        <div class="mapa-header-top">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="img/logo_transparent.png" alt="" style="width:28px;height:28px;object-fit:contain;opacity:.85" />
            <h2>Mapa</h2>
          </div>
          <button class="btn btn-sm btn-ghost" id="btn-refresh-mapa"
            style="padding:6px 12px;border-radius:100px;border:1.5px solid var(--bege3)">
            ↻ Atualizar
          </button>
        </div>
        <div class="mapa-filtros" id="mapa-chips">
          <div class="filtro-chip active" data-val="">Todas</div>
          <div class="filtro-chip" data-val="Aberta">Abertas</div>
          <div class="filtro-chip" data-val="Em Análise">Em Análise</div>
          <div class="filtro-chip" data-val="Em Andamento">Andamento</div>
          <div class="filtro-chip" data-val="Resolvida">Resolvidas</div>
        </div>
      </div>
      <div id="leaflet-map"></div>
      <div class="mapa-legenda">
        <div class="leg-item"><span class="dot dot-aberta"></span>Aberta</div>
        <div class="leg-item"><span class="dot dot-analise"></span>Em Análise</div>
        <div class="leg-item"><span class="dot dot-andamento"></span>Andamento</div>
        <div class="leg-item"><span class="dot dot-resolvida"></span>Resolvida</div>
      </div>
    </div>`;

  if (mapaL) { mapaL.remove(); mapaL = null; }
  mapaL = L.map('leaflet-map', { zoomControl: false }).setView([-22.7833, -47.2917], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(mapaL);
  L.control.zoom({ position: 'bottomright' }).addTo(mapaL);

  carregarMapa();

  document.getElementById('btn-refresh-mapa').addEventListener('click', carregarMapa);
  document.querySelectorAll('#mapa-chips .filtro-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#mapa-chips .filtro-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      carregarMapa();
    });
  });
}

const CORES = { 'Aberta':'#e74c3c','Em Análise':'#e67e22','Em Andamento':'#2980b9','Resolvida':'#27ae60','Cancelada':'#95a5a6','Prioritária':'#9b59b6' };

async function carregarMapa() {
  if (!mapaL) return;
  const status = document.querySelector('#mapa-chips .filtro-chip.active')?.dataset.val || '';
  const btn = document.getElementById('btn-refresh-mapa');
  if (btn) btn.innerHTML = '<span class="spinner spinner-g" style="width:13px;height:13px;border-width:2px"></span>';

  try {
    const res = await Mapa.ocorrencias(null, status || null);
    if (mapaLayer) mapaLayer.clearLayers();
    else { mapaLayer = L.layerGroup().addTo(mapaL); }

    res.ocorrencias.forEach(oc => {
      if (!oc.lat || !oc.lng) return;
      const cor = CORES[oc.status] || '#666';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
          background:${cor};border:2.5px solid white;
          box-shadow:0 3px 12px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center">
          <span style="transform:rotate(45deg);font-size:16px;line-height:1">${oc.categoria_icone||'📍'}</span>
        </div>`,
        iconSize:[36,36], iconAnchor:[18,36], popupAnchor:[0,-40]
      });

      const m = L.marker([oc.lat, oc.lng], { icon }).addTo(mapaLayer);
      m.bindPopup(`
        <div class="popup-oc">
          <div class="popup-header" style="background:${cor}">
            <p class="popup-cat">${oc.categoria_icone||'📍'} ${oc.categoria_nome}</p>
            <span class="popup-status-pill">${oc.status}</span>
          </div>
          <div class="popup-body">
            <p class="popup-protocolo">📋 ${oc.protocolo}</p>
            <p class="popup-desc">${(oc.descricao||'').substring(0,120)}</p>
            <div class="popup-meta">
              <span>📅 ${formatarDataCurta(oc.criado_em)}</span>
              ${oc.apoiadores>0?`<span>👥 ${oc.apoiadores}</span>`:''}
            </div>
            ${oc.apoiadores>=10?'<p class="popup-prioritario">⚡ PRIORITÁRIA</p>':''}
          </div>
        </div>`, { maxWidth: 260 });
    });

    if (btn) btn.innerHTML = `↻ ${res.total} ocorrências`;
  } catch (e) {
    toast('Erro ao carregar mapa: ' + e.message, 'error');
    if (btn) btn.innerHTML = '↻ Atualizar';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRO — WIZARD
// ═══════════════════════════════════════════════════════════════════════════
function vRegistro() {
  RS.reset();
  document.getElementById('app').innerHTML = `
    <div class="page-registro">
      <div class="registro-header">
        <div class="registro-header-top">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="img/logo_transparent.png" alt="" style="width:28px;height:28px;object-fit:contain;filter:brightness(0) invert(1);opacity:.9" />
            <h2>Nova ocorrência</h2>
          </div>
          <span class="step-label-current" id="step-label">Passo 1 de 4</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="progress-fill" style="width:25%"></div>
        </div>
      </div>
      <div class="etapa-wrap" id="etapa-wrap"></div>
    </div>`;

  Categorias.listar().then(r => { RS.categorias = r.categorias || []; });
  renderStep(1);
}

function renderStep(n) {
  RS.etapa = n;
  const label = document.getElementById('step-label');
  const fill = document.getElementById('progress-fill');
  if (label) label.textContent = `Passo ${n} de 4`;
  if (fill) fill.style.width = `${n * 25}%`;
  [s1, s2, s3, s4][n-1]?.();
}

// ── Step 1: Localização ────────────────────────────────────────────────────
function s1() {
  const wrap = document.getElementById('etapa-wrap');
  wrap.innerHTML = `
    <div class="etapa-card">
      <div class="etapa-body">
        <p class="etapa-kicker">Etapa 1</p>
        <h3 class="etapa-titulo">Onde está o problema?</h3>
        <p class="etapa-sub">Precisamos da sua localização para registrar corretamente</p>
        <div class="geo-pill obtendo" id="geo-pill">
          <span class="spinner" style="border-color:rgba(37,99,235,0.3);border-top-color:#2563eb;flex-shrink:0"></span>
          <span>Obtendo localização GPS…</span>
        </div>
        <div id="mini-mapa" class="mini-mapa" style="display:none"></div>
        <div id="geo-coords" class="geo-coords" style="display:none"></div>
        <button class="btn btn-ghost btn-sm" id="btn-retry-geo" style="display:none;margin-bottom:12px">↺ Tentar novamente</button>
      </div>
      <div class="etapa-footer">
        <button class="btn btn-ghost" onclick="navegar('#mapa')">Cancelar</button>
        <button class="btn btn-primary" id="btn-s1" disabled>Próximo →</button>
      </div>
    </div>`;

  capturarGeo();
  document.getElementById('btn-s1').addEventListener('click', () => {
    if (!RS.lat) { toast('Aguarde a localização', 'warning'); return; }
    renderStep(2);
  });
  document.getElementById('btn-retry-geo').addEventListener('click', capturarGeo);
}

async function capturarGeo() {
  const pill = document.getElementById('geo-pill');
  const btn  = document.getElementById('btn-s1');
  const retry = document.getElementById('btn-retry-geo');
  if (!pill) return;

  pill.className = 'geo-pill obtendo';
  pill.innerHTML = `<span class="spinner" style="border-color:rgba(37,99,235,0.3);border-top-color:#2563eb;flex-shrink:0"></span><span>Obtendo localização GPS…</span>`;
  if (btn) btn.disabled = true;
  if (retry) retry.style.display = 'none';

  try {
    const pos = await obterGeolocalizacao();
    RS.lat = pos.lat; RS.lng = pos.lng; RS.accuracy = pos.accuracy;

    pill.className = 'geo-pill obtida';
    pill.innerHTML = `<span>✓</span> <span>Localização capturada · precisão ~${Math.round(pos.accuracy)}m</span>`;

    const coords = document.getElementById('geo-coords');
    if (coords) { coords.style.display = 'block'; coords.textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`; }

    const mm = document.getElementById('mini-mapa');
    if (mm) {
      mm.style.display = 'block';
      const m = L.map('mini-mapa', { zoomControl: false, dragging: false }).setView([pos.lat, pos.lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
      const pin = L.marker([pos.lat, pos.lng], { draggable: true }).addTo(m);
      pin.on('dragend', e => {
        const ll = e.target.getLatLng();
        RS.lat = ll.lat; RS.lng = ll.lng;
        if (coords) coords.textContent = `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;
      });
    }
    if (btn) btn.disabled = false;
  } catch (e) {
    pill.className = 'geo-pill falha';
    pill.innerHTML = `<span>⚠</span> <span>${e.message}</span>`;
    RS.lat = -22.7833; RS.lng = -47.2917;
    if (retry) retry.style.display = 'inline-flex';
    if (btn) { btn.disabled = false; btn.textContent = 'Continuar com local padrão →'; }
  }
}

// ── Step 2: Evidências ─────────────────────────────────────────────────────
function s2() {
  document.getElementById('etapa-wrap').innerHTML = `
    <div class="etapa-card">
      <div class="etapa-body">
        <p class="etapa-kicker">Etapa 2</p>
        <h3 class="etapa-titulo">Registre as evidências</h3>
        <p class="etapa-sub">Foto obrigatória — áudio opcional</p>

        <input type="file" id="input-img" accept="image/*" capture="environment" style="display:none" />
        <div class="upload-zone" id="upload-zone">
          <div class="upload-placeholder" id="upload-ph">
            <div class="upload-icon">📷</div>
            <strong>Toque para fotografar</strong>
            <span>ou escolha da galeria</span>
          </div>
          <img id="img-preview" style="display:none" alt="Foto da ocorrência" />
          <div class="ia-overlay" id="ia-overlay">
            <span class="ia-pill"><span class="spinner"></span> IA analisando…</span>
          </div>
        </div>

        <div id="dup-banner" style="display:none"></div>

        <div class="audio-section">
          <div class="audio-head">
            <strong>Áudio</strong>
            <span>opcional</span>
          </div>
          <div class="audio-row">
            <button class="btn btn-sm btn-outline btn-pill" id="btn-gravar">🎙 Gravar</button>
            <span class="audio-status" id="audio-st">Nenhum áudio gravado</span>
          </div>
          <div id="audio-trans" style="display:none" class="transcricao-card"></div>
        </div>
      </div>
      <div class="etapa-footer">
        <button class="btn btn-ghost" id="btn-back-s2">← Voltar</button>
        <button class="btn btn-primary" id="btn-s2" disabled>Próximo →</button>
      </div>
    </div>`;

  const zone = document.getElementById('upload-zone');
  const inp  = document.getElementById('input-img');

  zone.addEventListener('click', e => { if (e.target.id !== 'btn-gravar') inp.click(); });
  inp.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    toast('Comprimindo imagem…', 'info', 1500);
    const b64 = await comprimirImagem(f, 1);
    RS.imagemBase64 = b64;
    RS.imagemPreview = `data:image/jpeg;base64,${b64}`;

    document.getElementById('upload-ph').style.display = 'none';
    const prev = document.getElementById('img-preview');
    prev.src = RS.imagemPreview; prev.style.display = 'block';
    zone.classList.add('has-image');
    document.getElementById('btn-s2').disabled = false;

    // IA + duplicatas em paralelo
    const over = document.getElementById('ia-overlay');
    over.style.display = 'block';
    try {
      const [ia, dups] = await Promise.all([
        Ocorrencias.classificarImagem(b64),
        Ocorrencias.verificarDuplicatas(RS.lat, RS.lng)
      ]);
      RS.categoriaId   = ia.categoria_id;
      RS.categoriaNome = ia.categoria_nome;
      RS.categoriaIcone = ia.categoria_icone;
      RS.confiancaIa   = ia.confianca;
      toast(`IA: ${ia.categoria_icone} ${ia.categoria_nome} · ${ia.confianca_percentual}`, 'success', 3500);
      if (dups.total > 0) mostrarDupBanner(dups.duplicatas[0]);
    } catch { toast('Classificação manual disponível na próxima etapa', 'warning'); }
    over.style.display = 'none';
  });

  document.getElementById('btn-gravar').addEventListener('click', toggleAudio);
  document.getElementById('btn-back-s2').addEventListener('click', () => renderStep(1));
  document.getElementById('btn-s2').addEventListener('click', () => {
    if (!RS.imagemBase64) { toast('Foto é obrigatória', 'error'); return; }
    renderStep(3);
  });
}

function mostrarDupBanner(dup) {
  const el = document.getElementById('dup-banner');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `
    <div class="duplicata-banner">
      <div class="dup-head">⚠️ <strong>Ocorrência similar detectada a ${dup.distancia_metros}m</strong></div>
      <p class="dup-body">${dup.categoria} · protocolo ${dup.protocolo} · ${dup.apoiadores} apoiador(es)</p>
      <div class="dup-actions">
        <button class="btn btn-sm btn-outline btn-pill" id="btn-apoiar-dup">Apoiar esta</button>
        <button class="btn btn-sm btn-ghost" id="btn-nova-dup">Criar nova mesmo assim</button>
      </div>
    </div>`;
  document.getElementById('btn-apoiar-dup').addEventListener('click', () => {
    toast('Apoio registrado! 👥', 'success'); navegar('#historico');
  });
  document.getElementById('btn-nova-dup').addEventListener('click', () => { el.style.display = 'none'; });
}

async function toggleAudio() {
  const btn = document.getElementById('btn-gravar');
  const st  = document.getElementById('audio-st');
  if (!gravando) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRec = new MediaRecorder(stream);
      audioChunks = [];
      mediaRec.ondataavailable = e => audioChunks.push(e.data);
      mediaRec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        st.textContent = 'Transcrevendo…';
        try {
          const r = await Ocorrencias.transcreverAudio();
          RS.audioTranscricao = r.transcricao;
          const box = document.getElementById('audio-trans');
          box.style.display = 'block';
          box.innerHTML = `<p style="font-size:11px;font-weight:600;color:var(--g600);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Transcrição</p><p>"${r.transcricao}"</p>`;
          st.textContent = `✓ Gravado (${r.duracao_segundos}s)`;
          toast('Áudio transcrito ✓', 'success');
        } catch { st.textContent = '✓ Áudio gravado'; }
      };
      mediaRec.start(); gravando = true;
      btn.textContent = '⏹ Parar';
      btn.style.background = 'var(--vermelho)'; btn.style.color = 'white'; btn.style.borderColor = 'var(--vermelho)';
      let s = 0;
      const t = setInterval(() => { if (!gravando) { clearInterval(t); return; } s++; st.textContent = `● Gravando… ${s}s`; }, 1000);
      setTimeout(() => { if (gravando) toggleAudio(); }, 60000);
    } catch (e) { toast('Microfone indisponível: ' + e.message, 'error'); }
  } else {
    mediaRec?.stop(); gravando = false;
    btn.textContent = '🎙 Gravar';
    btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
  }
}

// ── Step 3: Classificação ──────────────────────────────────────────────────
function s3() {
  const cats = RS.categorias;
  document.getElementById('etapa-wrap').innerHTML = `
    <div class="etapa-card">
      <div class="etapa-body">
        <p class="etapa-kicker">Etapa 3</p>
        <h3 class="etapa-titulo">Qual é o problema?</h3>
        <p class="etapa-sub">Confirme ou corrija a categoria detectada pela IA</p>

        ${RS.categoriaNome ? `
        <div class="ia-sugestao-card">
          <span class="ia-logo">🤖</span>
          <div class="ia-sugestao-text">
            <strong>${RS.categoriaIcone} ${RS.categoriaNome}</strong>
            <span>sugestão da IA</span>
          </div>
          <span class="ia-confianca">${Math.round((RS.confiancaIa||0)*100)}%</span>
        </div>` : ''}

        <p class="section-title" style="margin-bottom:10px">Categoria</p>
        <div class="cats-grid" id="cats-grid">
          ${cats.map(c => `
            <div class="cat-chip ${RS.categoriaId===c.id?'selected':''}"
                 data-id="${c.id}" data-nome="${c.nome}" data-icone="${c.icone}">
              <span class="cat-icon">${c.icone}</span>
              <span class="cat-nome">${c.nome}</span>
            </div>`).join('')}
        </div>

        <div class="field-group" style="margin-top:20px">
          <label>Descrição <span class="required">*</span></label>
          <textarea id="desc" rows="4" minlength="10" maxlength="500"
            placeholder="Descreva o problema com detalhes…">${RS.audioTranscricao||RS.descricao||''}</textarea>
          <div class="char-counter"><span id="cc">0</span>/500</div>
        </div>
      </div>
      <div class="etapa-footer">
        <button class="btn btn-ghost" id="btn-back-s3">← Voltar</button>
        <button class="btn btn-primary" id="btn-s3">Próximo →</button>
      </div>
    </div>`;

  const ta = document.getElementById('desc');
  const cc = document.getElementById('cc');
  cc.textContent = ta.value.length;
  ta.addEventListener('input', () => { cc.textContent = ta.value.length; });

  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      RS.categoriaId   = parseInt(chip.dataset.id);
      RS.categoriaNome = chip.dataset.nome;
      RS.categoriaIcone = chip.dataset.icone;
    });
  });

  document.getElementById('btn-back-s3').addEventListener('click', () => renderStep(2));
  document.getElementById('btn-s3').addEventListener('click', () => {
    const desc = document.getElementById('desc').value.trim();
    if (!RS.categoriaId) { toast('Selecione uma categoria', 'error'); return; }
    if (desc.length < 10) { toast('Descrição deve ter pelo menos 10 caracteres', 'error'); return; }
    RS.descricao = desc;
    renderStep(4);
  });
}

// ── Step 4: Confirmação ────────────────────────────────────────────────────
function s4() {
  document.getElementById('etapa-wrap').innerHTML = `
    <div class="etapa-card">
      <div class="etapa-body">
        <p class="etapa-kicker">Etapa 4</p>
        <h3 class="etapa-titulo">Confirmar registro</h3>
        <p class="etapa-sub">Revise as informações antes de enviar</p>

        <div class="resumo-list">
          ${RS.imagemPreview ? `<img src="${RS.imagemPreview}" class="resumo-img" alt="Foto">` : ''}
          <div class="resumo-row">
            <span class="resumo-icon">📍</span>
            <div class="resumo-content">
              <p class="resumo-label">Localização</p>
              <p class="resumo-val">${RS.lat?.toFixed(5)}, ${RS.lng?.toFixed(5)}</p>
            </div>
          </div>
          <div class="resumo-row">
            <span class="resumo-icon">${RS.categoriaIcone||'📌'}</span>
            <div class="resumo-content">
              <p class="resumo-label">Categoria</p>
              <p class="resumo-val">${RS.categoriaNome}</p>
            </div>
          </div>
          <div class="resumo-row">
            <span class="resumo-icon">📝</span>
            <div class="resumo-content">
              <p class="resumo-label">Descrição</p>
              <p class="resumo-val">${RS.descricao}</p>
            </div>
          </div>
          ${RS.audioTranscricao ? `
          <div class="resumo-row">
            <span class="resumo-icon">🎙</span>
            <div class="resumo-content">
              <p class="resumo-label">Áudio</p>
              <p class="resumo-val" style="font-style:italic">"${RS.audioTranscricao.substring(0,80)}…"</p>
            </div>
          </div>` : ''}
          ${RS.confiancaIa ? `
          <div class="resumo-row">
            <span class="resumo-icon">🤖</span>
            <div class="resumo-content">
              <p class="resumo-label">Confiança da IA</p>
              <p class="resumo-val">${Math.round(RS.confiancaIa*100)}%</p>
            </div>
          </div>` : ''}
        </div>

        <div id="sucesso-box" style="display:none"></div>
      </div>
      <div class="etapa-footer" id="s4-footer">
        <button class="btn btn-ghost" id="btn-back-s4">← Voltar</button>
        <button class="btn btn-primary" id="btn-enviar">✓ Registrar</button>
      </div>
    </div>`;

  document.getElementById('btn-back-s4').addEventListener('click', () => renderStep(3));
  document.getElementById('btn-enviar').addEventListener('click', enviar);
}

async function enviar() {
  const btn = document.getElementById('btn-enviar');
  setBtnLoading(btn, true);
  try {
    const r = await Ocorrencias.criar({
      lat: RS.lat, lng: RS.lng,
      categoria_id: RS.categoriaId,
      categoria_nome: RS.categoriaNome,
      descricao: RS.descricao,
      imagem_base64: RS.imagemBase64,
      audio_transcricao: RS.audioTranscricao,
      confianca_ia: RS.confiancaIa
    });

    document.getElementById('s4-footer').style.display = 'none';
    document.querySelector('.etapa-body .resumo-list').style.display = 'none';
    document.querySelector('.etapa-sub').style.display = 'none';

    const box = document.getElementById('sucesso-box');
    box.style.display = 'block';
    box.innerHTML = `
      <div class="sucesso-wrap">
        <div class="sucesso-circle">✓</div>
        <h3>Ocorrência registrada!</h3>
        <p>Protocolo de acompanhamento:</p>
        <div class="protocolo-chip">${r.protocolo}</div>
        <p>Guarde este código para acompanhar o status da sua solicitação</p>
        <div class="sucesso-btns">
          <button class="btn btn-primary" onclick="navegar('#historico')">Ver histórico</button>
          <button class="btn btn-outline" onclick="navegar('#mapa')">Ver no mapa</button>
        </div>
      </div>`;

    toast('Registrado! ' + r.protocolo, 'success', 5000);
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
  setBtnLoading(btn, false);
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTÓRICO
// ═══════════════════════════════════════════════════════════════════════════
function vHistorico() {
  document.getElementById('app').innerHTML = `
    <div class="page-historico">
      <div class="page-header">
        <h2 class="page-title">Histórico</h2>
        <div class="status-pills">
          <button class="status-pill active" data-val="">Todas</button>
          <button class="status-pill" data-val="Aberta">Abertas</button>
          <button class="status-pill" data-val="Em Análise">Em análise</button>
          <button class="status-pill" data-val="Resolvida">Resolvidas</button>
        </div>
      </div>
      <div class="historico-lista" id="hist-lista">
        <div class="loading-msg"><span class="spinner spinner-g"></span> Carregando…</div>
      </div>
    </div>`;

  carregarHistorico();

  document.querySelectorAll('.status-pill').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.status-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      carregarHistorico(p.dataset.val || null);
    });
  });
}

async function carregarHistorico(status = null) {
  const lista = document.getElementById('hist-lista');
  if (!lista) return;
  lista.innerHTML = '<div class="loading-msg"><span class="spinner spinner-g"></span> Carregando…</div>';

  try {
    const res = await Ocorrencias.minhas(status);
    if (!res.ocorrencias?.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Nenhuma ocorrência encontrada</p>
          <button class="btn btn-primary" onclick="navegar('#registrar')">Registrar agora</button>
        </div>`;
      return;
    }

    lista.innerHTML = res.ocorrencias.map(oc => `
      <div class="hcard">
        <div class="hcard-top">
          <div class="hcard-icon-wrap">${getIcn(oc.categoria_nome)}</div>
          <div class="hcard-meta">
            <p class="hcard-cat">${oc.categoria_nome}</p>
            <p class="hcard-proto">${oc.protocolo}</p>
          </div>
          <div class="hcard-badge">
            <span class="badge badge-${slugSt(oc.status)}">${oc.status}</span>
          </div>
        </div>
        <p class="hcard-desc">${oc.descricao||''}</p>
        <div class="hcard-footer">
          <span class="hcard-footer-pill">📅 ${formatarDataCurta(oc.criado_em)}</span>
          ${oc.apoiadores>0?`<span class="hcard-footer-pill">👥 ${oc.apoiadores} apoiador${oc.apoiadores>1?'es':''}</span>`:''}
          <span style="flex:1"></span>
          ${oc.status==='Aberta'?`<button class="btn btn-sm btn-danger-ghost" onclick="cancelarOc('${oc.id}')">Cancelar</button>`:''}
        </div>
      </div>`).join('');
  } catch (e) {
    lista.innerHTML = `<div class="error-msg">Erro: ${e.message}</div>`;
  }
}

async function cancelarOc(id) {
  if (!confirm('Cancelar esta ocorrência?')) return;
  try { await Ocorrencias.cancelar(id); toast('Cancelada', 'success'); carregarHistorico(); }
  catch (e) { toast(e.message, 'error'); }
}

function slugSt(s) {
  return {'Aberta':'aberta','Em Análise':'analise','Em Andamento':'andamento',
          'Resolvida':'resolvida','Cancelada':'cancelada'}[s]||'default';
}
function getIcn(n) {
  return {'Buraco na Via':'🕳️','Lixo Irregular':'🗑️','Iluminação Defeituosa':'💡',
    'Calçada Danificada':'🚶','Árvore de Risco':'🌳','Esgoto a Céu Aberto':'💧',
    'Pichação/Vandalismo':'🎨','Sinalização Danificada':'🚦'}[n]||'📍';
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function vDashboard() {
  const u = getUsuario();
  document.getElementById('app').innerHTML = `
    <div class="page-dashboard">
      <div class="dash-header">
        <h2 class="page-title">Painel</h2>
        <div class="periodo-tabs">
          <button class="periodo-btn" data-d="7">7d</button>
          <button class="periodo-btn active" data-d="30">30d</button>
          <button class="periodo-btn" data-d="90">90d</button>
        </div>
      </div>

      <div class="usuario-strip">
        <div class="avatar">${(u?.nome||'U')[0].toUpperCase()}</div>
        <div class="usuario-strip-info">
          <strong>${u?.nome||'Usuário'}</strong>
          <span>${u?.email||''}</span>
        </div>
        <button class="btn btn-sm btn-ghost" style="padding:7px 12px;border-radius:100px;border:1.5px solid var(--bege3)"
          onclick="Auth.logout()">Sair</button>
      </div>

      <div id="dash-body">
        <div class="loading-msg"><span class="spinner spinner-g"></span> Carregando…</div>
      </div>
    </div>`;

  carregarDash(30);

  document.querySelectorAll('.periodo-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.periodo-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      carregarDash(parseInt(b.dataset.d));
    });
  });
}

async function carregarDash(dias) {
  const el = document.getElementById('dash-body');
  if (!el) return;
  el.innerHTML = '<div class="loading-msg"><span class="spinner spinner-g"></span></div>';

  try {
    const d = await Dashboard.resumo(dias);
    const st = d.contagem_status;
    const tot = st.Total || 1;

    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card stat-aberta">
          <p class="stat-num">${st.Abertas||0}</p>
          <p class="stat-label">Abertas</p>
        </div>
        <div class="stat-card stat-analise">
          <p class="stat-num">${st['Em Análise']||0}</p>
          <p class="stat-label">Em análise</p>
        </div>
        <div class="stat-card stat-andamento">
          <p class="stat-num">${st['Em Andamento']||0}</p>
          <p class="stat-label">Andamento</p>
        </div>
        <div class="stat-card stat-resolvida">
          <p class="stat-num">${st.Resolvidas||0}</p>
          <p class="stat-label">Resolvidas</p>
        </div>
      </div>

      <div class="metricas-row">
        <div class="metrica-box">
          <p class="metrica-val">${tot}</p>
          <p class="metrica-label">Total ${dias}d</p>
        </div>
        <div class="metrica-box">
          <p class="metrica-val">${d.taxa_resolucao_percentual}%</p>
          <p class="metrica-label">Resolução</p>
        </div>
        <div class="metrica-box">
          <p class="metrica-val">${d.tempo_medio_resolucao_horas}h</p>
          <p class="metrica-label">Tempo médio</p>
        </div>
        ${d.ocorrencias_prioritarias>0?`
        <div class="metrica-box metrica-alerta">
          <p class="metrica-val">${d.ocorrencias_prioritarias}</p>
          <p class="metrica-label">Prioritárias</p>
        </div>`:''}
      </div>

      <div class="secao-card">
        <h4>Por categoria</h4>
        ${renderBarras(d.por_categoria)}
      </div>

      <div class="secao-card">
        <h4>Ranking de bairros</h4>
        ${renderRanking(d.por_bairro)}
      </div>`;
  } catch (e) {
    el.innerHTML = `<div class="error-msg">Erro: ${e.message}</div>`;
  }
}

function renderBarras(cats) {
  if (!cats?.length) return '<p style="color:var(--ink4);font-size:13px">Sem dados</p>';
  const mx = Math.max(...cats.map(c => c.total), 1);
  return cats.sort((a,b)=>b.total-a.total).map(c => `
    <div class="barra-row">
      <span class="barra-label">${getIcn(c.categoria)} ${c.categoria}</span>
      <div class="barra-track"><div class="barra-fill" style="width:${(c.total/mx)*100}%"></div></div>
      <span class="barra-num">${c.total}</span>
    </div>`).join('');
}

function renderRanking(bairros) {
  if (!bairros?.length) return '<p style="color:var(--ink4);font-size:13px">Sem dados</p>';
  return bairros.slice(0,7).map((b,i) => `
    <div class="rank-item">
      <span class="rank-pos">${i+1}</span>
      <span class="rank-bairro">${b.bairro}</span>
      <span class="rank-num">${b.total} oc.</span>
    </div>`).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initRouter);
