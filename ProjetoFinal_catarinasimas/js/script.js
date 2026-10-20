
let topZ = 10;

// -----------------------------
// Icon position persistence
// -----------------------------
const ICON_POS_KEY = 'desktopIconPositions';
function saveIconPositions(map){ try{ localStorage.setItem(ICON_POS_KEY, JSON.stringify(map || {})); }catch(e){ console.warn('Could not save icon positions', e); } }
function loadIconPositions(){ try{ return JSON.parse(localStorage.getItem(ICON_POS_KEY) || '{}'); }catch(e){ return {}; } }

function restoreIconPositions(){
  const saved = loadIconPositions();
  document.querySelectorAll('.icon').forEach((icon, idx) => {
    if(!icon.id) icon.id = 'desktop-icon-' + idx;
    const p = saved[icon.id];
    if(p && typeof p.left !== 'undefined'){
      icon.style.left = p.left + 'px'; icon.style.top = p.top + 'px';
    } else {
      const dLeft = icon.getAttribute('data-left'); const dTop = icon.getAttribute('data-top');
      if(dLeft !== null) icon.style.left = dLeft + 'px';
      if(dTop !== null) icon.style.top = dTop + 'px';
    }
  });
}

// -----------------------------
// Authentication: register / login / forgot password
// -----------------------------
const USERS_KEY = 'users';
const PW_RESET_KEY = 'pwResetTokens';
const SESSION_KEY = 'currentUser';

async function hashPassword(password){
  try{
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){ return null; }
}

function loadUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }catch(e){ return []; } }
function saveUsers(u){ try{ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }catch(e){} }

function loadResetTokens(){ try{ return JSON.parse(localStorage.getItem(PW_RESET_KEY) || '{}'); }catch(e){ return {}; } }
function saveResetTokens(t){ try{ localStorage.setItem(PW_RESET_KEY, JSON.stringify(t)); }catch(e){} }

function saveSession(userObj, remember){
  if(remember) localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
}
function loadSession(){ return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null'); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); }

async function registerUser(username, email, password){
  const users = loadUsers();
  if(users.find(u=>u.username.toLowerCase()===username.toLowerCase())) throw new Error('Username already exists');
  if(users.find(u=>u.email && u.email.toLowerCase()===email.toLowerCase())) throw new Error('Email already registered');
  const pwHash = await hashPassword(password);
  const user = { username, email, passwordHash: pwHash, created: Date.now() };
  users.push(user); saveUsers(users); return user;
}

async function loginUser(username, password){
  const users = loadUsers();
  const u = users.find(x=>x.username.toLowerCase()===username.toLowerCase());
  if(!u) throw new Error('No such user');
  const h = await hashPassword(password);
  if(h !== u.passwordHash) throw new Error('Invalid password');
  return { username: u.username, email: u.email };
}

function generateToken(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }

// UI elements
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

function updateAuthUI(){
  const sess = loadSession();
  if(sess && sess.username){
    if(loginBtn) loginBtn.textContent = `Logout (${sess.username})`;
    if(registerBtn) registerBtn.style.display = 'none';
  } else {
    if(loginBtn) loginBtn.textContent = 'Login';
    if(registerBtn) registerBtn.style.display = 'inline-block';
  }
}
updateAuthUI();

// Wire taskbar buttons
if(loginBtn){
  loginBtn.addEventListener('click', ()=>{
    const s = loadSession();
    if(s && s.username){ // logout
      clearSession(); updateAuthUI();
    } else { openWindow('login-window','Login'); }
  });
}
if(registerBtn){ registerBtn.addEventListener('click', ()=> openWindow('register-window','Register')); }

// Login window wiring
const loginWindow = document.getElementById('login-window');
if(loginWindow){
  if(loginWindow.querySelector('.close-btn')) loginWindow.querySelector('.close-btn').addEventListener('click', ()=> { loginWindow.style.display='none'; const btn = document.getElementById('task-btn-login-window'); if(btn) btn.remove(); });
  if(loginWindow.querySelector('.min-btn')) loginWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(loginWindow,'login-window','Login'); loginWindow.style.display='none'; });
  makeDraggable(loginWindow);

  const lf = document.getElementById('login-form'); const lfFb = document.getElementById('login-feedback');
  const openRegisterFromLogin = document.getElementById('open-register-from-login');
  const openForgotFromLogin = document.getElementById('open-forgot-from-login');
  if(openRegisterFromLogin) openRegisterFromLogin.addEventListener('click', ()=> openWindow('register-window','Register'));
  if(openForgotFromLogin) openForgotFromLogin.addEventListener('click', ()=> openWindow('forgot-window','Forgot Password'));

  if(lf) lf.addEventListener('submit', async (e)=>{
    e.preventDefault(); lfFb.textContent = '';
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    const remember = !!document.getElementById('login-remember').checked;
    try{
      const user = await loginUser(u,p);
      saveSession(user, remember);
      lfFb.style.color = 'green'; lfFb.textContent = 'Logged in';
      updateAuthUI();
      setTimeout(()=>{ loginWindow.style.display='none'; const btn = document.getElementById('task-btn-login-window'); if(btn) btn.remove(); }, 500);
    }catch(err){ lfFb.style.color='#800'; lfFb.textContent = err.message || 'Login failed'; }
  });
}

// Register wiring
const registerWindow = document.getElementById('register-window');
if(registerWindow){
  if(registerWindow.querySelector('.close-btn')) registerWindow.querySelector('.close-btn').addEventListener('click', ()=> { registerWindow.style.display='none'; const btn = document.getElementById('task-btn-register-window'); if(btn) btn.remove(); });
  if(registerWindow.querySelector('.min-btn')) registerWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(registerWindow,'register-window','Register'); registerWindow.style.display='none'; });
  makeDraggable(registerWindow);

  const rf = document.getElementById('register-form'); const rfFb = document.getElementById('register-feedback'); const regCancel = document.getElementById('reg-cancel');
  if(regCancel) regCancel.addEventListener('click', ()=>{ registerWindow.style.display='none'; const btn = document.getElementById('task-btn-register-window'); if(btn) btn.remove(); });
  if(rf) rf.addEventListener('submit', async (e)=>{
    e.preventDefault(); rfFb.textContent='';
    const u = document.getElementById('reg-username').value.trim();
    const em = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-password').value; const c = document.getElementById('reg-password-confirm').value;
    if(!u || !em || !p){ rfFb.style.color='#800'; rfFb.textContent='All fields required'; return; }
    if(p !== c){ rfFb.style.color='#800'; rfFb.textContent='Passwords do not match'; return; }
    try{
      await registerUser(u, em, p);
      // auto-login and remember by default
      const sessionUser = { username: u, email: em };
      saveSession(sessionUser, true);
      rfFb.style.color='green'; rfFb.textContent='Account created and logged in'; updateAuthUI();
      setTimeout(()=>{ registerWindow.style.display='none'; const btn = document.getElementById('task-btn-register-window'); if(btn) btn.remove(); }, 700);
    }catch(err){ rfFb.style.color='#800'; rfFb.textContent = err.message || 'Registration failed'; }
  });
}

