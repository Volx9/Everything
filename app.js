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

// ---------- FITNESS ----------
const FITNESS_KEY = 'ember_fitness_v1';
const WEEKDAYS_IT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

function loadFitness(){
  try{
    const raw = localStorage.getItem(FITNESS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}
function saveFitness(data){
  localStorage.setItem(FITNESS_KEY, JSON.stringify(data));
}

let fitnessData = loadFitness();
let selectedWeekday = (new Date().getDay() + 6) % 7;

function renderWeekdayRow(){
  const row = document.getElementById('weekdayRow');
  row.innerHTML = '';
  const todayIdx = (new Date().getDay() + 6) % 7;

  WEEKDAYS_IT.forEach((label, idx)=>{
    const pill = document.createElement('div');
    pill.className = 'weekday-pill';
    if (idx === todayIdx) pill.classList.add('today');
    if (idx === selectedWeekday) pill.classList.add('selected');
    pill.textContent = label;
    pill.addEventListener('click', ()=>{
      selectedWeekday = idx;
      renderWeekdayRow();
      loadFitnessDay();
    });
    row.appendChild(pill);
  });
}

function loadFitnessDay(){
  const day = fitnessData[selectedWeekday] || { workout:'', diet:'' };
  document.getElementById('fitWorkout').value = day.workout || '';
  document.getElementById('fitDiet').value = day.diet || '';
}

function saveFitnessDay(){
  fitnessData[selectedWeekday] = {
    workout: document.getElementById('fitWorkout').value,
    diet: document.getElementById('fitDiet').value
  };
  saveFitness(fitnessData);
}

document.getElementById('saveFitBtn').addEventListener('click', saveFitnessDay);

renderWeekdayRow();
loadFitnessDay();

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
