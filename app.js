// ---------- FRASI MOTIVAZIONALI ----------
const QUOTES = [
  "Ogni giorno che spunti la casella, stai diventando la persona che vuoi essere.",
  "La costanza batte l'intensità. Un giorno alla volta.",
  "Non serve motivazione ogni giorno. Serve solo non rompere la catena.",
  "Piccoli passi ripetuti spostano montagne che uno scatto non muove.",
  "Oggi conta più di ieri. Sempre.",
  "La disciplina è la forma più concreta di rispetto verso te stesso.",
  "Non stai solo tracciando giorni. Stai costruendo chi diventi.",
  "Il progresso non si vede in un giorno. Si vede non mollando."
];

function pickQuote(){
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ---------- SPLASH ----------
const splash = document.getElementById('splash');
const app = document.getElementById('app');
document.getElementById('quoteText').textContent = pickQuote();

function dismissSplash(){
  splash.classList.add('hidden');
  app.classList.add('visible');
  if (typeof maybeShowMoodPrompt === 'function') maybeShowMoodPrompt();
}
splash.addEventListener('click', dismissSplash);
setTimeout(dismissSplash, 3200);

// ---------- HEADER ----------
function renderHeader(){
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : (hour < 18 ? 'Buon pomeriggio' : 'Buonasera');
  document.getElementById('greeting').textContent = greeting + ' Pietro';
  const dateStr = new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' });
  document.getElementById('today').textContent = dateStr;
}
renderHeader();

// ---------- NAVIGAZIONE ----------
function switchView(name){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const btn = document.querySelector('.nav-btn[data-view="' + name + '"]');
  if (btn) btn.classList.add('active');
  document.getElementById('view-' + name).classList.add('active');
  if (name === 'home' && typeof renderHomeStreaks === 'function'){
    renderHomeQuote();
    renderHomeStreaks();
    renderHomeAgenda();
    renderMoodSummary();
    if (typeof fetchWeather === 'function') fetchWeather();
  }
}
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> switchView(btn.dataset.view));
});

// ---------- STREAK: STORAGE ----------
const STORAGE_KEY = 'ember_goals_v1';

