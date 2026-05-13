// ── DATE STRIP ──
function buildDateStrip() {
  // Retroactively recalculate all days we have data for
  const allDates = new Set([
    ...Object.keys(state.habits||{}),
    ...Object.keys(state.water||{}),
    ...(state.workouts||[]).map(w=>w.date),
  ]);
  allDates.forEach(key=>{ state.weekDays[key] = checkDayComplete(key); });
  state.weekDays[TODAY] = checkDayComplete(TODAY);
  save(state);

  const strip = document.getElementById('dateStrip');
  strip.innerHTML = '';
  const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const now = new Date();

  for(let i=-3;i<=3;i++) {
    const d = new Date(now); d.setDate(now.getDate()+i);
    const key = localDateStr(d);
    const isToday = key===TODAY;
    const isDone = !!state.weekDays[key];
    const isFuture = i > 0;
    const pill = document.createElement('div');
    pill.className = 'day-pill' + (isToday?' today':'') + (isDone?' done':'');
    pill.style.opacity = isFuture ? '0.35' : '1';
    const dotColor = isDone ? 'var(--green)' : isToday ? 'var(--accent)' : 'var(--text3)';
    pill.innerHTML = `<span class="day-name">${dayNames[d.getDay()]}</span><span class="day-num">${d.getDate()}</span><span class="day-dot" style="background:${dotColor};width:6px;height:6px;border-radius:50%;display:block;"></span>`;
    strip.appendChild(pill);
  }

  // streak — consecutive days going back
  let streak = 0;
  const cur = new Date();
  if(state.weekDays[TODAY]) streak++;
  cur.setDate(cur.getDate()-1);
  while(streak < 366) {
    const k = localDateStr(cur);
    if(!state.weekDays[k]) break;
    streak++;
    cur.setDate(cur.getDate()-1);
  }
  state.streak = streak;
  document.getElementById('streakVal').textContent = streak;

  // week done count (last 7 days)
  let weekDone = 0;
  for(let i=0;i<7;i++){
    const dd=new Date(); dd.setDate(dd.getDate()-i);
    if(state.weekDays[localDateStr(dd)]) weekDone++;
  }
  document.getElementById('weekDoneVal').textContent = weekDone+'/7';
}

// ── TODAY XP ──
function updateTodayXP() {
  const h = state.habits[TODAY] || {};
  let tx = 0;
  getHabits().forEach(hc=>{ if(h[hc.id]) tx += hc.xp; });
  const waterPct = (state.water[TODAY]||0) / getWaterMeta();
  if(waterPct >= 1) tx += 15;
  document.getElementById('todayXpVal').textContent = tx;
  updateStreakProgress();
}

// ── STREAK PROGRESS BAR ──
function updateStreakProgress() {
  const done = state.habits[TODAY] || {};
  const allHabits = getHabits();
  const habitsDone = allHabits.filter(h=>done[h.id]).length;
  const habitsPct = allHabits.length > 0 ? habitsDone/allHabits.length : 0;
  const waterPct = (state.water[TODAY]||0) / getWaterMeta();
  const trainedToday = (state.workouts||[]).some(w=>w.date===TODAY);

  // each of the 3 pillars worth 33.3%
  const pillar1 = trainedToday ? 1 : 0;
  const pillar2 = Math.min(1, waterPct);
  const pillar3 = Math.min(1, habitsPct);
  const total = Math.round((pillar1 + pillar2 + pillar3) / 3 * 100);

  const bar = document.getElementById('streakBar');
  const label = document.getElementById('streakPctLabel');
  const hint = document.getElementById('streakHint');
  if(!bar) return;

  bar.style.width = total + '%';
  label.textContent = total + '%';

  // color changes with progress
  if(total >= 100) {
    bar.style.background = 'linear-gradient(90deg,#6dcc7a,#4aaa58)';
    label.style.color = 'var(--green)';
    hint.textContent = '✅ Dia completo! Streak garantido!';
    hint.style.color = 'var(--green)';
  } else if(total >= 66) {
    bar.style.background = 'linear-gradient(90deg,#f5c842,#ffaa00)';
    label.style.color = 'var(--gold)';
    const missing = [];
    if(!trainedToday) missing.push('treino');
    if(waterPct < 0.6) missing.push('água');
    if(habitsPct < 0.5) missing.push('hábitos');
    hint.textContent = `Falta: ${missing.join(' · ')}`;
    hint.style.color = 'var(--text3)';
  } else {
    bar.style.background = 'linear-gradient(90deg,#c96fa8,#e891c8)';
    label.style.color = 'var(--accent2)';
    // show what's done
    const done2 = [];
    if(trainedToday) done2.push('treino ✓');
    if(waterPct >= 0.6) done2.push('água ✓');
    if(habitsPct >= 0.5) done2.push('hábitos ✓');
    hint.textContent = done2.length ? done2.join(' · ') : 'Treino · Água · Hábitos';
    hint.style.color = 'var(--text3)';
  }
}

