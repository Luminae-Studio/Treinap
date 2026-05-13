// ── WORKOUT ──
function buildWorkoutTypes() {
  const el = document.getElementById('workoutTypes');
  el.innerHTML = '';
  WORKOUT_CONFIG.forEach(w=>{
    const btn = document.createElement('div');
    btn.className = 'workout-btn' + (selectedWorkout===w.id?' selected':'');
    btn.innerHTML=`<span class="workout-icon">${w.icon}</span><span class="workout-name">${w.name}</span><span class="workout-xp">~${Math.round(w.xpPerMin*30)} XP / 30min</span>`;
    btn.onclick=()=>{ selectedWorkout=w.id; buildWorkoutTypes(); };
    el.appendChild(btn);
  });
}

function selectDur(btn, val) {
  document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedDur = val;
}

function saveWorkout() {
  if(!selectedWorkout||!selectedDur) { toast('Selecione tipo e duração!'); return; }
  const cfg = WORKOUT_CONFIG.find(w=>w.id===selectedWorkout);
  const xpEarned = Math.round(cfg.xpPerMin * parseInt(selectedDur));
  const coins = Math.round(xpEarned * 0.5);
  state.workouts.push({type:selectedWorkout, icon:cfg.icon, name:cfg.name, dur:selectedDur, xp:xpEarned, date:TODAY});
  addXP(xpEarned, coins, document.querySelector('.save-btn'));
  toast(`${cfg.icon} ${cfg.name} registrado! +${xpEarned} XP`);
  playSprite('celebrate', false);
  state.weekDays[TODAY] = checkDayComplete();
  checkFlower();
  save(state);
  buildWorkoutHistory();
  updateStreakProgress();
  document.getElementById('totalWorkouts').textContent = state.workouts.length;
}

function buildWorkoutHistory() {
  const el = document.getElementById('workoutHistory');
  el.innerHTML='';
  const recent = [...state.workouts].reverse().slice(0,5);
  recent.forEach(w=>{
    const row=document.createElement('div');
    row.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;';
    row.innerHTML=`<span style="font-size:20px">${w.icon}</span><div style="flex:1"><div style="font-size:13px;font-weight:700">${w.name}</div><div style="font-size:11px;color:var(--text3)">${w.dur} min · ${fmtDate(w.date)}</div></div><span style="font-size:11px;font-weight:800;color:var(--gold)">+${w.xp} XP</span>`;
    el.appendChild(row);
  });
}

// ── SUBTABS PROGRESSO ──
let currentSubtab = 'geral';
function showSubtab(tab) {
  currentSubtab = tab;
  ['geral','medidas','objetivos'].forEach(t=>{
    document.getElementById('subtab-'+t).style.display = t===tab ? 'block' : 'none';
    const btn = document.getElementById('subtab-'+t+'-btn');
    if(t===tab){ btn.style.background='var(--accent)'; btn.style.color='#fff'; }
    else { btn.style.background='transparent'; btn.style.color='var(--text3)'; }
  });
  if(tab==='geral') { buildGeralView(); updateBodyCanvas(); buildBodyStats(); }
  else if(tab==='medidas') { buildMedidaSelector(); buildMedidaChart(); buildMedidaHistory(); }
  else if(tab==='objetivos') { buildObjetivosList(); }
}

// ── OBJETIVOS ──
function getObjetivos() {
  if(!state.objetivos) state.objetivos = {};
  return state.objetivos;
}
function setObjetivo(id, val) {
  if(!state.objetivos) state.objetivos = {};
  if(val === null) delete state.objetivos[id];
  else state.objetivos[id] = val;
  save(state);
}

