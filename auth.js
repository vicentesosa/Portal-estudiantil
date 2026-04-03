// ===== SUPABASE AUTH & SYNC =====
const SUPABASE_URL  = 'https://frvvdcluigfrfkfcvldz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydnZkY2x1aWdmcmZrZmN2bGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjU3NDcsImV4cCI6MjA5MDgwMTc0N30.8w9hl_Ar8EiPJxkiV9PtvgXgGb2QSxT7uD3lGfnFeFg';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Elementos del overlay ──
const authOverlay    = document.getElementById('authOverlay');
const authLoginPanel = document.getElementById('authLoginPanel');
const authRegPanel   = document.getElementById('authRegPanel');
const loginEmail     = document.getElementById('loginEmail');
const loginPass      = document.getElementById('loginPass');
const loginBtn       = document.getElementById('loginBtn');
const loginError     = document.getElementById('loginError');
const regEmail       = document.getElementById('regEmail');
const regPass        = document.getElementById('regPass');
const regPass2       = document.getElementById('regPass2');
const regBtn         = document.getElementById('regBtn');
const regError       = document.getElementById('regError');
const switchToReg    = document.getElementById('switchToReg');
const switchToLogin  = document.getElementById('switchToLogin');
const logoutBtn      = document.getElementById('logoutBtn');
const userEmailSpan  = document.getElementById('userEmailSpan');

// ── Sync con debounce ──
let syncTimer = null;
window.syncPortalData = function () {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const portalData = {
        materias:        JSON.parse(localStorage.getItem('materias')        || '[]'),
        portal_tareas:   JSON.parse(localStorage.getItem('portal_tareas')   || '[]'),
        portal_examenes: JSON.parse(localStorage.getItem('portal_examenes') || '[]'),
        portal_apuntes:  JSON.parse(localStorage.getItem('portal_apuntes')  || '{}'),
      };
      await sb.from('portal_data').upsert(
        { user_id: user.id, data: portalData, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch {}
  }, 900);
};

// ── Cargar datos del usuario desde Supabase ──
async function cargarDatosUsuario(userId) {
  const { data } = await sb.from('portal_data')
    .select('data')
    .eq('user_id', userId)
    .single();
  if (data?.data) {
    const d = data.data;
    if (d.materias)        localStorage.setItem('materias',        JSON.stringify(d.materias));
    if (d.portal_tareas)   localStorage.setItem('portal_tareas',   JSON.stringify(d.portal_tareas));
    if (d.portal_examenes) localStorage.setItem('portal_examenes', JSON.stringify(d.portal_examenes));
    if (d.portal_apuntes)  localStorage.setItem('portal_apuntes',  JSON.stringify(d.portal_apuntes));
  }
}

// ── Mostrar usuario en header ──
function mostrarUsuarioHeader(email) {
  if (userEmailSpan) userEmailSpan.textContent = email.split('@')[0];
  if (logoutBtn) logoutBtn.style.display = 'flex';
}

// ── Alternar entre login y registro ──
function mostrarLogin() {
  authLoginPanel.style.display = '';
  authRegPanel.style.display   = 'none';
  loginError.textContent = '';
  loginEmail.focus();
}
function mostrarRegistro() {
  authLoginPanel.style.display = 'none';
  authRegPanel.style.display   = '';
  regError.textContent = '';
  regEmail.focus();
}

switchToReg.addEventListener('click',   e => { e.preventDefault(); mostrarRegistro(); });
switchToLogin.addEventListener('click', e => { e.preventDefault(); mostrarLogin(); });

// ── Login ──
loginBtn.addEventListener('click', async () => {
  const email    = loginEmail.value.trim();
  const password = loginPass.value;
  if (!email || !password) { loginError.textContent = 'Completá todos los campos.'; return; }
  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';
  loginError.textContent = '';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'Email o contraseña incorrectos.';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
  }
  // Si es exitoso, onAuthStateChange maneja el redirect
});
loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });

// ── Registro ──
regBtn.addEventListener('click', async () => {
  const email = regEmail.value.trim();
  const pass  = regPass.value;
  const pass2 = regPass2.value;
  if (!email || !pass || !pass2) { regError.textContent = 'Completá todos los campos.'; return; }
  if (pass !== pass2)            { regError.textContent = 'Las contraseñas no coinciden.'; return; }
  if (pass.length < 6)           { regError.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
  regBtn.disabled = true;
  regBtn.textContent = 'Creando cuenta...';
  regError.textContent = '';
  const { error } = await sb.auth.signUp({ email, password: pass });
  if (error) {
    regError.textContent = 'No se pudo crear la cuenta. Intentá con otro email.';
    regBtn.disabled = false;
    regBtn.textContent = 'Crear cuenta';
  } else {
    regError.style.color = 'var(--green)';
    regError.textContent = '¡Cuenta creada! Revisá tu email para confirmar.';
    regBtn.disabled = false;
    regBtn.textContent = 'Crear cuenta';
  }
});
regPass2.addEventListener('keydown', e => { if (e.key === 'Enter') regBtn.click(); });

// ── Logout ──
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    sessionStorage.removeItem('portal_loaded');
    localStorage.clear();
    await sb.auth.signOut();
  });
}

// ── Escuchar cambios de auth ──
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    if (!sessionStorage.getItem('portal_loaded')) {
      await cargarDatosUsuario(session.user.id);
      sessionStorage.setItem('portal_loaded', '1');
      location.reload();
    } else {
      authOverlay.style.display = 'none';
      mostrarUsuarioHeader(session.user.email);
    }
  } else if (event === 'SIGNED_OUT') {
    sessionStorage.removeItem('portal_loaded');
    location.reload();
  }
});

// ── Inicializar: verificar sesión al cargar ──
(async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    if (!sessionStorage.getItem('portal_loaded')) {
      await cargarDatosUsuario(session.user.id);
      sessionStorage.setItem('portal_loaded', '1');
      location.reload();
    } else {
      authOverlay.style.display = 'none';
      mostrarUsuarioHeader(session.user.email);
    }
  } else {
    authOverlay.style.display = 'flex';
    mostrarLogin();
  }
})();