// Forgot password wiring
const forgotWindow = document.getElementById('forgot-window');
if(forgotWindow){
  if(forgotWindow.querySelector('.close-btn')) forgotWindow.querySelector('.close-btn').addEventListener('click', ()=> { forgotWindow.style.display='none'; const btn = document.getElementById('task-btn-forgot-window'); if(btn) btn.remove(); });
  if(forgotWindow.querySelector('.min-btn')) forgotWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(forgotWindow,'forgot-window','Forgot Password'); forgotWindow.style.display='none'; });
  makeDraggable(forgotWindow);

  const ff = document.getElementById('forgot-form'); const ffFb = document.getElementById('forgot-feedback'); const forgotCancel = document.getElementById('forgot-cancel');
  if(forgotCancel) forgotCancel.addEventListener('click', ()=>{ forgotWindow.style.display='none'; const btn = document.getElementById('task-btn-forgot-window'); if(btn) btn.remove(); });
  if(ff) ff.addEventListener('submit', (e)=>{
    e.preventDefault(); ffFb.textContent=''; const em = document.getElementById('forgot-email').value.trim(); if(!em){ ffFb.style.color='#800'; ffFb.textContent='Enter an email'; return; }
    const users = loadUsers(); const user = users.find(u=>u.email && u.email.toLowerCase() === em.toLowerCase());
    if(!user){ ffFb.style.color='#800'; ffFb.textContent='No account with that email'; return; }
    // generate token and store (simple)
    const token = generateToken(); const tokens = loadResetTokens(); tokens[token] = { username: user.username, created: Date.now() }; saveResetTokens(tokens);
    // since there's no email sending, show token and open reset window with token prefilled
    ffFb.style.color='green'; ffFb.textContent = `Reset token: ${token} (copy it to Reset window)`;
    // open reset window and prefill token
    setTimeout(()=>{ openWindow('reset-window','Reset Password'); document.getElementById('reset-token').value = token; }, 300);
  });
}

// Reset password wiring
const resetWindow = document.getElementById('reset-window');
if(resetWindow){
  if(resetWindow.querySelector('.close-btn')) resetWindow.querySelector('.close-btn').addEventListener('click', ()=> { resetWindow.style.display='none'; const btn = document.getElementById('task-btn-reset-window'); if(btn) btn.remove(); });
  if(resetWindow.querySelector('.min-btn')) resetWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(resetWindow,'reset-window','Reset Password'); resetWindow.style.display='none'; });
  makeDraggable(resetWindow);

  const rf2 = document.getElementById('reset-form'); const rf2Fb = document.getElementById('reset-feedback'); const resetCancel = document.getElementById('reset-cancel');
  if(resetCancel) resetCancel.addEventListener('click', ()=>{ resetWindow.style.display='none'; const btn = document.getElementById('task-btn-reset-window'); if(btn) btn.remove(); });
  if(rf2) rf2.addEventListener('submit', async (e)=>{
    e.preventDefault(); rf2Fb.textContent=''; const token = document.getElementById('reset-token').value.trim(); const p = document.getElementById('reset-password').value; const c = document.getElementById('reset-password-confirm').value;
    if(!token || !p){ rf2Fb.style.color='#800'; rf2Fb.textContent='Missing fields'; return; }
    if(p !== c){ rf2Fb.style.color='#800'; rf2Fb.textContent='Passwords do not match'; return; }
    const tokens = loadResetTokens(); const entry = tokens[token];
    if(!entry){ rf2Fb.style.color='#800'; rf2Fb.textContent='Invalid token'; return; }
    // perform reset
    const users = loadUsers(); const user = users.find(u=>u.username === entry.username);
    if(!user){ rf2Fb.style.color='#800'; rf2Fb.textContent='Account not found'; return; }
    user.passwordHash = await hashPassword(p); saveUsers(users);
    // consume token
    delete tokens[token]; saveResetTokens(tokens);
    rf2Fb.style.color='green'; rf2Fb.textContent='Password reset. You can now login.';
    setTimeout(()=>{ resetWindow.style.display='none'; const btn = document.getElementById('task-btn-reset-window'); if(btn) btn.remove(); }, 800);
  });
}

// ensure auth UI updates on load
updateAuthUI();

function persistIconPosition(icon){ const saved = loadIconPositions(); saved[icon.id] = { left: Math.round(icon.offsetLeft), top: Math.round(icon.offsetTop) }; saveIconPositions(saved); }

// -----------------------------
// Settings persistence & runtime
// -----------------------------
const SETTINGS_KEY = 'settings';
const DEFAULT_SETTINGS = {
  theme: 'classic', // classic | light | dark
  clock24: true,
  snapToGrid: true,
  gridSize: 110,
  iconSize: 'normal', // small | normal | large
  lockIcons: false,
  taskbarPosition: 'bottom', // bottom | left | right
  notificationsEnabled: false,
  soundEnabled: false,
  fontSize: 'normal' // small | normal | large
};

function loadSettings(){ try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS)); }catch(e){ return Object.assign({}, DEFAULT_SETTINGS); } }
function saveSettings(s){ try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }catch(e){ console.warn('Could not save settings', e); } }

let appSettings = loadSettings();

function applySettings(){
  // theme: only support 'dark' explicitly; default/classic has no theme class
  document.body.classList.remove('theme-dark');
  if(appSettings.theme === 'dark') document.body.classList.add('theme-dark');

  // clock format will be read by updateClock

  // grid/icon snapping
  // reinitialize icons (rebind/unbind) based on lockIcons & size
  document.querySelectorAll('.icon').forEach(icon => {
    // apply size class
    icon.classList.remove('small','large');
    if(appSettings.iconSize === 'small') icon.classList.add('small');
    if(appSettings.iconSize === 'large') icon.classList.add('large');

    // unbind existing hooks so we can rebind according to new settings
    if(icon._dragHooked){
      // remove existing handlers
      try{ if(icon._onPointerDown) icon.removeEventListener('pointerdown', icon._onPointerDown, { capture: true }); }catch(_){ }
      try{ if(icon._onPointerDownMouse) icon.removeEventListener('mousedown', icon._onPointerDownMouse, { capture: true }); }catch(_){ }
      icon._dragHooked = false;
    }
    // re-attach (if not locked)
    if(!appSettings.lockIcons) makeIconDraggable(icon);
  });

  // taskbar position
  document.body.classList.remove('taskbar-left','taskbar-right');
  if(appSettings.taskbarPosition === 'left') document.body.classList.add('taskbar-left');
  if(appSettings.taskbarPosition === 'right') document.body.classList.add('taskbar-right');

  // font size
  document.body.classList.remove('font-small','font-large');
  if(appSettings.fontSize === 'small') document.body.classList.add('font-small');
  if(appSettings.fontSize === 'large') document.body.classList.add('font-large');
}

// apply at startup
applySettings();

