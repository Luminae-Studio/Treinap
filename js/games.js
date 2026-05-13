// ── PRÉ-CARREGAMENTO DE SPRITES ──
const IMG = {};
function preloadSprites() {
  const map = {
    idle: SPRITES.idle, peace: SPRITES.peace, sit: SPRITES.sit,
    walk0: SPRITES.walk1, walk1: SPRITES.walk2, walk2: SPRITES.walk3,
    selfie0: SPRITES.selfie1, selfie1: SPRITES.selfie2, selfie2: SPRITES.selfie3,
  };
  Object.entries(map).forEach(([k,src])=>{
    IMG[k] = new Image();
    IMG[k].src = src;
  });
}

// ── JOGOS — SHARED ──
function showJogo(jogo) {

function startCaminhada() {
  if(!cwDur){ toast('Selecione a duração!'); return; }
  const go = () => {
    document.getElementById('caminhada-lobby').style.display='none';
    document.getElementById('caminhada-active').style.display='block';
    document.getElementById('caminhada-victory').style.display='none';
    cwState = { start: Date.now(), passos: 0, lastMag: 0, cooldown: 0, meta: cwDur*60 };
    cwFrame=0; cwFrameT=0; cwSceneX=0; cwMoving=false; cwMovingTimer=0;
    cwMotion = (e)=>{
      const a = e.accelerationIncludingGravity||e.acceleration; if(!a) return;
      const mag = Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);
      const diff = Math.abs(mag - cwState.lastMag); cwState.lastMag = mag;
      if(diff>3.5 && cwState.cooldown<=0){ cwState.passos++; cwState.cooldown=8; }
      if(cwState.cooldown>0) cwState.cooldown--;
    };
    window.addEventListener('devicemotion', cwMotion);
    cwLoop();
  };
  if(typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function')
    DeviceMotionEvent.requestPermission().then(r=>{ if(r==='granted') go(); else go(); }).catch(go);
  else go();
}

function cwLoop() {
  const canvas = document.getElementById('caminhadaCanvas');
  if(!canvas||!cwState) return;
  const W = canvas.offsetWidth||360, H = Math.round(W*0.56);
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  const elapsed = (Date.now()-cwState.start)/1000;
  const pct = Math.min(1, elapsed/cwState.meta);
  const mins = Math.floor(elapsed/60), secs = Math.floor(elapsed%60);

  // detect motion
  const nowMoving = cwState.passos > cwMovingTimer;
  if(nowMoving) cwMovingTimer = cwState.passos;
  cwMoving = nowMoving;
  if(cwMoving||elapsed<2) cwSceneX += 2.2;

  // sprite animation
  cwFrameT++;
  if(cwFrameT>7){ cwFrameT=0; cwFrame=(cwFrame+1)%3; }

  // ── SKY ──
  const skyG = ctx.createLinearGradient(0,0,0,H*0.6);
  const hue = 200 + pct*60;
  skyG.addColorStop(0,`hsl(${hue},35%,${12+pct*10}%)`);
  skyG.addColorStop(1,`hsl(${hue+15},25%,${22+pct*8}%)`);
  ctx.fillStyle=skyG; ctx.fillRect(0,0,W,H);

  // stars (fade out with progress)
  if(pct<0.5){
    ctx.fillStyle=`rgba(255,255,255,${0.6*(1-pct*2)})`;
    [[25,18],[70,12],[130,25],[210,8],[270,20],[310,30]].forEach(([x,y])=>ctx.fillRect(x,y,2,2));
  }

  // sun rising
  const sunY = H*(0.5 - pct*0.3);
  ctx.shadowColor='rgba(255,220,80,0.4)'; ctx.shadowBlur=20;
  ctx.fillStyle=`hsl(${45+pct*10},90%,${60+pct*10}%)`;
  ctx.beginPath(); ctx.arc(W*0.82, sunY, 14+pct*6, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;

  // clouds
  ctx.fillStyle=`rgba(255,255,255,${0.08+pct*0.06})`;
  [[0.12,0.16],[0.45,0.10],[0.72,0.20]].forEach(([rx,ry],i)=>{
    const cx = ((rx*W + cwSceneX*(0.2+i*0.05))%(W+80)+W+80)%(W+80)-40;
    const cy = H*ry;
    ctx.beginPath(); ctx.ellipse(cx,cy,32,12,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+20,cy-5,22,10,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx-18,cy-3,16,8,0,0,Math.PI*2); ctx.fill();
  });

  // ── GROUND ──
  const gG = ctx.createLinearGradient(0,H*0.6,0,H);
  gG.addColorStop(0,'#2a5a18'); gG.addColorStop(1,'#1a3a0c');
  ctx.fillStyle=gG; ctx.fillRect(0,H*0.6,W,H);
  for(let px=0;px<W;px+=4){
    const gh=5+Math.sin(px*0.35+cwSceneX*0.08)*3;
    ctx.fillStyle=['#2d5a1b','#3d7a25','#4a8c30'][Math.floor(px/4)%3];
    ctx.fillRect(px,H*0.6-gh,4,gh+2);
  }

  // ── SCROLLING TREES ──
  [0,1,2,3].forEach(i=>{
    const tx = ((i*(W/3)+W*0.05 - cwSceneX*0.55)%(W+80)+W+80)%(W+80)-40;
    const ty = H*0.6;
    ctx.fillStyle='#1e3a10'; ctx.fillRect(tx-4,ty,8,26);
    ctx.fillStyle='#2a5a18';
    ctx.beginPath(); ctx.moveTo(tx,ty-32); ctx.lineTo(tx-16,ty+6); ctx.lineTo(tx+16,ty+6); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#356b20';
    ctx.beginPath(); ctx.moveTo(tx,ty-46); ctx.lineTo(tx-11,ty-18); ctx.lineTo(tx+11,ty-18); ctx.closePath(); ctx.fill();
  });

  // ── FLOWERS ALONG PATH ──
  const flowerEmojis=['🌻','🌸','🌷','🌺','💐'];
  [0,1,2,3].forEach(i=>{
    if(pct < i*0.22) return;
    const fx = ((i*120+40 - cwSceneX*0.4)%(W+60)+W+60)%(W+60)-30;
    ctx.font='16px sans-serif'; ctx.fillText(flowerEmojis[i%5], fx, H*0.68);
  });

  // milestone flags
  [0.25,0.5,0.75,1.0].forEach((mp,i)=>{
    if(pct >= mp){
      ctx.font='18px sans-serif';
      ctx.fillText(['🌱','💧','⭐','🏁'][i], W*(0.1+i*0.22), H*0.55);
    }
  });

  // ── AYELEN ──
  const sprKey = cwMoving ? `walk${cwFrame}` : 'idle';
  const sp = IMG[sprKey];
  if(sp && sp.complete && sp.naturalWidth>0){
    const sh = H*0.74, sw = sh*0.52;
    const sx = W*0.32 - sw/2, sy = H-sh-2;
    ctx.drawImage(sp, sx, sy, sw, sh);
  }

  // ── HUD ──
  document.getElementById('caminhadaTimer').textContent =
    `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  document.getElementById('caminhadaPassos').textContent = cwState.passos;
  document.getElementById('caminhadaPct').textContent = Math.round(pct*100)+'%';

  // progress bar
  const pb = document.getElementById('caminhadaProgressBar');
  if(pb) pb.style.width = Math.round(pct*100)+'%';

  if(elapsed >= cwState.meta){ finishCaminhada(); return; }
  cwRAF = requestAnimationFrame(cwLoop);
}

function stopCaminhada(){ finishCaminhada(); }

function finishCaminhada(){
  cancelAnimationFrame(cwRAF);
  window.removeEventListener('devicemotion', cwMotion);
  if(!cwState) return;
  const elapsed = Math.floor((Date.now()-cwState.start)/1000);
  const pct = Math.min(100, Math.round(elapsed/cwState.meta*100));
  const xp = Math.round(cwDur*2*(pct/100));
  const coins = Math.floor(cwDur*1.5*(pct/100));

  document.getElementById('caminhada-active').style.display='none';
  document.getElementById('caminhada-victory').style.display='block';

  // draw victory canvas
  const vc = document.getElementById('caminhadaVictoryCanvas');
  if(vc){ const ctx=vc.getContext('2d'); vc.width=300; vc.height=160;
    const g=ctx.createLinearGradient(0,0,0,160); g.addColorStop(0,'#1a1030'); g.addColorStop(1,'#2a1040');
    ctx.fillStyle=g; ctx.fillRect(0,0,300,160);
    ctx.fillStyle='rgba(255,255,255,0.5)';
    [[20,15],[60,30],[100,10],[200,20],[260,35]].forEach(([x,y])=>ctx.fillRect(x,y,2,2));
    ctx.fillStyle='#2a5a18'; ctx.fillRect(0,110,300,50);
    for(let px=0;px<300;px+=4){ ctx.fillStyle=['#2d5a1b','#3d7a25'][px%2]; ctx.fillRect(px,108,4,5); }
    // arc
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=10;
    ctx.beginPath(); ctx.arc(230,70,35,0,Math.PI*2); ctx.stroke();
    const col=pct>=100?'#f5c842':pct>=50?'#6dcc7a':'#c96fa8';
    ctx.strokeStyle=col; ctx.lineWidth=10;
    ctx.beginPath(); ctx.arc(230,70,35,-Math.PI/2,-Math.PI/2+Math.PI*2*(pct/100)); ctx.stroke();
    ctx.fillStyle=col; ctx.font='bold 14px Nunito,sans-serif'; ctx.textAlign='center';
    ctx.fillText(pct+'%',230,75); ctx.textAlign='left';
    if(IMG.peace&&IMG.peace.complete) ctx.drawImage(IMG.peace,40,30,65,100);
    ctx.font='20px sans-serif';
    if(pct>=25) ctx.fillText('🌻',10,115);
    if(pct>=50) ctx.fillText('🌸',40,115);
    if(pct>=75) ctx.fillText('🌷',70,115);
    if(pct>=100) ctx.fillText('🏆',100,115);
  }

  document.getElementById('victoryTitle').textContent = pct>=100?'🏆 Meta completa!':pct>=50?'💜 Boa caminhada!':'🌱 Continue assim!';
  document.getElementById('victoryMsg').textContent = `${cwState.passos} passos · ${Math.floor(elapsed/60)}m${elapsed%60}s · ${pct}% da meta`;
  document.getElementById('victoryXP').textContent = `+${xp} XP`;
  document.getElementById('victoryCoins').textContent = `+${coins} ⭐`;
  addXP(xp, coins, document.getElementById('victoryXP'));
  if(!state.caminhadaHistory) state.caminhadaHistory=[];
  state.caminhadaHistory.unshift({date:TODAY, passos:cwState.passos, elapsed, pct, dur:cwDur});
  save(state); cwState=null; buildCaminhadaHistory();
}

function resetCaminhada(){
  cancelAnimationFrame(cwRAF); cwState=null; cwDur=null;
  document.getElementById('caminhada-lobby').style.display='block';
  document.getElementById('caminhada-active').style.display='none';
  document.getElementById('caminhada-victory').style.display='none';
  document.querySelectorAll('#caminhadaDurBtns .dur-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById('startCaminhadaBtn').style.opacity='.5';
  document.getElementById('caminhadaReward').textContent='Selecione a duração para ver a recompensa';
}

function buildCaminhadaHistory(){
  const el=document.getElementById('caminhadaHistory'); el.innerHTML='';
  const hist=(state.caminhadaHistory||[]).slice(0,5);
  if(!hist.length){ el.innerHTML='<div style="font-size:11px;color:var(--text3);text-align:center;padding:12px 0;">Nenhuma caminhada ainda 🌱</div>'; return; }
  hist.forEach(h=>{
    const r=document.createElement('div');
    r.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);';
    r.innerHTML=`<span style="font-size:18px;">🚶</span><div style="flex:1;"><div style="font-size:12px;font-weight:700;">${h.passos} passos · ${h.pct}%</div><div style="font-size:10px;color:var(--text3);">${h.date} · ${Math.floor(h.elapsed/60)}min</div></div><span style="font-size:12px;font-weight:800;color:var(--gold);">+${Math.round(h.dur*2*(h.pct/100))} XP</span>`;
    el.appendChild(r);
  });
}

// ═══════════════════════════════════════
// JOGO 2: RUNNER — 3 RAIAS + TOQUE
// ═══════════════════════════════════════
let rState=null, rRAF=null;

const OBSTACLES=[
  {e:'🍔',h:38},{e:'🍟',h:36},{e:'🛋️',h:34},{e:'🌧️',h:34},
  {e:'🍕',h:36},{e:'🍰',h:38},{e:'🥤',h:40},{e:'📺',h:36},
];
const COLLECTIBLES=[
  {e:'💧',pts:10},{e:'🍎',pts:15},{e:'⭐',pts:25},{e:'💜',pts:20},
];

function getWeekScore(){
  const now=new Date(), dow=now.getDay(); let done=0;
  for(let i=0;i<7;i++){
    const d=new Date(now); d.setDate(now.getDate()-dow+i);
    if(state.weekDays&&state.weekDays[localDateStr(d)]) done++;
  }
  return done;
}

function buildRunnerLobby(){
  const wd=getWeekScore();
  document.getElementById('runnerBonus').innerHTML=
    `Semana atual: ${wd}/7 dias ✓ &nbsp;·&nbsp; Bônus: +${wd*10} ⭐`;
  buildRunnerHistory();
}

function startRunner(){
  const fs=document.getElementById('runner-fullscreen');
  fs.style.display='block';
  document.getElementById('runner-gameover').style.display='none';

  const canvas=document.getElementById('runnerCanvas');
  const W=canvas.offsetWidth||window.innerWidth;
  const H=canvas.offsetHeight||window.innerHeight;

  rState={
    W,H, lane:1, // 0=left 1=center 2=right
    laneX:[W*0.2, W*0.5, W*0.8],
    playerY:H*0.68, playerW:50, playerH:80,
    targetX:W*0.5,
    obstacles:[], collectibles:[],
    bgX:0, speed:3, dist:0, score:0, lives:3,
    spawnT:0, spawnInt:90,
    frame:0, frameT:0,
    hitCooldown:0, running:true,
    laneChangeAnim:0,
  };

  // touch controls
  canvas.ontouchstart = (e)=>{
    e.preventDefault();
    const tx=e.touches[0].clientX;
    if(tx < W/3) moveLane(-1);
    else if(tx > W*2/3) moveLane(1);
    else moveLane(Math.random()<0.5?-1:1); // tap center = random dodge
  };
  canvas.onclick=(e)=>{
    const tx=e.clientX;
    if(tx<W/3) moveLane(-1); else moveLane(1);
  };

  rRAF=requestAnimationFrame(rLoop);
}

function moveLane(dir){
  if(!rState) return;
  const newLane=Math.max(0,Math.min(2,rState.lane+dir));
  if(newLane===rState.lane) return;
  rState.lane=newLane;
  rState.targetX=rState.laneX[newLane];
  rState.laneChangeAnim=8;
}

function rLoop(){
  if(!rState||!rState.running) return;
  const canvas=document.getElementById('runnerCanvas');
  const W=canvas.offsetWidth||window.innerWidth;
  const H=canvas.offsetHeight||window.innerHeight;
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  const rs=rState;
  rs.W=W; rs.H=H;
  rs.laneX=[W*0.18,W*0.5,W*0.82];

  rs.dist++; rs.bgX+=rs.speed;
  rs.speed=Math.min(10, 3+rs.dist/400);
  rs.spawnT++;

  // smooth lane movement
  rs.targetX=rs.laneX[rs.lane];
  const playerX=rs.targetX; // snap for reliability

  // spawn
  if(rs.spawnT >= rs.spawnInt){
    rs.spawnT=0; rs.spawnInt=Math.max(40, 90-rs.dist/80);
    const lane=Math.floor(Math.random()*3);
    const lx=rs.laneX[lane];
    if(Math.random()<0.65){
      const o=OBSTACLES[Math.floor(Math.random()*OBSTACLES.length)];
      rs.obstacles.push({x:lx, y:-60, lane, emoji:o.e, h:o.h, vy:rs.speed+1.5});
    } else {
      const c=COLLECTIBLES[Math.floor(Math.random()*COLLECTIBLES.length)];
      rs.collectibles.push({x:lx, y:-40, lane, emoji:c.e, pts:c.pts, vy:rs.speed+1});
    }
  }

  // ── DRAW BG ──
  const bgG=ctx.createLinearGradient(0,0,0,H);
  bgG.addColorStop(0,'#0e0820'); bgG.addColorStop(0.6,'#1a1030'); bgG.addColorStop(1,'#1e1535');
  ctx.fillStyle=bgG; ctx.fillRect(0,0,W,H);

  // stars
  ctx.fillStyle='rgba(255,255,255,0.5)';
  [[0.08,0.05],[0.25,0.08],[0.45,0.03],[0.65,0.09],[0.85,0.05],[0.15,0.14],[0.55,0.12],[0.78,0.07]].forEach(([rx,ry])=>{
    ctx.fillRect(rx*W, ry*H, 2, 2);
  });

  // ground
  const gG=ctx.createLinearGradient(0,H*0.75,0,H);
  gG.addColorStop(0,'#2a5a18'); gG.addColorStop(1,'#1a3a0c');
  ctx.fillStyle=gG; ctx.fillRect(0,H*0.75,W,H);
  for(let px=0;px<W;px+=4){
    const gh=4+Math.sin(px*0.3+rs.bgX*0.1)*2;
    ctx.fillStyle=['#2d5a1b','#3d7a25'][Math.floor(px/4)%2];
    ctx.fillRect(px,H*0.75-gh,4,gh);
  }

  // lane lines (perspective)
  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1; ctx.setLineDash([20,20]);
  ctx.lineDashOffset=-rs.bgX*0.5;
  [0.33,0.67].forEach(rx=>{
    ctx.beginPath(); ctx.moveTo(W*rx,H*0.2); ctx.lineTo(W*rx,H*0.76); ctx.stroke();
  });
  ctx.setLineDash([]);

  // scrolling trees on sides
  [0,1,2].forEach(i=>{
    const tx=((i*(W/2) - rs.bgX*0.4)%(W+60)+W+60)%(W+60)-30;
    // left tree
    ctx.fillStyle='#1e3a10'; ctx.fillRect(tx-3,H*0.7,6,20);
    ctx.fillStyle='#2a5218';
    ctx.beginPath(); ctx.moveTo(tx,H*0.7-28); ctx.lineTo(tx-13,H*0.7+4); ctx.lineTo(tx+13,H*0.7+4); ctx.closePath(); ctx.fill();
    // right tree (mirror)
    const rtx=W-tx;
    ctx.fillRect(rtx-3,H*0.7,6,20);
    ctx.beginPath(); ctx.moveTo(rtx,H*0.7-28); ctx.lineTo(rtx-13,H*0.7+4); ctx.lineTo(rtx+13,H*0.7+4); ctx.closePath(); ctx.fill();
  });

  // lane highlight
  ctx.fillStyle=`rgba(201,111,168,0.07)`;
  ctx.fillRect(rs.laneX[rs.lane]-30,0,60,H);

  // ── OBSTACLES ──
  rs.obstacles=rs.obstacles.filter(ob=>{
    ob.y+=ob.vy;
    if(ob.y>H+60) return false;
    ctx.font=`${ob.h}px sans-serif`;
    ctx.fillText(ob.emoji, ob.x-ob.h*0.5, ob.y);
    // collision
    if(rs.hitCooldown<=0 && ob.lane===rs.lane && ob.y>H*0.55 && ob.y<H*0.82){
      rs.lives--; rs.hitCooldown=60;
      if(rs.lives<=0){ endRunner(); return false; }
    }
    return true;
  });

  // ── COLLECTIBLES ──
  rs.collectibles=rs.collectibles.filter(col=>{
    col.y+=col.vy;
    if(col.y>H+40) return false;
    ctx.font='28px sans-serif';
    ctx.fillText(col.emoji, col.x-14, col.y);
    if(col.lane===rs.lane && col.y>H*0.55 && col.y<H*0.82){
      rs.score+=col.pts; return false;
    }
    return true;
  });

  if(rs.hitCooldown>0) rs.hitCooldown--;

  // ── AYELEN SPRITE ──
  rs.frameT++;
  if(rs.frameT>6){ rs.frameT=0; rs.frame=(rs.frame+1)%3; }
  const skey=`walk${rs.frame}`;
  const sp=IMG[skey];
  const flash=rs.hitCooldown>0&&Math.floor(rs.hitCooldown/5)%2===0;
  if(!flash && sp&&sp.complete&&sp.naturalWidth>0){
    const sh=H*0.46, sw=sh*0.52;
    ctx.drawImage(sp, playerX-sw/2, rs.playerY-sh, sw, sh);
  }

  // ── LANE TOUCH HINTS ──
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.font='28px sans-serif';
  if(rs.lane>0) ctx.fillText('◀', W*0.04, H*0.72);
  if(rs.lane<2) ctx.fillText('▶', W*0.88, H*0.72);

  // ── HUD ──
  document.getElementById('runnerScore').textContent=rs.score;
  document.getElementById('runnerDist').textContent=Math.floor(rs.dist/10)+'m';
  document.getElementById('runnerLivesHUD').textContent='❤️'.repeat(rs.lives)+'🖤'.repeat(3-rs.lives);

  rRAF=requestAnimationFrame(rLoop);
}

function endRunner(){
  if(rRAF) cancelAnimationFrame(rRAF); rRAF=null;
  if(!rState) return;
  rState.running=false;
  const rs=rState;
  const weekBonus=getWeekScore()*10;
  const xp=Math.floor(rs.score*0.5);
  const coins=Math.floor(rs.score*0.3)+weekBonus;
  const dist=Math.floor(rs.dist/10);

  const go=document.getElementById('runner-gameover');
  go.style.display='flex';
  document.getElementById('gameoverTitle').textContent=dist>500?'Lendária! 🏆':dist>200?'Incrível! 🎉':'Boa corrida! 💜';
  document.getElementById('gameoverMsg').textContent=`${dist}m · ${rs.score} pts${weekBonus?` · +${weekBonus} bônus`:''}`;
  document.getElementById('gameoverXP').textContent=`+${xp} XP`;
  document.getElementById('gameoverCoins').textContent=`+${coins} ⭐`;
  addXP(xp,coins,document.getElementById('gameoverXP'));
  if(!state.runnerHistory) state.runnerHistory=[];
  state.runnerHistory.unshift({date:TODAY,dist,score:rs.score,xp});
  if(state.runnerHistory.length>10) state.runnerHistory=state.runnerHistory.slice(0,10);
  save(state); buildRunnerHistory();
}

function resetRunner(){
  if(rRAF) cancelAnimationFrame(rRAF); rRAF=null; rState=null;
  const canvas=document.getElementById('runnerCanvas');
  canvas.ontouchstart=null; canvas.onclick=null;
  document.getElementById('runner-fullscreen').style.display='none';
  document.getElementById('runner-gameover').style.display='none';
  buildRunnerLobby();
}

function buildRunnerHistory(){
  const el=document.getElementById('runnerHistory'); el.innerHTML='';
  const hist=(state.runnerHistory||[]).slice(0,5);
  if(!hist.length){ el.innerHTML='<div style="font-size:11px;color:var(--text3);text-align:center;padding:12px 0;">Nenhuma corrida ainda 🏃</div>'; return; }
  hist.forEach(h=>{
    const r=document.createElement('div');
    r.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);';
    r.innerHTML=`<span style="font-size:18px;">🏃</span><div style="flex:1;"><div style="font-size:12px;font-weight:700;">${h.dist}m · ${h.score} pts</div><div style="font-size:10px;color:var(--text3);">${h.date}</div></div><span style="font-size:12px;font-weight:800;color:var(--gold);">+${h.xp} XP</span>`;
    el.appendChild(r);
  });
}
  document.getElementById('jogo-caminhada').style.display = jogo==='caminhada'?'block':'none';
  document.getElementById('jogo-runner').style.display = jogo==='runner'?'block':'none';
  const btnC = document.getElementById('jogo-caminhada-btn');
  const btnR = document.getElementById('jogo-runner-btn');
  if(jogo==='caminhada'){ btnC.style.background='var(--accent)'; btnC.style.color='#fff'; btnR.style.background='transparent'; btnR.style.color='var(--text3)'; }
  else { btnR.style.background='var(--accent)'; btnR.style.color='#fff'; btnC.style.background='transparent'; btnC.style.color='var(--text3)'; }
  if(jogo==='runner') buildRunnerLobby();
  if(jogo==='caminhada') buildCaminhadaHistory();
}

function buildJogosTab() {
  showJogo('caminhada');
  buildCaminhadaHistory();
}

// ─────────────────────────────────
// ── TABS ──
function showTab(tab) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  event.target.classList.add('active');
  if(tab==='jardim') { setTimeout(buildGarden,50); playSprite('sit'); }
  else if(tab==='treino') { buildWorkoutTypes(); buildWorkoutHistory(); playSprite('walk'); }
  else if(tab==='progresso') { setTimeout(()=>{ showSubtab('geral'); buildMedidaSelector(); updateProgressSummary(); },50); }
  else if(tab==='loja') buildShop();
  else { playSprite('idle'); }
}

// ── INIT ──
function init() {
  preloadSprites();
  document.getElementById('charSprite').src = SPRITES.idle;
  playSprite('idle');
  updateCharUI();
  buildDateStrip();
  buildWater();
  buildHabits();
  updateTodayXP();
  updateStreakProgress();
  setTimeout(buildWeightChart,100);
  document.getElementById('totalWorkouts').textContent = state.workouts.length;
  updateProgressSummary();
}

window.addEventListener('resize', ()=>{
  if(document.getElementById('tab-jardim').classList.contains('active')) drawGarden();
  if(document.getElementById('tab-progresso').classList.contains('active')) buildMedidaChart();
});

init();