function getWaterMeta() { return state.waterMeta || 8; }

function editWaterMeta() {
  // highlight current
  document.querySelectorAll('#waterMetaBtns .dur-btn').forEach(b=>{
    const n = parseInt(b.textContent);
    b.classList.toggle('selected', n === getWaterMeta());
  });
  document.getElementById('waterMetaModal').style.display='flex';
}
function closeWaterMeta() { document.getElementById('waterMetaModal').style.display='none'; }
function setWaterMeta(n) {
  state.waterMeta = n;
  save(state);
  closeWaterMeta();
  buildWater();
  toast(`💧 Meta atualizada: ${n} copos`);
}
function setWaterMetaCustom() {
  const n = parseInt(document.getElementById('waterMetaCustom').value);
  if(!n||n<1||n>30) { toast('Número inválido!'); return; }
  setWaterMeta(n);
}

// ── WATER ──
function buildWater() {
  const cups = document.getElementById('waterCups');
  cups.innerHTML = '';
  const meta = getWaterMeta();
  const count = state.water[TODAY] || 0;
  document.getElementById('waterCount').textContent = count + ' / ' + meta;
  for(let i=0;i<meta;i++) {
    const c = document.createElement('div');
    c.className = 'cup' + (i<count?' filled':'');
    c.innerHTML = '<div class="cup-fill"></div>';
    const idx = i;
    c.onclick = ()=>toggleCup(idx, meta);
    cups.appendChild(c);
  }
}

function toggleCup(i, meta) {
  const count = state.water[TODAY] || 0;
  const newCount = i < count ? i : i + 1;
  const wasAdded = newCount > count;
  state.water[TODAY] = newCount;
  if(newCount === meta && count < meta) {
    addXP(15, 5, document.getElementById('waterCups'));
    toast('💧 Meta de água batida! +15 XP');
    state.weekDays[TODAY] = checkDayComplete();
    checkFlower();
  }
  save(state);
  buildWater(); updateTodayXP(); buildDateStrip(); updateStreakProgress();
  // animação de pop no copo tocado
  if(wasAdded) {
    const cups = document.querySelectorAll('#waterCups .cup');
    if(cups[i]) cups[i].classList.add('filling');
  }
}

// ── HABITS (with custom) ──
const DEFAULT_HABITS = [
  {id:'sleep',     icon:'😴', name:'Dormi bem',            sub:'7+ horas de sono',        xp:10, coins:3},
  {id:'diet',      icon:'🥗', name:'Alimentação saudável', sub:'Comi bem hoje',            xp:10, coins:3},
  {id:'steps',     icon:'👟', name:'Fui caminhar',         sub:'Movimento do dia',         xp:12, coins:4},
  {id:'selfcare',  icon:'🧴', name:'Autocuidado',          sub:'Skin care, relaxamento…',  xp:8,  coins:2},
];

function getHabits() {
  if(!state.customHabits) state.customHabits = [];
  return [...DEFAULT_HABITS, ...state.customHabits];
}

function buildHabits() {
  const list = document.getElementById('habitsList');
  list.innerHTML = '';
  const done = state.habits[TODAY] || {};
  getHabits().forEach(h=>{
    const row = document.createElement('div');
    row.className = 'habit-row' + (done[h.id]?' done':'');
    row.innerHTML = `
      <span class="habit-icon">${h.icon}</span>
      <div class="habit-info">
        <div class="habit-name">${h.name}</div>
        <div class="habit-sub">${h.sub||''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="habit-xp">+${h.xp} XP</span>
        <div class="habit-check">${done[h.id]?'✓':''}</div>
      </div>`;
    row.onclick = ()=>toggleHabit(h, row);
    list.appendChild(row);
  });
}

function toggleHabit(h, el) {
  if(!state.habits[TODAY]) state.habits[TODAY] = {};
  const was = state.habits[TODAY][h.id];
  state.habits[TODAY][h.id] = !was;
  if(!was) {
    addXP(h.xp, h.coins||2, el);
    playSprite('walk', false);
    toast(`${h.icon} ${h.name} ✓ +${h.xp} XP`);
  } else {
    state.xp = Math.max(0, state.xp - h.xp);
    state.coins = Math.max(0, state.coins - (h.coins||2));
    save(state); updateCharUI();
  }
  state.weekDays[TODAY] = checkDayComplete();
  checkFlower();
  save(state);
  buildHabits(); buildDateStrip(); updateTodayXP();

  if(!was) {
    // bounce animation na linha recém-marcada
    const allHabits = getHabits();
    const idx = allHabits.findIndex(x => x.id === h.id);
    const rows = document.querySelectorAll('#habitsList .habit-row');
    if(rows[idx]) {
      rows[idx].classList.add('bouncing');
      setTimeout(() => rows[idx] && rows[idx].classList.remove('bouncing'), 600);
    }
    // confete ao completar 100% dos hábitos
    const done = state.habits[TODAY] || {};
    if(allHabits.every(hb => done[hb.id])) launchConfetti();
  }
}