function buildObjetivosList() {
  const el = document.getElementById('objetivosList');
  el.innerHTML = '';
  MEDIDAS_CONFIG.forEach(m=>{
    // altura não tem objetivo — é referência fixa
    if(m.id === 'altura') {
      const data = getMedidaData('altura');
      if(!data.length) return;
      const card = document.createElement('div');
      card.style.cssText='background:var(--card);border:1px dashed rgba(255,255,255,0.1);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;opacity:.7;';
      card.innerHTML=`<span style="font-size:18px;">📏</span><div style="flex:1;"><div style="font-size:13px;font-weight:800;color:var(--text);">Altura</div><div style="font-size:11px;color:var(--text3);">Referência fixa — não tem meta</div></div><span style="font-size:15px;font-weight:900;color:${m.color};">${data[data.length-1].val} cm</span>`;
      el.appendChild(card);
      return;
    }
    const obj = getObjetivos()[m.id];
    const data = getMedidaData(m.id);
    const current = data.length ? data[data.length-1].val : null;
    const card = document.createElement('div');
    card.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;';

    let progressBar = '';
    let statusMsg = '';
    if(obj && current !== null) {
      const first = data[0].val;
      const totalDist = Math.abs(obj - first);
      const traveled = Math.abs(current - first);
      const pct = totalDist > 0 ? Math.min(100, Math.round(traveled/totalDist*100)) : 100;
      const closer = (obj < first) ? (current < first) : (current > first);
      const onTrack = obj < first ? current <= first : current >= first;
      const approaching = obj < first ? current < first && current > obj : current > first && current < obj;
      const diff = Math.abs(current - obj).toFixed(1);
      const done = Math.abs(current - obj) < 0.5;
      let statusColor = approaching ? 'var(--green)' : 'var(--red)';
      let statusText = done ? '🎉 Objetivo alcançado!' : approaching ? `✅ Faltam ${diff} ${m.unit}` : `⚠️ Afastando ${diff} ${m.unit}`;
      statusMsg = `<div style="font-size:11px;font-weight:700;color:${done?'var(--gold)':statusColor};margin-top:8px;">${statusText}</div>`;
      progressBar = `<div style="margin-top:8px;background:rgba(255,255,255,0.08);border-radius:6px;height:6px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${done?'var(--gold)':approaching?'var(--green)':'var(--red)'};border-radius:6px;transition:width .5s;"></div>
      </div><div style="font-size:10px;color:var(--text3);margin-top:4px;">${pct}% do caminho</div>`;
    }

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="font-size:18px;">${m.icon}</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:800;color:var(--text);">${m.label}</div>
          ${current !== null ? `<div style="font-size:11px;color:var(--text3);">Atual: <span style="color:${m.color};font-weight:700;">${current} ${m.unit}</span></div>` : '<div style="font-size:11px;color:var(--text3);">Sem registros ainda</div>'}
        </div>
        ${obj ? `<button onclick="clearObjetivo('${m.id}')" style="background:none;border:none;color:var(--text3);font-size:16px;cursor:pointer;padding:4px;">✕</button>` : ''}
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="number" id="obj_${m.id}" placeholder="Meta em ${m.unit}" step="0.1"
          value="${obj || ''}"
          style="flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:8px 10px;font-size:13px;font-weight:700;color:var(--text);font-family:var(--sans);outline:none;">
        <button onclick="saveObjetivo('${m.id}')"
          style="padding:8px 14px;background:${m.color}33;border:1px solid ${m.color}66;border-radius:8px;font-size:12px;font-weight:800;color:${m.color};cursor:pointer;font-family:var(--sans);">
          ${obj ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
      ${statusMsg}${progressBar}`;
    el.appendChild(card);
  });
}

function saveObjetivo(id) {
  const input = document.getElementById('obj_'+id);
  const val = parseFloat(input.value);
  const cfg = MEDIDAS_CONFIG.find(m=>m.id===id);
  if(!val||val<cfg.min||val>cfg.max) { toast('Valor inválido!'); return; }
  setObjetivo(id, val);
  toast(`🎯 Meta de ${cfg.label} salva: ${val} ${cfg.unit}`);
  buildObjetivosList();
  buildGeralView();
}

function clearObjetivo(id) {
  setObjetivo(id, null);
  buildObjetivosList();
  buildGeralView();
}

// ── GERAL VIEW ──
function buildGeralView() {
  updateProgressSummary();

  // banner — mostra progresso real de cada meta individualmente
  const banner = document.getElementById('geralBanner');
  const objs = getObjetivos();
  const withGoal = MEDIDAS_CONFIG.filter(m=>m.id!=='altura' && objs[m.id] && getMedidaData(m.id).length >= 1);
  if(withGoal.length > 0) {
    let bannerHTML = `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:4px;">`;
    withGoal.forEach(m=>{
      const data = [...getMedidaData(m.id)].sort((a,b)=>a.date.localeCompare(b.date));
      const curr = data[data.length-1].val;
      const first = data[0].val;
      const goal = objs[m.id];
      const needsDecrease = goal < first;
      const totalDist = Math.abs(goal - first);
      const traveled = Math.abs(curr - first);
      const pct = totalDist > 0 ? Math.min(100, Math.round(traveled/totalDist*100)) : 0;
      const diff = Math.abs(curr - goal).toFixed(1);
      const done = Math.abs(curr-goal) < 0.5;
      const approaching = needsDecrease ? curr < first : curr > first;
      const onTrack = needsDecrease ? curr <= first : curr >= first;
      const color = done?'var(--gold)':(approaching&&onTrack)?'var(--green)':'var(--red)';
      const status = done ? '🎉 Meta!' : (approaching&&onTrack) ? `✅ faltam ${diff} ${m.unit}` : `⚠️ afastando ${diff} ${m.unit}`;
      bannerHTML += `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;">${m.icon} <b>${m.label}</b></span>
            <span style="font-size:11px;font-weight:700;color:${color};">${status}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-bottom:3px;">
            <span>Início: ${first} ${m.unit}</span>
            <span style="font-weight:900;color:${color};">${pct}%</span>
            <span>Meta: ${goal} ${m.unit}</span>
          </div>
          <div style="background:rgba(255,255,255,0.08);border-radius:6px;height:7px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:6px;transition:width .6s;"></div>
          </div>
        </div>`;
    });
    bannerHTML += `</div>`;
    banner.innerHTML = bannerHTML;
  } else {
    banner.innerHTML = `<div style="background:var(--card);border:1px dashed rgba(255,255,255,0.1);border-radius:14px;padding:14px;text-align:center;font-size:11px;color:var(--text3);">
      Defina seus objetivos na aba 🎯 para ver o progresso aqui
    </div>`;
  }

  // cards por medida
  const cards = document.getElementById('geralCards');
  cards.innerHTML = '';
  const withData = MEDIDAS_CONFIG.filter(m=>getMedidaData(m.id).length > 0);
  if(!withData.length){
    cards.innerHTML='<div style="font-size:12px;color:var(--text3);text-align:center;padding:20px 0;">Nenhuma medida registrada ainda 🌱</div>';
    return;
  }
  withData.forEach(m=>{
    const data = getMedidaData(m.id);
    const curr = data[data.length-1].val;
    const first = data[0].val;
    const goal = objs[m.id];
    const diff = data.length>=2 ? (curr - data[data.length-2].val) : null;
    const totalDiff = curr - first;

    let goalSection = '';
    if(goal) {
      const distToGoal = (curr - goal).toFixed(1);
      const done = Math.abs(curr-goal)<0.5;
      const approachingGoal = goal<first ? curr<first : curr>first;
      const color = done?'var(--gold)':approachingGoal?'var(--green)':'var(--red)';
      const pct = first!==goal ? Math.min(100,Math.round(Math.abs(curr-first)/Math.abs(goal-first)*100)) : 100;
      goalSection = `<div style="margin-top:8px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:3px;">
          <span>Início: ${first}</span><span style="color:${color};font-weight:700;">${done?'✓ Meta!':approachingGoal?'▼ '+Math.abs(distToGoal):'▲ +'+Math.abs(distToGoal)} ${m.unit}</span><span>Meta: ${goal}</span>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:6px;height:5px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:6px;"></div>
        </div>
      </div>`;
    }

    const diffColor = diff===null?'':diff<0?'var(--green)':diff>0?'var(--red)':'var(--text3)';
    const diffTxt = diff===null?'':`<span style="font-size:11px;font-weight:700;color:${diffColor}">${diff>0?'+':''}${diff.toFixed(1)}</span>`;

    const card = document.createElement('div');
    card.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;cursor:pointer;';
    card.onclick=()=>{ showSubtab('medidas'); selectedMedida=m.id; buildMedidaSelector(); buildMedidaChart(); buildMedidaHistory(); };
    card.innerHTML=`<div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:20px;">${m.icon}</span>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:800;color:var(--text2);">${m.label}</div>
        <div style="font-size:10px;color:var(--text3);">${data.length} registros · desde ${data[0].date.slice(5)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:18px;font-weight:900;color:${m.color};">${curr} <span style="font-size:11px;">${m.unit}</span></div>
        ${diffTxt}
      </div>
    </div>${goalSection}`;
    cards.appendChild(card);
  });
}

// ── MEDIDAS CONFIG ──
const MEDIDAS_CONFIG = [
  {id:'peso',    label:'Peso',        icon:'⚖️',  unit:'kg',  color:'#c96fa8', min:20,  max:300, bodyY:0.38},
  {id:'peito',   label:'Peito',       icon:'💜',  unit:'cm',  color:'#e891c8', min:50,  max:160, bodyY:0.28},
  {id:'cintura', label:'Cintura',     icon:'🎀',  unit:'cm',  color:'#f5c842', min:40,  max:150, bodyY:0.43},
  {id:'quadril', label:'Quadril',     icon:'✨',  unit:'cm',  color:'#6ab4f5', min:50,  max:170, bodyY:0.52},
  {id:'bunda',   label:'Bunda',       icon:'🍑',  unit:'cm',  color:'#f07070', min:50,  max:170, bodyY:0.57},
  {id:'coxa_d',  label:'Coxa dir.',   icon:'🦵',  unit:'cm',  color:'#6dcc7a', min:30,  max:100, bodyY:0.67},
  {id:'coxa_e',  label:'Coxa esq.',   icon:'🦵',  unit:'cm',  color:'#6dcc7a', min:30,  max:100, bodyY:0.67},
  {id:'braco_d', label:'Braço dir.',  icon:'💪',  unit:'cm',  color:'#a78bfa', min:15,  max:60,  bodyY:0.35},
  {id:'braco_e', label:'Braço esq.',  icon:'💪',  unit:'cm',  color:'#a78bfa', min:15,  max:60,  bodyY:0.35},
  {id:'panturrilha', label:'Panturrilha', icon:'🦶', unit:'cm', color:'#fb923c', min:20, max:60, bodyY:0.80},
  {id:'altura',  label:'Altura',      icon:'📏',  unit:'cm',  color:'#94a3b8', min:100, max:220, bodyY:0.05},
];

let selectedMedida = 'peso';

function getMedidaData(id) {
  if(!state.medidas) state.medidas = {};
  return state.medidas[id] || [];
}

function buildMedidaSelector() {
  const el = document.getElementById('medidaSelector');
  el.innerHTML = '';
  MEDIDAS_CONFIG.forEach(m=>{
    const btn = document.createElement('button');
    btn.style.cssText = `padding:6px 12px;border-radius:20px;border:1px solid ${selectedMedida===m.id ? m.color : 'rgba(255,255,255,0.1)'};background:${selectedMedida===m.id ? m.color+'22' : 'transparent'};color:${selectedMedida===m.id ? m.color : 'var(--text3)'};font-size:11px;font-weight:700;cursor:pointer;font-family:var(--sans);white-space:nowrap;transition:all .2s;`;
    btn.textContent = m.icon + ' ' + m.label;
    btn.onclick = () => { selectedMedida = m.id; buildMedidaSelector(); buildMedidaChart(); updateBodyCanvas(); };
    el.appendChild(btn);
  });
  const cfg = MEDIDAS_CONFIG.find(m=>m.id===selectedMedida);
  document.getElementById('medidaUnit').textContent = cfg.unit;
  document.getElementById('medidaInput').placeholder = `${cfg.label} em ${cfg.unit}`;
}

function addMedida() {
  const cfg = MEDIDAS_CONFIG.find(m=>m.id===selectedMedida);
  const input = document.getElementById('medidaInput');
  const val = parseFloat(input.value);
  if(!val||val<cfg.min||val>cfg.max) { toast(`Valor inválido para ${cfg.label}`); return; }
  if(!state.medidas) state.medidas = {};
  if(!state.medidas[selectedMedida]) state.medidas[selectedMedida] = [];
  state.medidas[selectedMedida].push({date:TODAY, val, id: Date.now()});
  save(state);
  input.value = '';

  // goal feedback
  const goal = (state.objetivos||{})[selectedMedida];
  const data = getMedidaData(selectedMedida);
  if(goal && data.length >= 2) {
    const prev = data[data.length-2].val;
    const curr = val;
    const done = Math.abs(curr-goal)<0.5;
    if(done) { toast(`🏆 Meta de ${cfg.label} alcançada!`); playSprite('celebrate',false); }
    else {
      const wasCloser = Math.abs(prev-goal) > Math.abs(curr-goal);
      toast(wasCloser ? `${cfg.icon} Aproximando do objetivo! Faltam ${Math.abs(curr-goal).toFixed(1)} ${cfg.unit}` : `${cfg.icon} ${cfg.label}: ${val} ${cfg.unit} — atenção, afastando do objetivo`);
    }
  } else {
    toast(`${cfg.icon} ${cfg.label}: ${val} ${cfg.unit}`);
  }
  buildMedidaChart();
  updateBodyCanvas();
  buildMedidaHistory();
  updateProgressSummary();
}

// ── DELETE MODAL ──
let deleteTarget = null;
function showDeleteModal(medidaId, entryId, val, unit, date) {
  deleteTarget = {medidaId, entryId};
  const modal = document.getElementById('deleteModal');
  document.getElementById('deleteModalText').textContent = `Deletar registro de ${val} ${unit} em ${date}?`;
  modal.style.display='flex';
}
function confirmDelete() {
  if(!deleteTarget) return;
  const {medidaId, entryId} = deleteTarget;
  if(state.medidas && state.medidas[medidaId]) {
    state.medidas[medidaId] = state.medidas[medidaId].filter(r=>r.id!==entryId);
    save(state);
  }
  document.getElementById('deleteModal').style.display='none';
  deleteTarget = null;
  buildMedidaHistory();
  buildMedidaChart();
  buildGeralView();
  updateBodyCanvas();
  buildBodyStats();
  updateProgressSummary();
  toast('Registro deletado');
}
function cancelDelete() {
  document.getElementById('deleteModal').style.display='none';
  deleteTarget = null;
}

function drawLineChart(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const W = canvas.offsetWidth || 300;
  canvas.width = W; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W,160);

  const chartEmpty = document.getElementById('chartEmpty');

  if(data.length < 2) {
    canvas.style.display='none';
    if(chartEmpty) chartEmpty.style.display='block';
    return;
  }
  canvas.style.display='block';
  if(chartEmpty) chartEmpty.style.display='none';

  const vals = data.map(d=>d.val);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const pad = {t:12,b:28,l:38,r:10};
  const cW = W-pad.l-pad.r, cH = canvas.height-pad.t-pad.b;

  // grid
  ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pad.t+cH*(i/4);
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+cW,y); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='9px Nunito,sans-serif';
    ctx.fillText((maxV-(range)*(i/4)).toFixed(1),1,y+4);
  }

  // date labels
  ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font='8px Nunito,sans-serif';
  const step = Math.ceil(data.length/5);
  data.forEach((d,i)=>{ if(i%step===0||i===data.length-1){ const x=pad.l+i*(cW/(data.length-1)); ctx.fillText(d.date.slice(5),x-8,canvas.height-4); }});

  // fill
  const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+cH);
  grad.addColorStop(0,color+'44'); grad.addColorStop(1,color+'00');
  ctx.fillStyle=grad;
  ctx.beginPath();
  data.forEach((d,i)=>{
    const x=pad.l+i*(cW/(data.length-1));
    const y=pad.t+cH*(1-(d.val-minV)/range);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.lineTo(pad.l+cW,pad.t+cH); ctx.lineTo(pad.l,pad.t+cH); ctx.closePath(); ctx.fill();

  // line
  ctx.strokeStyle=color; ctx.lineWidth=2;
  ctx.beginPath();
  data.forEach((d,i)=>{
    const x=pad.l+i*(cW/(data.length-1));
    const y=pad.t+cH*(1-(d.val-minV)/range);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();

  // dots
  ctx.fillStyle=color;
  data.forEach((d,i)=>{
    const x=pad.l+i*(cW/(data.length-1));
    const y=pad.t+cH*(1-(d.val-minV)/range);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  });

  // last value label
  const last = data[data.length-1];
  const lx=pad.l+(data.length-1)*(cW/(data.length-1));
  const ly=pad.t+cH*(1-(last.val-minV)/range);
  ctx.fillStyle=color; ctx.font='bold 10px Nunito,sans-serif';
  ctx.fillText(last.val, lx-16, ly-8);
}

function buildMedidaChart() {
  const cfg = MEDIDAS_CONFIG.find(m=>m.id===selectedMedida);
  const data = getMedidaData(selectedMedida).slice(-30);
  document.getElementById('chartTitle').textContent = cfg.icon + ' ' + cfg.label;
  const curr = data.length ? data[data.length-1].val+' '+cfg.unit : '—';
  document.getElementById('chartCurrent').textContent = curr;
  if(data.length>=2){
    const diff = (data[data.length-1].val - data[0].val).toFixed(1);
    const sign = diff > 0 ? '+' : '';
    document.getElementById('chartDiff').textContent = sign+diff+' '+cfg.unit;
    document.getElementById('chartDiff').style.color = diff <= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    document.getElementById('chartDiff').textContent = '';
  }
  const goalBadge = document.getElementById('chartGoalBadge');
  const goal = (state.objetivos||{})[selectedMedida];
  if(goalBadge && goal && data.length) {
    const curr2 = data[data.length-1].val;
    const dist = Math.abs(curr2-goal).toFixed(1);
    const done = parseFloat(dist)<0.5;
    const approaching = data.length>=2 ? Math.abs(curr2-goal) < Math.abs(data[data.length-2].val-goal) : true;
    const color = done?'var(--gold)':approaching?'var(--green)':'var(--red)';
    goalBadge.style.display='block';
    goalBadge.innerHTML=`<div style="background:${color}18;border:1px solid ${color}44;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;color:${color};">🎯 Meta: ${goal} ${cfg.unit} · ${done?'Alcançada! 🏆':approaching?`Faltam ${dist} ${cfg.unit} ✅`:`Afastando ${dist} ${cfg.unit} ⚠️`}</div>`;
  } else if(goalBadge) { goalBadge.style.display='none'; }
  drawLineChart('weightChart', data, cfg.color);
}

function updateBodyCanvas() {
  const canvas = document.getElementById('bodyCanvas');
  if(!canvas) return;
  const W=120, H=240;
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);

  // silhouette — simple pixel body
  ctx.fillStyle='rgba(255,255,255,0.06)';
  // head
  ctx.beginPath(); ctx.arc(60,22,16,0,Math.PI*2); ctx.fill();
  // neck
  ctx.fillRect(55,36,10,8);
  // torso
  ctx.beginPath(); ctx.roundRect(35,44,50,60,6); ctx.fill();
  // arms
  ctx.beginPath(); ctx.roundRect(20,44,14,55,5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(86,44,14,55,5); ctx.fill();
  // hips
  ctx.beginPath(); ctx.roundRect(33,100,54,30,5); ctx.fill();
  // legs
  ctx.beginPath(); ctx.roundRect(36,128,22,80,5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(62,128,22,80,5); ctx.fill();

  // highlight selected measurement
  const cfg = MEDIDAS_CONFIG.find(m=>m.id===selectedMedida);
  if(cfg) {
    ctx.strokeStyle=cfg.color; ctx.lineWidth=2;
    ctx.shadowColor=cfg.color; ctx.shadowBlur=8;
    const y = H * cfg.bodyY;
    ctx.beginPath(); ctx.ellipse(60,y,28,8,0,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
  }

  // dots for all measured areas
  MEDIDAS_CONFIG.forEach(m=>{
    const data = getMedidaData(m.id);
    if(!data.length) return;
    const y = H * m.bodyY;
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(60, y, 4, 0, Math.PI*2); ctx.fill();
  });
}

function buildBodyStats() {
  const el = document.getElementById('bodyStats');
  el.innerHTML = '';
  MEDIDAS_CONFIG.forEach(m=>{
    const data = getMedidaData(m.id);
    if(!data.length) return;
    const latest = data[data.length-1];
    const diff = data.length>=2 ? (latest.val - data[data.length-2].val).toFixed(1) : null;
    const row = document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 0;';
    row.onclick=()=>{ selectedMedida=m.id; buildMedidaSelector(); buildMedidaChart(); updateBodyCanvas(); };
    const diffTxt = diff !== null ? `<span style="font-size:10px;color:${diff<=0?'var(--green)':'var(--red)'}">${diff>0?'+':''}${diff}</span>` : '';
    row.innerHTML=`<span style="font-size:13px">${m.icon}</span><div style="flex:1"><div style="font-size:11px;font-weight:700;color:var(--text2)">${m.label}</div></div><span style="font-size:13px;font-weight:900;color:${m.color}">${latest.val}</span><span style="font-size:10px;color:var(--text3)">${m.unit}</span>${diffTxt}`;
    el.appendChild(row);
  });
  if(!el.children.length){
    el.innerHTML='<div style="font-size:11px;color:var(--text3);line-height:1.7">Registre suas medidas<br>para ver aqui 📏</div>';
  }
}

function buildMedidaHistory() {
  const el = document.getElementById('medidaHistory');
  el.innerHTML='';
  const all = [];
  MEDIDAS_CONFIG.forEach(m=>{
    getMedidaData(m.id).forEach((r,i)=>all.push({...r, medida:m}));
  });
  all.sort((a,b)=>b.date.localeCompare(a.date)||(b.id||0)-(a.id||0));
  all.slice(0,20).forEach(r=>{
    const row=document.createElement('div');
    row.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;';
    row.innerHTML=`<span style="font-size:18px;">${r.medida.icon}</span>
      <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:var(--text);">${r.medida.label}</div><div style="font-size:10px;color:var(--text3);">${fmtDate(r.date)}</div></div>
      <span style="font-size:14px;font-weight:900;color:${r.medida.color};">${r.val} ${r.medida.unit}</span>
      <span style="font-size:16px;color:var(--text3);opacity:.4;">›</span>`;
    row.onclick=()=>showDeleteModal(r.medida.id, r.id, r.val, r.medida.unit, r.date);
    el.appendChild(row);
  });
  if(!all.length) el.innerHTML='<div style="font-size:12px;color:var(--text3);text-align:center;padding:20px 0;">Nenhum registro ainda 🌱</div>';
}

function updateProgressSummary() {
  document.getElementById('totalWorkouts').textContent = state.workouts.length;
  let total = 0;
  if(state.medidas) MEDIDAS_CONFIG.forEach(m=>{ total += (state.medidas[m.id]||[]).length; });
  document.getElementById('totalMedidas').textContent = total;
  document.getElementById('diasAtivos').textContent = Object.keys(state.weekDays||{}).filter(k=>state.weekDays[k]).length;
}

function buildWeightChart() { buildMedidaChart(); }