function loadGoals(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}
function saveGoals(goals){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

let goals = loadGoals();

// ---------- STREAK: LOGICA DATE ----------
function todayKey(d = new Date()){
  return d.toISOString().slice(0,10); // YYYY-MM-DD (ok per uso locale semplice)
}
function addDays(d, n){
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// Ritorna { current, best, doneToday, atRisk }
function computeStreak(checkins){
  const set = new Set(checkins);
  const today = new Date();
  const doneToday = set.has(todayKey(today));

  // streak corrente: parte da oggi se fatto, altrimenti da ieri (streak ancora viva ma a rischio)
  let current = 0;
  let cursor = doneToday ? today : addDays(today, -1);
  if (doneToday) { current = 1; cursor = addDays(today, -1); }
  while (set.has(todayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const atRisk = !doneToday && current > 0;

  // best streak storico
  const sortedDates = [...set].sort();
  let best = 0, run = 0, prev = null;
  for (const ds of sortedDates){
    if (prev){
      const diff = (new Date(ds) - new Date(prev)) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = ds;
  }
  best = Math.max(best, current);

  return { current, best, doneToday, atRisk };
}

// ---------- STREAK: RENDER ----------
function flameSVG(lit){
  const color = lit ? 'var(--ember)' : 'var(--surface-2)';
  const stroke = lit ? 'none' : '1.5';
  return `<svg viewBox="0 0 24 24" fill="${color}" ${lit ? '' : `stroke="var(--border)" stroke-width="${stroke}" fill-opacity="0.15"`}>
    <path d="M12 2C12 2 6 9 6 14a6 6 0 0 0 12 0c0-2-1-3.5-2-5 0 2-1 3-2 3-1.5 0-1.5-2-1.5-3.5C12.5 6 12 2 12 2Z"/>
  </svg>`;
}

function heatmapHTML(checkins){
  const set = new Set(checkins);
  const todayStr = todayKey();
  let cells = '';
  for (let i = 29; i >= 0; i--){
    const key = todayKey(addDays(new Date(), -i));
    const isActive = set.has(key);
    const isToday = key === todayStr;
    cells += `<div class="heatmap-cell ${isActive ? 'active' : ''} ${isToday ? 'today-cell' : ''}"></div>`;
  }
  return `<div class="heatmap">${cells}</div>`;
}

function renderGoals(){
  const list = document.getElementById('goalsList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';

  if (goals.length === 0){
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  goals.forEach(goal=>{
    const s = computeStreak(goal.checkins);
    const card = document.createElement('div');
    card.className = 'goal-card';

    const metaText = s.current === 0
      ? 'Inizia oggi la tua streak'
      : `Streak: ${s.current} giorn${s.current === 1 ? 'o' : 'i'} · Record: ${s.best}`;

    card.innerHTML = `
      <div class="goal-top">
        <div class="flame">
          ${flameSVG(s.current > 0)}
          <div class="flame-badge"><span class="count" style="color:${s.current > 0 ? 'var(--ember)' : 'var(--text-dim)'}">${s.current}</span></div>
        </div>
        <div class="goal-info">
          <div class="name">${goal.name}</div>
          <div class="meta ${s.atRisk ? 'risk' : ''}">${s.atRisk ? 'A rischio: segna oggi per non perderla' : metaText}</div>
        </div>
        <div class="goal-actions">
          <button class="check-btn ${s.doneToday ? 'done' : ''}" data-id="${goal.id}" title="Segna oggi">
            ${s.doneToday ? '✓' : ''}
          </button>
          <button class="del-btn" data-id="${goal.id}">Elimina</button>
        </div>
      </div>
      ${heatmapHTML(goal.checkins)}
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.check-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> toggleToday(btn.dataset.id));
  });
  list.querySelectorAll('.del-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteGoal(btn.dataset.id));
  });
}

function toggleToday(id){
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  const key = todayKey();
  const idx = goal.checkins.indexOf(key);
  if (idx === -1) goal.checkins.push(key);
  else goal.checkins.splice(idx, 1);
  saveGoals(goals);
  renderGoals();
  if (typeof renderHomeStreaks === 'function') renderHomeStreaks();
}

function deleteGoal(id){
  goals = goals.filter(g => g.id !== id);
  saveGoals(goals);
  renderGoals();
}

function addGoal(name){
  const trimmed = name.trim();
  if (!trimmed) return;
  goals.push({ id: Date.now().toString(36), name: trimmed, checkins: [] });
  saveGoals(goals);
  renderGoals();
}

// ---------- STREAK: FORM ----------
const goalInput = document.getElementById('goalInput');
document.getElementById('addGoalBtn').addEventListener('click', ()=>{
  addGoal(goalInput.value);
  goalInput.value = '';
});
goalInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){
    addGoal(goalInput.value);
    goalInput.value = '';
  }
});

renderGoals();

// ---------- AGENDA: STORAGE ----------
const APPT_KEY = 'ember_appts_v1';

function loadAppts(){
  try{
    const raw = localStorage.getItem(APPT_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}
function saveAppts(data){
  localStorage.setItem(APPT_KEY, JSON.stringify(data));
}

let appts = loadAppts();
let calDate = new Date(); // mese visualizzato
let selectedDate = todayKey();

const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

function dateKey(y, m, d){
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function renderCalendar(){
  const y = calDate.getFullYear();
  const m = calDate.getMonth();
  document.getElementById('calTitle').textContent = `${MONTHS_IT[m]} ${y}`;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lunedì = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = todayKey();

  for (let i = 0; i < startOffset; i++){
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++){
    const key = dateKey(y, m, d);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (key === todayStr) cell.classList.add('today');
    if (key === selectedDate) cell.classList.add('selected');

    const hasAppts = appts[key] && appts[key].length > 0;
    cell.innerHTML = `${d}${hasAppts ? '<span class="dot"></span>' : ''}`;
    cell.addEventListener('click', ()=>{
      selectedDate = key;
      renderCalendar();
      renderAppts();
    });
    grid.appendChild(cell);
  }
}

function formatSelectedDate(){
  const d = new Date(selectedDate + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' });
}

function renderAppts(){
  document.getElementById('dayPanelTitle').textContent = formatSelectedDate();
  const list = document.getElementById('apptList');
  list.innerHTML = '';

  const dayAppts = (appts[selectedDate] || []).slice().sort((a,b)=> a.time.localeCompare(b.time));

  if (dayAppts.length === 0){
    list.innerHTML = '<div class="empty-day">Nessun appuntamento per questo giorno.</div>';
    return;
  }

  dayAppts.forEach(appt=>{
    const row = document.createElement('div');
    row.className = 'appt-row';
    row.innerHTML = `
      <div class="time">${appt.time || '--:--'}</div>
      <div class="title">${appt.title}</div>
      <button class="del-btn" data-id="${appt.id}">Elimina</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.del-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      appts[selectedDate] = appts[selectedDate].filter(a => a.id !== btn.dataset.id);
      saveAppts(appts);
      renderAppts();
      renderCalendar();
    });
  });
}

function addAppt(){
  const titleInput = document.getElementById('apptTitle');
  const timeInput = document.getElementById('apptTime');
  const title = titleInput.value.trim();
  if (!title) return;
  const time = timeInput.value || '';

  if (!appts[selectedDate]) appts[selectedDate] = [];
  appts[selectedDate].push({ id: Date.now().toString(36), title, time });
  saveAppts(appts);
  titleInput.value = '';
  timeInput.value = '';
  renderAppts();
  renderCalendar();
}

document.getElementById('addApptBtn').addEventListener('click', addAppt);
document.getElementById('apptTitle').addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') addAppt();
});

document.getElementById('calPrev').addEventListener('click', ()=>{
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', ()=>{
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
});

renderCalendar();
renderAppts();

// ---------- FITNESS: SCHEDA (dati fissi dalla scheda di Pietro) ----------
const WORKOUT_PLAN = {
  lunedi: { label:'Upper A', exercises:[
    { id:'lun_1', name:'Panca piana (bilanciere o manubri)', sets:'4 x 6-8', rec:'2 min' },
    { id:'lun_2', name:'Trazioni alla sbarra o lat machine', sets:'4 x 8-10', rec:'2 min' },
    { id:'lun_3', name:'Military press manubri', sets:'3 x 8-10', rec:'90 sec' },
    { id:'lun_4', name:'Rematore bilanciere o manubrio', sets:'3 x 8-10', rec:'90 sec' },
    { id:'lun_5', name:'Croci ai cavi o manubri', sets:'3 x 12-15', rec:'60 sec' },
    { id:'lun_6', name:'Curl bicipiti manubri', sets:'3 x 10-12', rec:'60 sec' },
    { id:'lun_7', name:'Push down tricipiti ai cavi', sets:'3 x 10-12', rec:'60 sec' }
  ]},
  martedi: { label:'Lower A', exercises:[
    { id:'mar_1', name:'Leg press (o hip thrust con bilanciere)', sets:'4 x 8-10', rec:'2 min' },
    { id:'mar_2', name:'Stacco rumeno (RDL)', sets:'3 x 8-10', rec:'2 min' },
    { id:'mar_3', name:'Leg extension, carico leggero-moderato', sets:'3 x 12-15', rec:'60 sec' },
    { id:'mar_4', name:'Affondi con manubri', sets:'3 x 10 per gamba', rec:'90 sec' },
    { id:'mar_5', name:'Leg curl o ponte glutei', sets:'3 x 12-15', rec:'60 sec' },
    { id:'mar_6', name:'Calf raise in piedi', sets:'4 x 15-20', rec:'45 sec' },
    { id:'mar_7', name:'Plank', sets:'3 x max', rec:'45 sec' }
  ]},
  giovedi: { label:'Upper B', exercises:[
    { id:'gio_1', name:'Panca inclinata con manubri', sets:'4 x 8-10', rec:'90 sec' },
    { id:'gio_2', name:'Trazioni presa larga (o lat machine)', sets:'4 x 8-10', rec:'90 sec' },
    { id:'gio_3', name:'Arnold press o military press', sets:'3 x 10-12', rec:'90 sec' },
    { id:'gio_4', name:'Rematore manubrio monolaterale', sets:'3 x 10-12', rec:'90 sec' },
    { id:'gio_5', name:'Alzate laterali', sets:'3 x 12-15', rec:'60 sec' },
    { id:'gio_6', name:'Curl bicipiti bilanciere', sets:'3 x 10-12', rec:'60 sec' },
    { id:'gio_7', name:'Dip su panca o French press', sets:'3 x 10-12', rec:'60 sec' }
  ]},
  venerdi: { label:'Lower B', exercises:[
    { id:'ven_1', name:'Stacco da terra', sets:'4 x 5-6', rec:'2-3 min' },
    { id:'ven_2', name:'Step-up su gradino basso', sets:'3 x 10 per gamba', rec:'90 sec' },
    { id:'ven_3', name:'Leg extension (o affondi camminati)', sets:'3 x 12-15', rec:'60 sec' },
    { id:'ven_4', name:'Hip thrust o ponte glutei con bilanciere', sets:'3 x 10-12', rec:'90 sec' },
    { id:'ven_5', name:'Calf raise seduto o in piedi', sets:'4 x 15-20', rec:'45 sec' },
    { id:'ven_6', name:'Addome (crunch o ai cavi)', sets:'3 x 15', rec:'45 sec' }
  ]}
};
const WORKOUT_DAYS_ORDER = ['lunedi','martedi','giovedi','venerdi'];
const WORKOUT_DAY_LABELS = { lunedi:'Lun', martedi:'Mar', giovedi:'Gio', venerdi:'Ven' };
const JS_WEEKDAY_TO_PLAN = { 1:'lunedi', 2:'martedi', 4:'giovedi', 5:'venerdi' };

const WORKOUT_LOG_KEY = 'ember_workout_v1';

function loadWorkoutLogs(){
  try{
    const raw = localStorage.getItem(WORKOUT_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveWorkoutLogs(data){
  localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(data));
}

let workoutLogs = loadWorkoutLogs();
let selectedWorkoutDay = JS_WEEKDAY_TO_PLAN[new Date().getDay()] || 'lunedi';

function renderWorkoutDayRow(){
  const row = document.getElementById('workoutDayRow');
  row.innerHTML = '';
  const todayPlanDay = JS_WEEKDAY_TO_PLAN[new Date().getDay()];

  WORKOUT_DAYS_ORDER.forEach(day=>{
    const pill = document.createElement('div');
    pill.className = 'weekday-pill';
    if (day === todayPlanDay) pill.classList.add('today');
    if (day === selectedWorkoutDay) pill.classList.add('selected');
    pill.textContent = WORKOUT_DAY_LABELS[day];
    pill.addEventListener('click', ()=>{
      selectedWorkoutDay = day;
      renderWorkoutDayRow();
      renderExerciseList();
    });
    row.appendChild(pill);
  });
}

// trova l'ultimo peso registrato per un esercizio, in una data precedente a oggi
function getPreviousWeight(exerciseId){
  const todayStr = todayKey();
  const dates = Object.keys(workoutLogs)
    .filter(d => d !== todayStr && workoutLogs[d].weights && workoutLogs[d].weights[exerciseId] != null)
    .sort()
    .reverse();
  if (dates.length === 0) return null;
  return { date: dates[0], weight: workoutLogs[dates[0]].weights[exerciseId] };
}

function renderExerciseList(){
  const plan = WORKOUT_PLAN[selectedWorkoutDay];
  document.getElementById('workoutDayLabel').textContent = plan.label;

  const container = document.getElementById('exerciseList');
  container.innerHTML = '';

  const todayEntry = workoutLogs[todayKey()];
  const todayWeights = (todayEntry && todayEntry.day === selectedWorkoutDay) ? todayEntry.weights : {};

  plan.exercises.forEach(ex=>{
    const prev = getPreviousWeight(ex.id);
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.innerHTML = `
      <div class="exercise-name">${ex.name}</div>
      <div class="exercise-meta">${ex.sets} · rec. ${ex.rec}</div>
      <div class="exercise-input-wrap">
        <input type="number" class="exercise-weight-input" step="0.5" placeholder="kg" data-id="${ex.id}" value="${todayWeights[ex.id] != null ? todayWeights[ex.id] : ''}">
        <div class="exercise-prev">${prev ? `Sett. scorsa: ${prev.weight}kg` : 'Nessun dato precedente'}</div>
      </div>
    `;
    container.appendChild(row);
  });
}

function saveWorkoutToday(){
  const inputs = document.querySelectorAll('.exercise-weight-input');
  const weights = {};
  inputs.forEach(inp=>{
    if (inp.value !== '') weights[inp.dataset.id] = parseFloat(inp.value);
  });
  workoutLogs[todayKey()] = { day: selectedWorkoutDay, weights };
  saveWorkoutLogs(workoutLogs);
  renderExerciseList();
}

document.getElementById('saveWorkoutBtn').addEventListener('click', saveWorkoutToday);

renderWorkoutDayRow();
renderExerciseList();

// ---------- FITNESS: PESO CORPOREO ----------
const WEIGHT_KEY = 'ember_weight_v1';

function loadWeights(){
  try{
    const raw = localStorage.getItem(WEIGHT_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveWeights(data){
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(data));
}

let weights = loadWeights();

function renderWeightValue(){
  const dates = Object.keys(weights).sort().reverse();
  const el = document.getElementById('weightValue');
  if (dates.length === 0){
    el.innerHTML = '-- <span class="unit">kg</span>';
    return;
  }
  el.innerHTML = `${weights[dates[0]]} <span class="unit">kg</span>`;
}

function saveWeightToday(){
  const input = document.getElementById('weightInput');
  const val = parseFloat(input.value);
  if (isNaN(val)) return;
  weights[todayKey()] = val;
  saveWeights(weights);
  input.value = '';
  renderWeightValue();
}

document.getElementById('saveWeightBtn').addEventListener('click', saveWeightToday);
renderWeightValue();

// ---------- FITNESS: STORICO PESO ----------
let weightCalDate = new Date();

function renderWeightCalendar(){
  const y = weightCalDate.getFullYear();
  const m = weightCalDate.getMonth();
  document.getElementById('weightCalTitle').textContent = `${MONTHS_IT[m]} ${y}`;

  const grid = document.getElementById('weightCalGrid');
  grid.innerHTML = '';

  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = todayKey();

  for (let i = 0; i < startOffset; i++){
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++){
    const key = dateKey(y, m, d);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (key === todayStr) cell.classList.add('today');

    const w = weights[key];
    cell.innerHTML = `<span class="cal-daynum">${d}</span>${w != null ? `<span class="weight-cell">${w}</span>` : ''}`;
    grid.appendChild(cell);
  }
}

document.getElementById('openWeightHistory').addEventListener('click', ()=>{
  weightCalDate = new Date();
  renderWeightCalendar();
  document.getElementById('weightHistoryOverlay').classList.add('visible');
});
document.getElementById('closeWeightHistory').addEventListener('click', ()=>{
  document.getElementById('weightHistoryOverlay').classList.remove('visible');
});
document.getElementById('weightHistoryOverlay').addEventListener('click', (e)=>{
  if (e.target.id === 'weightHistoryOverlay'){
    document.getElementById('weightHistoryOverlay').classList.remove('visible');
  }
});
document.getElementById('weightCalPrev').addEventListener('click', ()=>{
  weightCalDate.setMonth(weightCalDate.getMonth() - 1);
  renderWeightCalendar();
});
document.getElementById('weightCalNext').addEventListener('click', ()=>{
  weightCalDate.setMonth(weightCalDate.getMonth() + 1);
  renderWeightCalendar();
});

// ---------- HOME ----------

// frasi motivazionali della Home, una al giorno (deterministica, non casuale ad ogni apertura)
const HOME_QUOTES = [
  "Oggi costruisci il Pietro di domani.",
  "La disciplina batte la motivazione.",
  "Un giorno alla volta, un sistema alla volta.",
  "Piccole azioni, ripetute, cambiano tutto.",
  "Non serve sentirsi pronti. Serve iniziare.",
  "Chi organizza la giornata, organizza la vita.",
  "La costanza è la vera scorciatoia."
];

function dailyIndex(dateStr, len){
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash += dateStr.charCodeAt(i);
  return hash % len;
}

function renderHomeQuote(){
  const idx = dailyIndex(todayKey(), HOME_QUOTES.length);
  document.getElementById('homeQuote').textContent = HOME_QUOTES[idx];
}

// ---------- HOME: STREAK IN EVIDENZA ----------
function renderHomeStreaks(){
  const container = document.getElementById('homeStreaks');
  if (!container) return;
  container.innerHTML = '';

  const top = goals
    .map(g => ({ goal: g, stats: computeStreak(g.checkins) }))
    .sort((a, b) => b.stats.current - a.stats.current)
    .slice(0, 3);

  if (top.length === 0){
    container.innerHTML = '<div class="empty-day">Aggiungi un obiettivo nella sezione Streak per vederlo qui.</div>';
    return;
  }

  top.forEach(({ goal, stats })=>{
    const pct = stats.best > 0 ? Math.min(100, Math.round((stats.current / stats.best) * 100)) : (stats.current > 0 ? 100 : 0);
    const card = document.createElement('div');
    card.className = 'highlight-card home-card';
    card.innerHTML = `
      <div class="flame">
        ${flameSVG(stats.current > 0)}
        <div class="flame-badge"><span class="count" style="color:${stats.current > 0 ? 'var(--ember)' : 'var(--text-dim)'}">${stats.current}</span></div>
      </div>
      <div class="highlight-info">
        <div class="name">${goal.name}</div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <button class="quick-check ${stats.doneToday ? 'done' : ''}" data-id="${goal.id}">${stats.doneToday ? '✓' : ''}</button>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.quick-check').forEach(btn=>{
    btn.addEventListener('click', ()=> toggleToday(btn.dataset.id));
  });
}

document.getElementById('goToStreak').addEventListener('click', ()=> switchView('streak'));

// ---------- HOME: AGENDA DI OGGI ----------
function renderHomeAgenda(){
  const container = document.getElementById('homeAgenda');
  const key = todayKey();
  const todays = (appts[key] || []).slice().sort((a,b)=> a.time.localeCompare(b.time));

  if (todays.length === 0){
    container.innerHTML = '<div class="empty-day">Nessun appuntamento per oggi.</div>';
    return;
  }

  container.innerHTML = todays.map(a => `
    <div class="today-appt-row">
      <div class="time">${a.time || '--:--'}</div>
      <div class="title">${a.title}</div>
    </div>
  `).join('');
}

document.getElementById('goToAgenda').addEventListener('click', ()=> switchView('agenda'));

// ---------- HOME: MOOD GIORNALIERO ----------
// struttura dati pensata per uno storico futuro: { 'YYYY-MM-DD': { mood, emoji, label, ts } }
const MOOD_KEY = 'ember_mood_v1';
const MOOD_SKIP_KEY = 'ember_mood_skip_v1';

const MOOD_LABELS = {
  fantastico: 'Fantastico',
  bene: 'Bene',
  normale: 'Normale',
  giu: 'Giù',
  male: 'Molto male'
};

function loadMoods(){
  try{
    const raw = localStorage.getItem(MOOD_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}
function saveMoods(data){
  localStorage.setItem(MOOD_KEY, JSON.stringify(data));
}

let moods = loadMoods();

function renderMoodSummary(){
  const today = moods[todayKey()];
  const el = document.getElementById('moodSummary');
  if (today){
    el.innerHTML = `<span class="emoji">${today.emoji}</span><span>Mood di oggi: ${today.label}</span>`;
  } else {
    el.innerHTML = `<span>Non hai ancora registrato il mood di oggi.</span>`;
  }
}

function saveMood(mood, emoji){
  moods[todayKey()] = { mood, emoji, label: MOOD_LABELS[mood], ts: Date.now() };
  saveMoods(moods);
  renderMoodSummary();
  closeMoodModal();
}

function openMoodModal(){
  document.getElementById('moodOverlay').classList.add('visible');
}
function closeMoodModal(){
  document.getElementById('moodOverlay').classList.remove('visible');
}

document.querySelectorAll('.mood-option').forEach(btn=>{
  btn.addEventListener('click', ()=> saveMood(btn.dataset.mood, btn.dataset.emoji));
});

// se l'utente chiude senza scegliere (tap fuori dal modal), non richiedere di nuovo oggi
document.getElementById('moodOverlay').addEventListener('click', (e)=>{
  if (e.target.id === 'moodOverlay'){
    localStorage.setItem(MOOD_SKIP_KEY, todayKey());
    closeMoodModal();
  }
});

function maybeShowMoodPrompt(){
  const today = todayKey();
  const alreadyAnswered = !!moods[today];
  const alreadySkipped = localStorage.getItem(MOOD_SKIP_KEY) === today;
  if (!alreadyAnswered && !alreadySkipped){
    setTimeout(openMoodModal, 500);
  }
}

// ---------- HOME: INIT ----------
renderHomeQuote();
renderHomeStreaks();
renderHomeAgenda();
renderMoodSummary();

// ---------- HOME: METEO (Verona, nessuna chiave API richiesta) ----------
const WEATHER_CACHE_KEY = 'ember_weather_v1';

const WEATHER_ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18a4 4 0 1 1 .7-7.94A5 5 0 0 1 17 11a3.5 3.5 0 0 1-.5 7H7Z"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 15a4 4 0 1 1 .7-7.94A5 5 0 0 1 17 8a3.5 3.5 0 0 1-.5 7H7Z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/></svg>',
  snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 15a4 4 0 1 1 .7-7.94A5 5 0 0 1 17 8a3.5 3.5 0 0 1-.5 7H7Z"/><path d="M9 18v3M12 18v3M15 18v3"/></svg>',
  storm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 14a4 4 0 1 1 .7-7.94A5 5 0 0 1 17 7a3.5 3.5 0 0 1-.5 7H7Z"/><path d="M13 15l-3 4h3l-2 4"/></svg>'
};

function weatherInfo(code){
  if (code === 0) return { label:'sereno', icon:'sun' };
  if (code === 1 || code === 2) return { label:'poco nuvoloso', icon:'sun' };
  if (code === 3 || code === 45 || code === 48) return { label:'nuvoloso', icon:'cloud' };
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return { label:'pioggia', icon:'rain' };
  if ([71,73,75,77,85,86].includes(code)) return { label:'neve', icon:'snow' };
  if ([95,96,99].includes(code)) return { label:'temporale', icon:'storm' };
  return { label:'variabile', icon:'cloud' };
}

function renderWeatherChip(temp, code){
  const el = document.getElementById('weatherChip');
  if (!el) return;
  const info = weatherInfo(code);
  el.innerHTML = `${WEATHER_ICONS[info.icon]}<span>Verona · ${temp}° ${info.label}</span>`;
}

async function fetchWeather(){
  const el = document.getElementById('weatherChip');
  if (!el) return;

  let cached = null;
  try{ cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)); }catch(e){}

  const oneHour = 60 * 60 * 1000;
  if (cached && (Date.now() - cached.ts) < oneHour){
    renderWeatherChip(cached.temp, cached.code);
    return;
  }

  try{
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=45.4384&longitude=10.9916&current=temperature_2m,weather_code&timezone=Europe%2FRome');
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ temp, code, ts: Date.now() }));
    renderWeatherChip(temp, code);
  }catch(e){
    if (cached) renderWeatherChip(cached.temp, cached.code);
    else el.style.display = 'none';
  }
}

fetchWeather();

// ---------- HOME: STORICO MOOD ----------
let moodCalDate = new Date();

function renderMoodCalendar(){
  const y = moodCalDate.getFullYear();
  const m = moodCalDate.getMonth();
  document.getElementById('moodCalTitle').textContent = `${MONTHS_IT[m]} ${y}`;

  const grid = document.getElementById('moodCalGrid');
  grid.innerHTML = '';

  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = todayKey();

  for (let i = 0; i < startOffset; i++){
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++){
    const key = dateKey(y, m, d);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (key === todayStr) cell.classList.add('today');

    const entry = moods[key];
    cell.innerHTML = `<span class="cal-daynum">${d}</span>${entry ? `<span class="emoji-cell">${entry.emoji}</span>` : ''}`;
    grid.appendChild(cell);
  }
}

document.getElementById('openMoodHistory').addEventListener('click', ()=>{
  moodCalDate = new Date();
  renderMoodCalendar();
  document.getElementById('moodHistoryOverlay').classList.add('visible');
});
document.getElementById('closeMoodHistory').addEventListener('click', ()=>{
  document.getElementById('moodHistoryOverlay').classList.remove('visible');
});
document.getElementById('moodHistoryOverlay').addEventListener('click', (e)=>{
  if (e.target.id === 'moodHistoryOverlay'){
    document.getElementById('moodHistoryOverlay').classList.remove('visible');
  }
});
document.getElementById('moodCalPrev').addEventListener('click', ()=>{
  moodCalDate.setMonth(moodCalDate.getMonth() - 1);
  renderMoodCalendar();
});
document.getElementById('moodCalNext').addEventListener('click', ()=>{
  moodCalDate.setMonth(moodCalDate.getMonth() + 1);
  renderMoodCalendar();
});

// ---------- SERVICE WORKER (per uso offline futuro) ----------
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  });
}