function launchConfetti() {
  const colors = ['#c96fa8','#e891c8','#f5c842','#6dcc7a','#6ab4f5','#f0e6ff','#ff9de2'];
  const container = document.getElementById('app');
  for(let i = 0; i < 70; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      const size = Math.random() * 7 + 4;
      p.className = 'confetti-particle';
      p.style.cssText = [
        `left:${Math.random()*95}%`,
        `background:${colors[Math.floor(Math.random()*colors.length)]}`,
        `width:${size}px`,
        `height:${size * (Math.random() > 0.5 ? 1 : 2.5)}px`,
        `border-radius:${Math.random() > 0.4 ? '50%' : '2px'}`,
        `animation-duration:${(Math.random()*1.2+1.1).toFixed(2)}s`,
        `animation-delay:${(Math.random()*0.4).toFixed(2)}s`,
      ].join(';');
      container.appendChild(p);
      setTimeout(() => p.remove(), 2800);
    }, Math.random() * 400);
  }
  toast('🎉 Todos os hábitos completos! Incrível!');
}

// ── STREAK / DAY COMPLETE ──
// Dia completo = 2 de 3 pilares: treino, água 60%+, hábitos 50%+
function checkDayComplete(dateKey) {
  const key = dateKey || TODAY;
  const done = state.habits[key] || {};
  const allHabits = getHabits();
  const habitsDone = allHabits.filter(h=>done[h.id]).length;
  const habitsPct = allHabits.length > 0 ? habitsDone/allHabits.length : 0;
  const waterPct = (state.water[key]||0) / getWaterMeta();
  const trainedDay = (state.workouts||[]).some(w=>w.date===key);

  let score = 0;
  if(trainedDay) score++;
  if(waterPct >= 0.6) score++;
  if(habitsPct >= 0.5) score++;
  return score >= 2;
}

// ── HABITS EDITOR ──
function openHabitsEditor() {
  buildHabitsEditorList();
  document.getElementById('habitsEditorModal').style.display='flex';
}
function closeHabitsEditor() {
  document.getElementById('habitsEditorModal').style.display='none';
  buildHabits();
  updateTodayXP();
}

function buildHabitsEditorList() {
  const el = document.getElementById('habitsEditorList');
  el.innerHTML='';
  // default habits — shown as locked
  DEFAULT_HABITS.forEach(h=>{
    const row=document.createElement('div');
    row.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;opacity:.7;';
    row.innerHTML=`<span style="font-size:18px;">${h.icon}</span><div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--text);">${h.name}</div><div style="font-size:10px;color:var(--text3);">Padrão · +${h.xp} XP</div></div><span style="font-size:11px;color:var(--text3);">🔒</span>`;
    el.appendChild(row);
  });
  // custom habits — deletable
  (state.customHabits||[]).forEach((h,i)=>{
    const row=document.createElement('div');
    row.style.cssText='background:var(--card);border:1px solid rgba(201,111,168,0.3);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;';
    row.innerHTML=`<span style="font-size:18px;">${h.icon}</span><div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--text);">${h.name}</div><div style="font-size:10px;color:var(--accent);">Personalizado · +${h.xp} XP</div></div><button onclick="removeCustomHabit(${i})" style="background:none;border:none;font-size:18px;color:var(--red);cursor:pointer;">🗑</button>`;
    el.appendChild(row);
  });
}

function addCustomHabit() {
  const icon = document.getElementById('newHabitIcon').value.trim() || '⭐';
  const name = document.getElementById('newHabitName').value.trim();
  if(!name) { toast('Digite o nome do hábito!'); return; }
  if(!state.customHabits) state.customHabits=[];
  const id = 'custom_' + Date.now();
  state.customHabits.push({id, icon, name, sub:'Hábito personalizado', xp:5, coins:2});
  save(state);
  document.getElementById('newHabitIcon').value='';
  document.getElementById('newHabitName').value='';
  toast(`${icon} ${name} adicionado! +5 XP`);
  buildHabitsEditorList();
}

function removeCustomHabit(idx) {
  if(!state.customHabits) return;
  const h = state.customHabits[idx];
  state.customHabits.splice(idx,1);
  // clean from today's habits if marked
  if(state.habits[TODAY]&&h) delete state.habits[TODAY][h.id];
  save(state);
  buildHabitsEditorList();
  toast('Hábito removido');
}