// small audio helper
function playBeep(){
  try{
    if(!appSettings || !appSettings.soundEnabled) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.06;
    o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
  }catch(e){ /* ignore */ }
}
// -----------------------------
// Windows dragging
// -----------------------------
function makeDraggable(win){
  const titlebar = win.querySelector('.popup-titlebar');
  if(!titlebar) return;
  let offsetX=0, offsetY=0, dragging=false;
  function onDown(e){ dragging = true; offsetX = e.clientX - win.offsetLeft; offsetY = e.clientY - win.offsetTop; win.style.zIndex = ++topZ; if(typeof setActiveTaskbarButtonFor === 'function') setActiveTaskbarButtonFor(win.id); win.dataset.userMoved = 'true'; }
  function onMove(e){ if(!dragging) return; win.style.left = (e.clientX - offsetX) + 'px'; win.style.top = (e.clientY - offsetY) + 'px'; }
  function onUp(){ dragging = false; }
  titlebar.addEventListener('mousedown', (e)=>{ onDown(e); document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', ()=>{ onUp(); document.removeEventListener('mousemove', onMove); }); });
}

// Keep a popup entirely visible in the viewport. If centerIfNotMoved is true and
// the user hasn't moved the window before, center it in the viewport.
function ensureWindowInViewport(win, centerIfNotMoved){
  if(!win) return;
  const margin = 12; // keep some breathing room
  // enforce max sizes first (in case CSS max changed)
  const maxW = Math.max(100, window.innerWidth - margin*2);
  const maxH = Math.max(80, window.innerHeight - margin*2);
  
  // Get actual rendered dimensions (important for auto-sized windows)
  const rect = win.getBoundingClientRect();
  let w = rect.width; let h = rect.height;
  
  // Only set explicit width/height if window exceeds viewport
  if(w > maxW){ win.style.width = (maxW) + 'px'; w = maxW; }
  if(h > maxH){ win.style.maxHeight = (maxH) + 'px'; h = maxH; }

  // Compute current left/top (fall back to 0 if not set)
  let left = win.offsetLeft || 0; let top = win.offsetTop || 0;

  // If requested, center windows that have not been moved by the user
  if(centerIfNotMoved && win.dataset.userMoved !== 'true'){
    left = Math.max(margin, Math.round((window.innerWidth - w)/2));
    top = Math.max(margin, Math.round((window.innerHeight - h)/2));
    win.style.left = left + 'px';
    win.style.top = top + 'px';
    return;
  }

  // Clamp to viewport so right/bottom edges are visible
  const maxLeft = Math.max(margin, window.innerWidth - w - margin);
  const maxTop = Math.max(margin, window.innerHeight - h - margin);
  if(left > maxLeft) left = maxLeft;
  if(top > maxTop) top = maxTop;
  if(left < margin) left = margin;
  if(top < margin) top = margin;
  win.style.left = left + 'px';
  win.style.top = top + 'px';
}

// -----------------------------
// Taskbar & windows management
// -----------------------------
const TASKBAR_ICON_MAP = {
  'expenses-window': 'icons_32x32/calculator.png',
  'habit-window': 'icons_32x32/notepad.png',
  'wellness-window': 'icons_32x32/calendar.png',
  'todo-window': 'icons_32x32/text_file.png',
  'calendar-window': 'icons_32x32/calendar.png'
  ,'settings-window': 'icons_32x32/tools.png'
  ,'contacts-window': 'icons_32x32/contacts.png'
  ,'about-window': 'icons_32x32/info.png'
  ,'pc-window': 'icons_32x32/this_computer.png'
  ,'email-window': 'icons_32x32/mail.png'
};

function addTaskbarButton(win, id, title){
  const bar = document.getElementById('taskbar-windows');
  if(!bar) return;
  if(document.getElementById('task-btn-' + id)) return;
  const btn = document.createElement('button'); btn.id = 'task-btn-' + id; btn.className = 'task-btn';
  const iconPath = TASKBAR_ICON_MAP[id] || 'icons_32x32/program.png'; btn.innerHTML = `<img src="${iconPath}" alt="${title}"><span class="label">${title}</span>`;
  btn.addEventListener('click', ()=>{
    const winEl = document.getElementById(id);
    if(!winEl) return;
    if(getComputedStyle(winEl).display === 'none'){
      winEl.style.display = 'block'; winEl.style.zIndex = ++topZ; document.querySelectorAll('#taskbar-windows .task-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    } else { winEl.style.display = 'none'; btn.classList.remove('active'); }
  });
  bar.appendChild(btn);
}

function setActiveTaskbarButtonFor(winId){ document.querySelectorAll('#taskbar-windows .task-btn').forEach(b=>b.classList.remove('active')); const btn = document.getElementById('task-btn-' + winId); if(btn) btn.classList.add('active'); }

// openWindow will open the window, add a taskbar button and broadcast an 'app-open' event
// when a window is opened, notify it so specific app logic can react
function openWindow(id, title){ const win = document.getElementById(id); if(!win) return; win.style.display = 'block'; win.style.zIndex = ++topZ; addTaskbarButton(win, id, title); if(typeof setActiveTaskbarButtonFor === 'function') setActiveTaskbarButtonFor(id); try{ win.dispatchEvent(new CustomEvent('app-open')); }catch(e){} }
function openWindow(id, title){ const win = document.getElementById(id); if(!win) return; win.style.display = 'block'; win.style.zIndex = ++topZ; addTaskbarButton(win, id, title); if(typeof setActiveTaskbarButtonFor === 'function') setActiveTaskbarButtonFor(id); try{ win.dispatchEvent(new CustomEvent('app-open')); }catch(e){} try{ ensureWindowInViewport(win, true); }catch(_){ } }

// -----------------------------
// Start menu wiring
// -----------------------------
const startButton = document.getElementById('start-button'); const startMenu = document.getElementById('start-menu');
startButton && startButton.addEventListener('click', () => { startMenu.style.display = startMenu.style.display === 'block' ? 'none' : 'block'; });
document.addEventListener('click', (e)=>{ if(startMenu && !startMenu.contains(e.target) && e.target !== startButton) startMenu.style.display = 'none'; });
// Bind start-menu buttons data-open -> openWindow
document.querySelectorAll('#start-menu button[data-open]').forEach(btn=>{ const target = btn.getAttribute('data-open'); const title = btn.getAttribute('data-title') || btn.textContent.trim(); btn.addEventListener('click', (e)=>{ openWindow(target, title); startMenu.style.display = 'none'; e.preventDefault(); }); });

// -----------------------------
// Expenses functionality
// -----------------------------
const expenseIcon = document.getElementById('expense-icon'); const expenseWindow = document.getElementById('expenses-window');
if(expenseIcon) expenseIcon.addEventListener('click', ()=> openWindow('expenses-window','Expenses'));
if(expenseWindow){
  const form = document.getElementById('expense-form'); const listEl = document.getElementById('expense-list'); const totalEl = document.getElementById('total-amount'); const filter = document.getElementById('filter-category'); let expenses = [];
  function loadExp(){ expenses = JSON.parse(localStorage.getItem('expenses') || '[]'); renderExp(); }
  function saveExp(){ localStorage.setItem('expenses', JSON.stringify(expenses)); }
  function renderExp(){ listEl.innerHTML = ''; const ft = filter.value || 'All'; const items = expenses.filter(e => ft === 'All' || e.category === ft); if(!items.length){ listEl.innerHTML = '<tr><td colspan="5">No expenses yet.</td></tr>'; totalEl.textContent = '0'; return; } let total=0; items.forEach(exp=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${exp.name}</td><td>$${Number(exp.amount).toFixed(2)}</td><td>${exp.category}</td><td>${exp.date}</td>`; const act = document.createElement('td'); const del = document.createElement('button'); del.textContent='Delete'; del.addEventListener('click', ()=>{ expenses = expenses.filter(x=>x.id !== exp.id); saveExp(); renderExp(); }); act.appendChild(del); tr.appendChild(act); listEl.appendChild(tr); total += Number(exp.amount || 0); }); totalEl.textContent = total.toFixed(2);
  }
  if(form){ form.addEventListener('submit', e=>{ e.preventDefault(); const name = document.getElementById('expense-name').value.trim(); const amount = parseFloat(document.getElementById('expense-amount').value); const category = document.getElementById('expense-category').value; const date = document.getElementById('expense-date').value || (new Date()).toISOString().slice(0,10); const newE = { id: Date.now(), name, amount, category, date }; expenses.unshift(newE); saveExp(); renderExp(); form.reset(); }); }
  if(filter) filter.addEventListener('change', renderExp);
  if(expenseWindow.querySelector('.close-btn')) expenseWindow.querySelector('.close-btn').addEventListener('click', ()=> { expenseWindow.style.display = 'none'; const btn = document.getElementById('task-btn-expenses-window'); if(btn) btn.remove(); });
  if(expenseWindow.querySelector('.min-btn')) expenseWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(expenseWindow,'expenses-window','Expenses'); expenseWindow.style.display='none'; });
  makeDraggable(expenseWindow); loadExp();
}

// -----------------------------
// Habits
// -----------------------------
const habitIcon = document.getElementById('habit-icon'); const habitWindow = document.getElementById('habit-window');
if(habitIcon) habitIcon.addEventListener('click', ()=> openWindow('habit-window','Habits'));
if(habitWindow){ const form = document.getElementById('habit-form'); const list = document.getElementById('habit-list'); const clearBtn = document.getElementById('clear-habits'); let habits = [];
  function loadHab(){ habits = JSON.parse(localStorage.getItem('habits') || '[]'); renderHab(); }
  function saveHab(){ localStorage.setItem('habits', JSON.stringify(habits)); }
  function renderHab(){ if(!habits.length){ list.classList.add('empty-state'); list.innerHTML='No habits yet — add one.'; return; } list.classList.remove('empty-state'); list.innerHTML=''; habits.forEach(h=>{ const li=document.createElement('li'); li.dataset.id = h.id; const left=document.createElement('div'); const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!h.done; cb.addEventListener('change', ()=>{ h.done = cb.checked; saveHab(); renderHab(); }); const title = document.createElement('span'); title.textContent = `${h.name} — ${h.frequency}`; if(h.done) title.style.textDecoration='line-through'; left.appendChild(cb); left.appendChild(title); const right = document.createElement('div'); const del = document.createElement('button'); del.textContent='Delete'; del.addEventListener('click', ()=>{ habits = habits.filter(x=>x.id!==h.id); saveHab(); renderHab(); }); right.appendChild(del); li.appendChild(left); li.appendChild(right); list.appendChild(li); }); }
  if(form) form.addEventListener('submit', e=>{ e.preventDefault(); const name = document.getElementById('habit-name').value.trim(); const frequency = document.getElementById('habit-frequency').value; if(!name) return; habits.push({ id: Date.now(), name, frequency, done:false }); saveHab(); renderHab(); form.reset(); });
  if(clearBtn) clearBtn.addEventListener('click', ()=>{ if(!confirm('Clear all habits?')) return; habits = []; saveHab(); renderHab(); });
  if(habitWindow.querySelector('.close-btn')) habitWindow.querySelector('.close-btn').addEventListener('click', ()=>{ habitWindow.style.display = 'none'; const btn = document.getElementById('task-btn-habit-window'); if(btn) btn.remove(); });
  if(habitWindow.querySelector('.min-btn')) habitWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(habitWindow,'habit-window','Habits'); habitWindow.style.display='none'; });
  makeDraggable(habitWindow); loadHab(); }

// -----------------------------
// Wellness logs
// -----------------------------
const wellnessIcon = document.getElementById('wellness-icon'); const wellnessWindow = document.getElementById('wellness-window');
if(wellnessIcon) wellnessIcon.addEventListener('click', ()=> openWindow('wellness-window','Wellness'));
if(wellnessWindow){ const form = document.getElementById('wellness-form'); const list = document.getElementById('wellness-list'); let logs = [];
  function loadWell(){ logs = JSON.parse(localStorage.getItem('wellnessLogs') || '[]'); renderWell(); }
  function saveWell(){ localStorage.setItem('wellnessLogs', JSON.stringify(logs)); }
  function renderWell(){ if(!logs.length){ list.classList.add('empty-state'); list.innerHTML='No wellness logs yet.'; return; } list.classList.remove('empty-state'); list.innerHTML=''; logs.forEach(w=>{ const li=document.createElement('li'); li.innerHTML = `<div><strong>${w.date}</strong> — ${w.mood} (${w.sleep}h)</div>`; const rm=document.createElement('button'); rm.textContent='Delete'; rm.addEventListener('click', ()=>{ logs = logs.filter(x=>x.id !== w.id); saveWell(); renderWell(); }); li.appendChild(rm); list.appendChild(li); }); }
  if(form) form.addEventListener('submit', e=>{ e.preventDefault(); const mood = document.getElementById('wellness-mood').value; const sleep = document.getElementById('wellness-sleep').value || 0; const date = document.getElementById('wellness-date').value || new Date().toISOString().slice(0,10); logs.unshift({ id: Date.now(), mood, sleep, date }); saveWell(); renderWell(); form.reset(); });
  if(wellnessWindow.querySelector('.close-btn')) wellnessWindow.querySelector('.close-btn').addEventListener('click', ()=>{ wellnessWindow.style.display='none'; const btn = document.getElementById('task-btn-wellness-window'); if(btn) btn.remove(); });
  if(wellnessWindow.querySelector('.min-btn')) wellnessWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(wellnessWindow,'wellness-window','Wellness'); wellnessWindow.style.display='none'; });
  makeDraggable(wellnessWindow); loadWell(); }

// -----------------------------
// To-Do
// -----------------------------
const todoIcon = document.getElementById('todo-icon'); const todoWindow = document.getElementById('todo-window');
if(todoIcon) todoIcon.addEventListener('click', ()=> openWindow('todo-window','To-Do'));
if(todoWindow){ const form = document.getElementById('todo-form'); const list = document.getElementById('todo-list'); const clearBtn = document.getElementById('clear-todos'); let todos = [];
  function loadTodos(){ todos = JSON.parse(localStorage.getItem('todos') || '[]'); renderTodos(); }
  function saveTodos(){ localStorage.setItem('todos', JSON.stringify(todos)); }
  function renderTodos(){ list.innerHTML=''; if(!todos.length){ list.classList.add('empty-state'); list.innerHTML = 'No tasks yet — add one.'; return; } list.classList.remove('empty-state'); todos.forEach(t=>{ const li=document.createElement('li'); li.dataset.id=t.id; const left=document.createElement('div'); left.className='left'; const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!t.done; cb.addEventListener('change', ()=>{ t.done = cb.checked; saveTodos(); renderTodos(); }); const title=document.createElement('span'); title.textContent = t.text; if(t.done) title.classList.add('todo-completed'); const meta=document.createElement('span'); meta.className='meta priority-badge ' + (t.priority || 'Normal'); meta.textContent = t.priority || 'Normal'; left.appendChild(cb); left.appendChild(title); left.appendChild(meta); const right=document.createElement('div'); const edit=document.createElement('button'); edit.className='todo-edit'; edit.textContent='Edit'; edit.addEventListener('click', ()=>{ const newText = prompt('Edit task', t.text); if(newText === null) return; t.text = newText.trim() || t.text; const newP = prompt('Priority (High/Normal/Low)', t.priority || 'Normal'); if(newP) t.priority = newP; saveTodos(); renderTodos(); }); const del=document.createElement('button'); del.textContent='Delete'; del.addEventListener('click', ()=>{ todos = todos.filter(x=>x.id !== t.id); saveTodos(); renderTodos(); }); right.appendChild(edit); right.appendChild(del); li.appendChild(left); li.appendChild(right); list.appendChild(li); }); }
  if(form) form.addEventListener('submit', e=>{ e.preventDefault(); const text = document.getElementById('todo-text').value.trim(); const priority = document.getElementById('todo-priority').value || 'Normal'; if(!text) return; todos.unshift({ id: Date.now(), text, priority, done: false }); saveTodos(); renderTodos(); form.reset(); });
  if(clearBtn) clearBtn.addEventListener('click', ()=>{ if(!confirm('Clear all tasks?')) return; todos=[]; saveTodos(); renderTodos(); });
  if(todoWindow.querySelector('.close-btn')) todoWindow.querySelector('.close-btn').addEventListener('click', ()=>{ todoWindow.style.display='none'; const btn = document.getElementById('task-btn-todo-window'); if(btn) btn.remove(); });
  if(todoWindow.querySelector('.min-btn')) todoWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(todoWindow,'todo-window','To-Do'); todoWindow.style.display='none'; });
  makeDraggable(todoWindow); loadTodos(); }

// -----------------------------
// Calendar / schedule
// -----------------------------
const calendarIcon = document.getElementById('calendar-icon'); const calendarWindow = document.getElementById('calendar-window');
if(calendarIcon) calendarIcon.addEventListener('click', ()=> openWindow('calendar-window','Schedule'));
if(calendarWindow){ const calGrid = document.getElementById('cal-grid'); const calMonthYear = document.getElementById('cal-month-year'); const calPrev = document.getElementById('cal-prev'); const calNext = document.getElementById('cal-next'); const eventForm = document.getElementById('event-form'); const eventListEl = document.getElementById('event-list'); let scheduleEvents = [];
  function loadSchedule(){ scheduleEvents = JSON.parse(localStorage.getItem('scheduleEvents') || '[]'); }
  function saveSchedule(){ localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents)); }
  let calendarState = { viewDate: new Date(), selectedDate: new Date() };
  function formatDateYMD(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

  function getEventsForDate(dateStr){ return scheduleEvents.filter(ev=>{ if(ev.repeatYearly){ return ev.date.slice(5) === dateStr.slice(5); } return ev.date === dateStr; }).sort((a,b)=> (a.time||'') > (b.time||'') ? 1 : -1); }

  function renderEventsForDate(dateStr){
    const list = getEventsForDate(dateStr);
    eventListEl.innerHTML = '';
    if(!list.length){
      eventListEl.classList.add('empty-state');
      eventListEl.innerHTML = 'No events for this date.';
      return;
    }
    eventListEl.classList.remove('empty-state');

    // show appointments with inline edit controls
    list.forEach(ev => {
      const li = document.createElement('div');
      li.className = 'appointment';
      li.dataset.id = ev.id;

      const info = document.createElement('div'); info.className = 'info';
      const titleEl = document.createElement('strong'); titleEl.textContent = ev.title;
      const metaEl = document.createElement('div'); metaEl.className = 'meta';
      metaEl.textContent = `${ev.time ? ev.time + ' • ' : ''}${ev.type}${ev.repeatYearly ? ' • (repeats)' : ''}`;
      info.appendChild(titleEl); info.appendChild(metaEl);

      const actions = document.createElement('div'); actions.className = 'actions';
      const editBtn = document.createElement('button'); editBtn.textContent = 'Edit';
      const delBtn = document.createElement('button'); delBtn.textContent = 'Delete';

      editBtn.addEventListener('click', () => {
        // inline edit form
        const form = document.createElement('div'); form.className = 'inline-edit';
        const tIn = document.createElement('input'); tIn.type='text'; tIn.value = ev.title; tIn.style.marginRight = '8px';
        const timeIn = document.createElement('input'); timeIn.type = 'time'; timeIn.value = ev.time || '';
        const typeSel = document.createElement('select');
        // Known types; include any stored type that may be new so the inline editor can show/save it
        const KNOWN_EVENT_TYPES = ['Appointment','Meeting','Birthday','Reminder'];
        const evtType = ev && ev.type ? String(ev.type) : '';
        const typesToShow = KNOWN_EVENT_TYPES.slice();
        if(evtType && !typesToShow.includes(evtType)) typesToShow.push(evtType);
        typesToShow.forEach(opt => {
          const o = document.createElement('option');
          o.value = o.textContent = opt;
          if(evtType === opt) o.selected = true;
          typeSel.appendChild(o);
        });
        const repeatLabel = document.createElement('label'); repeatLabel.style.marginLeft = '8px'; const ch = document.createElement('input'); ch.type = 'checkbox'; ch.checked = !!ev.repeatYearly; repeatLabel.appendChild(ch); repeatLabel.appendChild(document.createTextNode(' Repeat yearly'));

        const saveBtn = document.createElement('button'); saveBtn.textContent = 'Save';
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel';

        form.appendChild(tIn); form.appendChild(timeIn); form.appendChild(typeSel); form.appendChild(repeatLabel); form.appendChild(saveBtn); form.appendChild(cancelBtn);

        li.replaceChild(form, info);
        actions.style.display = 'none';

        saveBtn.addEventListener('click', ()=>{
          ev.title = tIn.value.trim() || ev.title;
          ev.time = timeIn.value || '';
          ev.type = typeSel.value;
          ev.repeatYearly = !!ch.checked;
          saveSchedule(); renderCalendar(); renderEventsForDate(dateStr);
        });

        cancelBtn.addEventListener('click', ()=>{ renderEventsForDate(dateStr); });
      });

      delBtn.addEventListener('click', ()=>{ scheduleEvents = scheduleEvents.filter(x=>x.id !== ev.id); saveSchedule(); renderCalendar(); renderEventsForDate(dateStr); });

      actions.appendChild(editBtn); actions.appendChild(delBtn);
      li.appendChild(info); li.appendChild(actions);
      eventListEl.appendChild(li);
    });
  }

  function renderCalendar(){
    const view = calendarState.viewDate;
    const year = view.getFullYear();
    const month = view.getMonth();

    // Force English month names regardless of browser locale
    calMonthYear.textContent = view.toLocaleString('en-US', { month:'long', year:'numeric' });

    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    calGrid.innerHTML = '';
    weekdays.forEach(w => { const el = document.createElement('div'); el.className = 'cal-weekday'; el.textContent = w; calGrid.appendChild(el); });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();

    // leading blank cells
    for(let i=0;i<firstDay;i++){ const blank = document.createElement('div'); blank.className = 'day blank'; calGrid.appendChild(blank); }

    for(let d=1; d<=daysInMonth; d++){
      const dayDate = new Date(year, month, d);
      const ds = formatDateYMD(dayDate);
      const day = document.createElement('div'); day.className = 'day'; day.dataset.date = ds;

      const dateEl = document.createElement('div'); dateEl.className = 'date'; dateEl.textContent = d; day.appendChild(dateEl);

      const eventsForDay = getEventsForDate(ds);
      if(eventsForDay.length) day.classList.add('has-event');

      const eventsBox = document.createElement('div'); eventsBox.className = 'events';
      eventsForDay.slice(0,3).forEach(ev => {
        const evEl = document.createElement('div'); evEl.className = 'event-chip ' + (ev.type || 'Appointment');
        evEl.textContent = ev.time ? (ev.time + ' ' + ev.title) : ev.title;
        eventsBox.appendChild(evEl);
      });
      day.appendChild(eventsBox);

      const today = new Date();
      if(dayDate.toDateString() === today.toDateString()) day.classList.add('today');

      if(calendarState.selectedDate && dayDate.toDateString() === calendarState.selectedDate.toDateString()){
        day.classList.add('selected');
      }

      day.addEventListener('click', ()=>{
        calendarState.selectedDate = dayDate;
        // keep the calendar view in sync and refresh events list
        renderCalendar();
        document.getElementById('event-date').value = formatDateYMD(dayDate);
        renderEventsForDate(formatDateYMD(dayDate));
      });

      calGrid.appendChild(day);
    }

    renderEventsForDate(formatDateYMD(calendarState.selectedDate));
  }

  if(calPrev) calPrev.addEventListener('click', ()=>{ calendarState.viewDate = new Date(calendarState.viewDate.getFullYear(), calendarState.viewDate.getMonth()-1, 1); renderCalendar(); });
  if(calNext) calNext.addEventListener('click', ()=>{ calendarState.viewDate = new Date(calendarState.viewDate.getFullYear(), calendarState.viewDate.getMonth()+1, 1); renderCalendar(); });
  if(eventForm) eventForm.addEventListener('submit', e=>{
    e.preventDefault();
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const type = document.getElementById('event-type').value;
    const repeatYear = document.getElementById('event-repeat-year').checked;
    if(!title || !date) return;
    const ev = { id: Date.now(), title, date, time, type, repeatYearly: !!repeatYear };
    scheduleEvents.unshift(ev);
    saveSchedule();
    renderCalendar();
    renderEventsForDate(date);
    // optional notification and sound feedback
    if(appSettings && appSettings.notificationsEnabled){
      try{
        if(window.Notification && Notification.permission === 'granted'){
          new Notification('HabitDesk — Event added', { body: `${ev.title} — ${ev.date} ${ev.time||''}` });
        } else if(window.Notification && Notification.permission !== 'denied'){
          Notification.requestPermission().then(p=>{ if(p === 'granted') new Notification('HabitDesk — Event added', { body: `${ev.title} — ${ev.date} ${ev.time||''}` }); });
        }
      }catch(_){ }
    }
    if(appSettings && appSettings.soundEnabled) playBeep();
    eventForm.reset();
  });
  if(calendarWindow.querySelector('.close-btn')) calendarWindow.querySelector('.close-btn').addEventListener('click', ()=>{ calendarWindow.style.display='none'; const btn = document.getElementById('task-btn-calendar-window'); if(btn) btn.remove(); });
  if(calendarWindow.querySelector('.min-btn')) calendarWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(calendarWindow,'calendar-window','Schedule'); calendarWindow.style.display='none'; });
  // make the calendar window draggable like the other app windows
  makeDraggable(calendarWindow);
  loadSchedule(); calendarState.viewDate = new Date(calendarState.selectedDate.getFullYear(), calendarState.selectedDate.getMonth(), 1); renderCalendar();

  // react to window open to focus on today's date and make sure selected date is visible
  calendarWindow.addEventListener('app-open', ()=>{
    calendarState.selectedDate = new Date();
    calendarState.viewDate = new Date(calendarState.selectedDate.getFullYear(), calendarState.selectedDate.getMonth(), 1);
    renderCalendar();
    if(document.getElementById('event-date')) document.getElementById('event-date').value = formatDateYMD(calendarState.selectedDate);
  });
}
  // react to window open to focus on today's date and make sure selected date is visible
  if(calendarWindow){
    calendarWindow.addEventListener('app-open', ()=>{
      calendarState.selectedDate = new Date();
      calendarState.viewDate = new Date(calendarState.selectedDate.getFullYear(), calendarState.selectedDate.getMonth(), 1);
      renderCalendar();
      if(document.getElementById('event-date')) document.getElementById('event-date').value = formatDateYMD(calendarState.selectedDate);
    });
  }

// -----------------------------
// Contacts - Developer Information (Static Display)
// -----------------------------
const contactsWindow = document.getElementById('contacts-window');

if(contactsWindow){
  // close & minimize
  if(contactsWindow.querySelector('.close-btn')) contactsWindow.querySelector('.close-btn').addEventListener('click', ()=> { contactsWindow.style.display='none'; const btn = document.getElementById('task-btn-contacts-window'); if(btn) btn.remove(); });
  if(contactsWindow.querySelector('.min-btn')) contactsWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(contactsWindow,'contacts-window','Developer Info'); contactsWindow.style.display='none'; });

  // draggable
  makeDraggable(contactsWindow);
}

// -----------------------------
// About window wiring
// -----------------------------
const aboutWindow = document.getElementById('about-window');
if(aboutWindow){
  // close & minimize
  if(aboutWindow.querySelector('.close-btn')) aboutWindow.querySelector('.close-btn').addEventListener('click', ()=> { aboutWindow.style.display='none'; const btn = document.getElementById('task-btn-about-window'); if(btn) btn.remove(); });
  if(aboutWindow.querySelector('.min-btn')) aboutWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(aboutWindow,'about-window','About HabitDesk'); aboutWindow.style.display='none'; });
  
  // draggable
  makeDraggable(aboutWindow);
  
  // Wire email link to open email form
  const emailLink = document.getElementById('email-link');
  if(emailLink){
    emailLink.addEventListener('click', (e)=>{
      e.preventDefault();
      openWindow('email-window', 'Send Email');
    });
  }
}

// -----------------------------
// Email Form window
// -----------------------------
const emailWindow = document.getElementById('email-window');
if(emailWindow){
  const emailForm = document.getElementById('email-form');
  const emailSubject = document.getElementById('email-subject');
  const emailMessage = document.getElementById('email-message');
  const emailCancel = document.getElementById('email-cancel');
  const emailFeedback = document.getElementById('email-feedback');
  
  if(emailForm){
    emailForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const subject = emailSubject.value.trim();
      const message = emailMessage.value.trim();
      
      if(!subject || !message){
        emailFeedback.textContent = 'Please fill in all fields';
        emailFeedback.style.color = '#800';
        return;
      }
      
      // Create mailto link and open in default email client
      const mailto = `mailto:catarinasimas23@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailto;
      
      // Show feedback
      emailFeedback.textContent = 'Opening your email client...';
      emailFeedback.style.color = '#080';
      
      // Reset form after short delay
      setTimeout(()=>{
        emailForm.reset();
        emailFeedback.textContent = '';
      }, 2000);
    });
  }
  
  if(emailCancel){
    emailCancel.addEventListener('click', ()=>{
      emailWindow.style.display = 'none';
      const btn = document.getElementById('task-btn-email-window');
      if(btn) btn.remove();
      emailForm.reset();
      emailFeedback.textContent = '';
    });
  }
  
  // close & minimize
  if(emailWindow.querySelector('.close-btn')) emailWindow.querySelector('.close-btn').addEventListener('click', ()=> { emailWindow.style.display='none'; const btn = document.getElementById('task-btn-email-window'); if(btn) btn.remove(); emailForm.reset(); emailFeedback.textContent = ''; });
  if(emailWindow.querySelector('.min-btn')) emailWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(emailWindow,'email-window','Send Email'); emailWindow.style.display='none'; });
  
  // draggable
  makeDraggable(emailWindow);
}

// -----------------------------
// This PC / User Profile window
// -----------------------------
const pcWindow = document.getElementById('pc-window');
const pcIcon = document.getElementById('pc-icon');

if(pcIcon) pcIcon.addEventListener('click', ()=> openWindow('pc-window','This PC - User Profile'));

if(pcWindow){
  function populateUserProfile(){
    // Get current user from session
    let currentUser = null;
    try{ currentUser = JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null'); }catch(e){}
    
    // Get contact info
    const contactInfo = loadContactInfo();
    
    // Populate user info
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const statusEl = document.getElementById('profile-status');
    const memberSinceEl = document.getElementById('profile-member-since');
    
    if(currentUser && currentUser.username){
      usernameEl.textContent = currentUser.username;
      emailEl.textContent = currentUser.email || 'No email';
      statusEl.textContent = 'Registered User';
      memberSinceEl.textContent = currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Unknown';
    } else {
      usernameEl.textContent = 'Guest User';
      emailEl.textContent = 'Not logged in';
      statusEl.textContent = 'Guest';
      memberSinceEl.textContent = '--';
    }
    
    // Populate contact info
    document.getElementById('profile-contact-name').textContent = contactInfo.name || 'Not set';
    document.getElementById('profile-contact-phone').textContent = contactInfo.phone || '--';
    document.getElementById('profile-contact-address').textContent = contactInfo.address || '--';
    
    // Populate statistics
    try{
      const habits = JSON.parse(localStorage.getItem('habits') || '[]');
      const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const wellness = JSON.parse(localStorage.getItem('wellnessLogs') || '[]');
      const todos = JSON.parse(localStorage.getItem('todos') || '[]');
      const events = JSON.parse(localStorage.getItem('scheduleEvents') || '[]');
      
      document.getElementById('profile-stat-habits').textContent = habits.length;
      document.getElementById('profile-stat-expenses').textContent = expenses.length;
      document.getElementById('profile-stat-wellness').textContent = wellness.length;
      document.getElementById('profile-stat-todos').textContent = todos.length;
      document.getElementById('profile-stat-events').textContent = events.length;
    }catch(e){
      console.warn('Could not load statistics', e);
    }
    
    // Calculate storage usage
    try{
      let totalSize = 0;
      for(let key in localStorage){
        if(localStorage.hasOwnProperty(key)){
          totalSize += localStorage[key].length + key.length;
        }
      }
      const sizeKB = (totalSize / 1024).toFixed(2);
      document.getElementById('profile-storage').textContent = sizeKB + ' KB';
    }catch(e){
      document.getElementById('profile-storage').textContent = 'Unable to calculate';
    }
  }
  
  // Populate when window opens
  pcWindow.addEventListener('app-open', populateUserProfile);
  
  // close & minimize
  if(pcWindow.querySelector('.close-btn')) pcWindow.querySelector('.close-btn').addEventListener('click', ()=> { pcWindow.style.display='none'; const btn = document.getElementById('task-btn-pc-window'); if(btn) btn.remove(); });
  if(pcWindow.querySelector('.min-btn')) pcWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(pcWindow,'pc-window','This PC'); pcWindow.style.display='none'; });
  
  // draggable
  makeDraggable(pcWindow);
}

// -----------------------------
// Settings window wiring
// -----------------------------
const settingsWindow = document.getElementById('settings-window');
if(settingsWindow){
  const settingsForm = document.getElementById('settings-form');
  function populateSettingsUI(){
    if(!settingsForm) return;
    document.getElementById('settings-theme').value = appSettings.theme || DEFAULT_SETTINGS.theme;
    document.getElementById('settings-clock').value = (appSettings.clock24 ? '24' : '12');
    document.getElementById('settings-snap').checked = !!appSettings.snapToGrid;
    document.getElementById('settings-grid-size').value = appSettings.gridSize || DEFAULT_SETTINGS.gridSize;
    document.getElementById('settings-icon-size').value = appSettings.iconSize || DEFAULT_SETTINGS.iconSize;
    document.getElementById('settings-lock-icons').checked = !!appSettings.lockIcons;
    document.getElementById('settings-taskbar-pos').value = appSettings.taskbarPosition || DEFAULT_SETTINGS.taskbarPosition;
    document.getElementById('settings-notifications').checked = !!appSettings.notificationsEnabled;
    document.getElementById('settings-sound').checked = !!appSettings.soundEnabled;
    document.getElementById('settings-font-size').value = appSettings.fontSize || DEFAULT_SETTINGS.fontSize;
  }

  // ensure UI refreshed when window opens
  settingsWindow.addEventListener('app-open', populateSettingsUI);

  if(settingsForm){
    populateSettingsUI();
    // apply changes immediately when controls change
    settingsForm.addEventListener('change', (e)=>{
      appSettings.theme = document.getElementById('settings-theme').value;
      appSettings.clock24 = document.getElementById('settings-clock').value === '24';
      appSettings.snapToGrid = !!document.getElementById('settings-snap').checked;
      appSettings.gridSize = Number(document.getElementById('settings-grid-size').value) || DEFAULT_SETTINGS.gridSize;
      appSettings.iconSize = document.getElementById('settings-icon-size').value;
      appSettings.lockIcons = !!document.getElementById('settings-lock-icons').checked;
      appSettings.taskbarPosition = document.getElementById('settings-taskbar-pos').value;
      appSettings.notificationsEnabled = !!document.getElementById('settings-notifications').checked;
      appSettings.soundEnabled = !!document.getElementById('settings-sound').checked;
      appSettings.fontSize = document.getElementById('settings-font-size').value;
      saveSettings(appSettings);
      applySettings();
    });

    settingsForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      // values already applied on change — also ensure saved
      saveSettings(appSettings);
      // give quick feedback
      if(appSettings.soundEnabled) playBeep();
    });

    const resetBtn = document.getElementById('settings-reset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      appSettings = Object.assign({}, DEFAULT_SETTINGS);
      saveSettings(appSettings);
      applySettings();
      populateSettingsUI();
    });
  }

  if(settingsWindow.querySelector('.close-btn')) settingsWindow.querySelector('.close-btn').addEventListener('click', ()=>{ settingsWindow.style.display='none'; const b = document.getElementById('task-btn-settings-window'); if(b) b.remove(); });
  if(settingsWindow.querySelector('.min-btn')) settingsWindow.querySelector('.min-btn').addEventListener('click', ()=>{ addTaskbarButton(settingsWindow,'settings-window','Settings'); settingsWindow.style.display='none'; });
  makeDraggable(settingsWindow);
  // ensure clock updates when settings change
  try{ if(typeof updateClock === 'function') updateClock(); }catch(_){ }
}

// -----------------------------
// Make desktop icons draggable and persistent (pointer events + capture)
// -----------------------------
function makeIconDraggable(icon){
  // Grid config (pixels) - read from settings
  const GRID_X = (appSettings && Number(appSettings.gridSize)) || 110; // horizontal snap spacing
  const GRID_Y = GRID_X; // square grid

  let startX = 0, startY = 0; // pointer start
  let offsetX = 0, offsetY = 0; // offset from pointer to top-left of icon when dragging
  let dragging = false, moved = false, activePointerId = null;
  let touchDetecting = false; // for touch, we detect movement threshold before starting drag
  const TOUCH_START_THRESHOLD = 8; // px

  function finishDrag(iconEl){
    // snap to grid when finishing drag (if enabled in settings)
    const left = Math.max(0, iconEl.offsetLeft);
    const top = Math.max(0, iconEl.offsetTop);
    if(appSettings && appSettings.snapToGrid){
      const snappedLeft = Math.round(left / GRID_X) * GRID_X;
      const snappedTop = Math.round(top / GRID_Y) * GRID_Y;
      iconEl.style.left = snappedLeft + 'px';
      iconEl.style.top = snappedTop + 'px';
    } else {
      iconEl.style.left = left + 'px';
      iconEl.style.top = top + 'px';
    }
    persistIconPosition(iconEl);
  }

  function startDrag(e){
    dragging = true; moved = false; activePointerId = e.pointerId;
    offsetX = e.clientX - icon.offsetLeft; offsetY = e.clientY - icon.offsetTop;
    icon.style.zIndex = ++topZ;
    try{ icon.setPointerCapture(activePointerId); }catch(_){ }
    icon.addEventListener('pointermove', onPointerMove);
    icon.addEventListener('pointerup', onPointerUp);
    icon.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerDown(e){
    // ignore right/middle buttons for mouse
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    startX = e.clientX; startY = e.clientY;

    // For mouse: start drag immediately
    if(e.pointerType === 'mouse'){
      startDrag(e);
      e.preventDefault();
      return;
    }

    // For touch/pen: begin detecting movement before starting an actual drag
    touchDetecting = true;
    activePointerId = e.pointerId;
    // attach a light move listener to detect threshold; use capture so we get moves first
    icon.addEventListener('pointermove', detectTouchMove, { capture: true });
    icon.addEventListener('pointerup', handlePointerUpDetect, { capture: true });
    icon.addEventListener('pointercancel', handlePointerUpDetect, { capture: true });
  }

  function detectTouchMove(e){
    if(!touchDetecting || e.pointerId !== activePointerId) return;
    const dx = Math.abs(e.clientX - startX); const dy = Math.abs(e.clientY - startY);
    if(dx >= TOUCH_START_THRESHOLD || dy >= TOUCH_START_THRESHOLD){
      // Move exceeded threshold — start dragging now
      icon.removeEventListener('pointermove', detectTouchMove, { capture: true });
      icon.removeEventListener('pointerup', handlePointerUpDetect, { capture: true });
      icon.removeEventListener('pointercancel', handlePointerUpDetect, { capture: true });
      // emulate starting drag with proper offset
      startDrag(e);
      e.preventDefault();
    }
  }

  function handlePointerUpDetect(e){
    // touch ended before move threshold -> allow click to proceed (do not start drag)
    touchDetecting = false; activePointerId = null;
    icon.removeEventListener('pointermove', detectTouchMove, { capture: true });
    icon.removeEventListener('pointerup', handlePointerUpDetect, { capture: true });
    icon.removeEventListener('pointercancel', handlePointerUpDetect, { capture: true });
  }

  function onPointerMove(e){ if(!dragging || e.pointerId !== activePointerId) return; const x = e.clientX - offsetX; const y = e.clientY - offsetY; icon.style.left = Math.max(0, x) + 'px'; icon.style.top = Math.max(0, y) + 'px'; moved = true; }

  function onPointerUp(e){ if(!dragging || e.pointerId !== activePointerId) return; dragging = false; activePointerId = null; // snap + persist
    if(moved) finishDrag(icon); try{ icon.releasePointerCapture(e.pointerId); }catch(_){ } icon.removeEventListener('pointermove', onPointerMove); icon.removeEventListener('pointerup', onPointerUp); icon.removeEventListener('pointercancel', onPointerUp); setTimeout(()=> moved = false, 10); }
  function onClick(e){ if(moved){ e.stopPropagation(); e.preventDefault(); } }
  // attach pointerdown/capture; fallback to mousedown if PointerEvent not supported
  // store references on icon so we can unbind later when settings change
  icon._onPointerDown = onPointerDown;
  icon._onPointerDownMouse = onPointerDown;
  if(window.PointerEvent){ icon.addEventListener('pointerdown', icon._onPointerDown, { capture: true }); } else { icon.addEventListener('mousedown', icon._onPointerDownMouse, { capture: true }); }
  icon._dragHooked = true;
  icon.addEventListener('click', onClick, true);
}

// bind icons (respecting lock icon setting) and restore
document.querySelectorAll('.icon').forEach(icon => { if(!appSettings.lockIcons && !icon._dragHooked) makeIconDraggable(icon); });
restoreIconPositions();

// -----------------------------
// Clock
// -----------------------------
function updateClock(){ const now = new Date(); const el = document.getElementById('clock'); if(!el) return; if(appSettings && !appSettings.clock24){ // 12-hour format
  let h = now.getHours(); const am = h < 12; h = h % 12 || 12; el.textContent = h.toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + (am ? ' AM' : ' PM');
 } else { el.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0'); } }
setInterval(updateClock, 1000); updateClock();

// -----------------------------
// Keyboard shortcuts
// -----------------------------
const WINDOW_SHORTCUTS = { 'Digit1': ['habit-window','Habits'], 'Digit2': ['wellness-window','Wellness'], 'Digit3': ['expenses-window','Expenses'], 'Digit4': ['todo-window','To-Do'] };
document.addEventListener('keydown', (e)=>{ if(!e.altKey || e.repeat) return; const entry = WINDOW_SHORTCUTS[e.code]; if(!entry) return; const [winId,title] = entry; const win = document.getElementById(winId); if(!win) return; if(getComputedStyle(win).display === 'none'){ openWindow(winId, title); } else { win.style.display = 'none'; const btn = document.getElementById('task-btn-' + winId); if(btn) btn.classList.remove('active'); } e.preventDefault(); });

// ensure Start menu buttons were bound at load (in case deferred load timing)
document.querySelectorAll('#start-menu button[data-open]').forEach(btn=>{ const target = btn.getAttribute('data-open'); const title = btn.getAttribute('data-title') || btn.textContent.trim(); if(!btn._hooked){ btn._hooked = true; btn.addEventListener('click', (e)=>{ openWindow(target, title); startMenu.style.display = 'none'; e.preventDefault(); }); } });

// Keep open popups inside viewport when the browser is resized
window.addEventListener('resize', ()=>{ document.querySelectorAll('.popup-window').forEach(w=>{ if(w.style.display !== 'none') try{ ensureWindowInViewport(w, false); }catch(_){ } }); });
