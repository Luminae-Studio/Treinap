/* jardim.js — Jardim Interativo Animado
 * Lê o state do localStorage a cada 30s.
 * Só leitura: nunca escreve no localStorage.
 */
(function () {
  'use strict';

  const STORAGE_KEY   = 'ayelen_v1';
  const REFRESH_MS    = 30_000;
  const XP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200];

  let gs            = {};
  let lastRefreshTs = -Infinity;
  let tooltip       = null;   // { lines[], cx, cy, ttl }
  let raf           = null;
  let plants        = [];
  let lastW         = 360;

  /* ── Helpers ─────────────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * (t < 0 ? 0 : t > 1 ? 1 : t); }

  function refreshState() {
    try { gs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { gs = {}; }
    lastRefreshTs = performance.now();
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getXpLevel(xp) {
    let lv = 0;
    for (let i = 0; i < XP_THRESHOLDS.length; i++) {
      if ((xp || 0) >= XP_THRESHOLDS[i]) lv = i;
    }
    return lv;
  }

  /* ── Plant Config ────────────────────────────────────────── */
  function buildPlants(W, H) {
    const today    = todayKey();
    const waterMeta = gs.waterMeta || 8;
    const cups      = (gs.water || {})[today] || 0;
    const waterPct  = Math.min(1, cups / waterMeta);

    const trainedToday = (gs.workouts || []).some(w => w.date === today);

    const habitDone   = (gs.habits || {})[today] || {};
    const customCount = (gs.customHabits || []).length;
    const habitTotal  = 4 + customCount;
    const habitsDone  = Object.values(habitDone).filter(Boolean).length;
    const habitPct    = habitTotal > 0 ? Math.min(1, habitsDone / habitTotal) : 0;

    const streak   = gs.streak || 0;
    const xp       = gs.xp || 0;
    const xpLevel  = getXpLevel(xp);

    const GY = H * 0.68;

    return [
      {
        id: 'sunflower', emoji: '🌻', label: 'Girassol',
        x: W * 0.14, groundY: GY,      hitCY: GY - 48, hitR: 24,
        pct: waterPct,                  wilted: cups === 0,
        status: `${cups}/${waterMeta} copos hoje`,
      },
      {
        id: 'fern', emoji: '🌿', label: 'Samambaia',
        x: W * 0.33, groundY: GY,      hitCY: GY - 22, hitR: 24,
        pct: habitPct,                  wilted: habitsDone === 0,
        status: `${habitsDone}/${habitTotal} hábitos`,
      },
      {
        id: 'tree', emoji: '🌳', label: 'Árvore central',
        x: W * 0.52, groundY: GY - 8,  hitCY: GY - 62, hitR: 30,
        pct: xpLevel / 6,               wilted: false,
        status: `Nível ${xpLevel} · ${xp} XP`,
        extra: xpLevel,
      },
      {
        id: 'mushroom', emoji: '🍄', label: 'Cogumelo',
        x: W * 0.70, groundY: GY + 4,  hitCY: GY - 12, hitR: 22,
        pct: Math.min(streak, 7) / 7,  wilted: streak === 0,
        status: streak === 0 ? 'Sem streak ainda' : `${streak} dia${streak !== 1 ? 's' : ''} seguidos`,
        extra: streak,
      },
      {
        id: 'cherry', emoji: '🌸', label: 'Cerejeira',
        x: W * 0.87, groundY: GY - 6,  hitCY: GY - 54, hitR: 28,
        pct: trainedToday ? 1 : 0.05,  wilted: !trainedToday,
        status: trainedToday ? 'Treino concluído ✓' : 'Sem treino hoje',
      },
    ];
  }

  /* ── Sky & Ciclo Dia/Noite ───────────────────────────────── */
  // Usa getHours() (horário local do dispositivo), não getUTCHours()
  function drawSky(ctx, W, H) {
    const now  = new Date();
    const h    = now.getHours() + now.getMinutes() / 60;
    let h1, s1, l1, h2, s2, l2;

    if (h < 5) {                         // madrugada
      [h1,s1,l1, h2,s2,l2] = [270,55,8, 280,45,16];
    } else if (h < 7) {                  // pré-amanhecer
      const t = (h - 5) / 2;
      [h1,s1,l1] = [lerp(270,205,t), lerp(55,70,t), lerp(8,35,t)];
      [h2,s2,l2] = [lerp(280,195,t), lerp(45,58,t), lerp(16,50,t)];
    } else if (h < 9) {                  // amanhecer
      const t = (h - 7) / 2;
      [h1,s1,l1] = [lerp(205,205,t), lerp(70,75,t), lerp(35,55,t)];
      [h2,s2,l2] = [lerp(195,190,t), lerp(58,62,t), lerp(50,68,t)];
    } else if (h < 17) {                 // dia pleno — céu azul claro
      [h1,s1,l1, h2,s2,l2] = [205,75,55, 190,62,68];
    } else if (h < 19) {                 // tarde / pôr do sol
      const t = (h - 17) / 2;
      [h1,s1,l1] = [lerp(205,28,t), lerp(75,78,t), lerp(55,42,t)];
      [h2,s2,l2] = [lerp(190,18,t), lerp(62,68,t), lerp(68,55,t)];
    } else if (h < 21) {                 // anoitecer
      const t = (h - 19) / 2;
      [h1,s1,l1] = [lerp(28,270,t), lerp(78,55,t), lerp(42,8,t)];
      [h2,s2,l2] = [lerp(18,280,t), lerp(68,45,t), lerp(55,16,t)];
    } else {                             // noite
      [h1,s1,l1, h2,s2,l2] = [270,55,8, 280,45,16];
    }

    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.58);
    grad.addColorStop(0, `hsl(${h1},${s1}%,${l1}%)`);
    grad.addColorStop(1, `hsl(${h2},${s2}%,${l2}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.58);

    // estrelas (horas escuras)
    const isDark = h < 7 || h > 20;
    if (isDark) {
      const sa = h < 7 ? Math.min(1, (7 - h) / 1.5) : Math.min(1, (h - 20) / 1.5);
      ctx.fillStyle = `rgba(255,255,255,${sa * 0.85})`;
      [[.07,.09],[.20,.06],[.33,.15],[.46,.04],[.60,.10],
       [.73,.06],[.87,.14],[.14,.23],[.41,.19],[.68,.21]
      ].forEach(([rx, ry]) => ctx.fillRect(rx * W, ry * H, 2, 2));
    }

    // sol
    if (h >= 7 && h < 19) {
      const prog  = (h - 7) / 12;
      const sx    = W * lerp(0.1, 0.9, prog);
      const sy    = H * (0.38 - Math.sin(prog * Math.PI) * 0.28);
      const alpha = Math.min(1, Math.min(h - 7, 19 - h) / 1.5);
      const warm  = prog < 0.15 || prog > 0.85;
      const sc    = warm ? [255,160,64] : [255,228,80];

      ctx.save();
      ctx.globalAlpha = Math.max(0.2, alpha);
      const grd = ctx.createRadialGradient(sx, sy, 4, sx, sy, 32);
      grd.addColorStop(0, `rgba(${sc},0.35)`);
      grd.addColorStop(1, 'rgba(255,180,50,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(sx, sy, 32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgb(${sc})`;
      ctx.beginPath(); ctx.arc(sx, sy, 13, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      // lua com quarto-crescente
      const mx = W * 0.82, my = H * 0.17;
      ctx.fillStyle = '#f5e8a8';
      ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `hsl(${h1},${s1}%,${Math.min(l1 + 7, 26)}%)`;
      ctx.beginPath(); ctx.arc(mx + 5, my - 2, 11, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ── Chão ────────────────────────────────────────────────── */
  function drawGround(ctx, W, H) {
    const gg = ctx.createLinearGradient(0, H * 0.55, 0, H);
    gg.addColorStop(0,    '#1e4010');
    gg.addColorStop(0.35, '#2a5a18');
    gg.addColorStop(1,    '#1a3a0c');
    ctx.fillStyle = gg;
    ctx.fillRect(0, H * 0.55, W, H * 0.45 + 2);

    const gc = ['#2d5a1b','#356b20','#3d7a25','#2a5018','#4a8c30'];
    for (let px = 0; px < W; px += 4) {
      const gh = 5 + Math.sin(px * 0.31) * 3 + Math.sin(px * 0.17 + 1) * 2;
      ctx.fillStyle = gc[Math.floor(px / 4) % gc.length];
      ctx.fillRect(px, H * 0.55 - gh, 4, gh + 2);
    }
  }

  /* ── Flores de Memória (state.flowers) ───────────────────── */
  const MEM_COLORS = {
    sunflower: '#f5c842', rose: '#e03355', lavender: '#9b7ec8',
    daisy: '#ffffff',     tulip: '#f070a0', cherry:   '#d42020',
  };

  const MEM_SLOTS = [
    [.05,.74],[.10,.71],[.17,.75],[.23,.72],
    [.59,.73],[.64,.71],[.71,.74],[.77,.72],
    [.42,.76],[.52,.74],
  ];

  function drawMemoryFlowers(ctx, W, H) {
    const flowers = gs.flowers || [];
    ctx.save();
    ctx.globalAlpha = 0.5;
    flowers.forEach((f, i) => {
      if (i >= MEM_SLOTS.length) return;
      const fx = MEM_SLOTS[i][0] * W;
      const fy = MEM_SLOTS[i][1] * H;
      const col = MEM_COLORS[f.type] || '#c96fa8';
      ctx.strokeStyle = '#4a7820'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 15); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(fx, fy - 18, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(fx - 1, fy - 19, 2.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  /* ── Girassol (água) ─────────────────────────────────────── */
  function drawSunflower(ctx, x, y, pct, wilted, t) {
    const sway  = Math.sin(t * 0.9 + 1.0) * (wilted ? 0.20 : 0.07);
    const stemH = wilted ? 36 : 42 + pct * 14;

    ctx.save();
    ctx.translate(x, y);
    ctx.save();
    ctx.rotate(sway);

    ctx.strokeStyle = wilted ? '#4a7220' : '#5a9e3a';
    ctx.lineWidth   = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    if (wilted) {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(2, -stemH * 0.3, 12, -stemH * 0.65, 8, -stemH);
    } else {
      ctx.moveTo(0, 0); ctx.lineTo(0, -stemH);
    }
    ctx.stroke();

    if (!wilted && pct > 0.15) {
      ctx.fillStyle = '#4a8a28';
      ctx.beginPath();
      ctx.ellipse(-9, -stemH * 0.44, 9, 4, -0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(wilted ? 8 : 0, -stemH);
    if (wilted) ctx.rotate(0.68);

    const cr = wilted ? 4 : 5 + pct * 3;
    if (pct > 0) {
      const petals = Math.max(4, Math.round(pct * 8));
      const pLen   = 5 + pct * 7;
      for (let i = 0; i < petals; i++) {
        ctx.save();
        ctx.rotate((i / petals) * Math.PI * 2);
        const gv = Math.round(lerp(140, 220, pct));
        ctx.fillStyle = `rgba(245,${gv},40,${wilted ? 0.35 : 0.55 + pct * 0.45})`;
        ctx.beginPath();
        ctx.ellipse(0, -(cr + pLen * 0.45), 2.5 + pct * 2, pLen, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.fillStyle = wilted ? '#5a2a08' : '#6b3010';
    ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = wilted ? '#7a3a10' : '#8B4513';
    ctx.beginPath(); ctx.arc(0, 0, cr * 0.65, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  /* ── Samambaia (hábitos) ─────────────────────────────────── */
  function drawFern(ctx, x, y, pct, wilted, t) {
    const fronds = Math.max(1, Math.round(1 + pct * 4));
    const sway   = Math.sin(t * 0.65 + 2.1) * 0.08;
    const green  = wilted
      ? ['#3a5820','#486828']
      : ['#4a9a28','#5cb038','#6acc45'];

    ctx.save();
    ctx.translate(x, y);

    for (let i = 0; i < fronds; i++) {
      const angle = -Math.PI / 2 + (i - (fronds - 1) / 2) * 0.44;
      const fLen  = 20 + pct * 20;
      ctx.save();
      ctx.rotate(angle + sway + Math.sin(t * 0.5 + i) * 0.03);
      ctx.strokeStyle = green[i % green.length];
      ctx.lineWidth   = 1.8;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(fLen * 0.5, -fLen * 0.3, fLen, 0);
      ctx.stroke();

      const leafN = Math.round(3 + pct * 4);
      for (let j = 1; j < leafN; j++) {
        const lt = j / leafN;
        const lx = lerp(0, fLen, lt);
        const ly = -(Math.sin(lt * Math.PI) * fLen * 0.3);
        ctx.fillStyle = green[(i + j) % green.length];
        ctx.beginPath();
        ctx.ellipse(lx, ly, 5 + pct * 3, 2.5 + pct, angle * 0.2 + lt, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ── Árvore Central (XP level) ───────────────────────────── */
  function drawTree(ctx, x, y, level, t) {
    const sway   = Math.sin(t * 0.45 + 0.5) * 0.04;
    const trunkH = 30 + level * 8;
    const crownR = 18 + level * 8;
    const layerN = 2 + Math.floor(level / 2);
    const greens = ['#2a5a18','#356b20','#4a8c30','#5aa038','#3d7a25','#6ab840'];

    ctx.save();
    ctx.translate(x, y);

    const tw = 5 + level;
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.moveTo(-tw / 2, 0);
    ctx.quadraticCurveTo(-tw / 2 - 1, -trunkH * 0.5, -tw * 0.4, -trunkH);
    ctx.lineTo(tw * 0.4, -trunkH);
    ctx.quadraticCurveTo(tw / 2 + 1, -trunkH * 0.5, tw / 2, 0);
    ctx.fill();

    ctx.save();
    ctx.rotate(sway);

    for (let li = layerN; li >= 0; li--) {
      const ly = -trunkH - li * (crownR * 0.48);
      const lr = Math.max(crownR * (1 - li * 0.14), 5);
      ctx.fillStyle = greens[(layerN - li) % greens.length];
      ctx.beginPath(); ctx.arc(0, ly, lr, 0, Math.PI * 2); ctx.fill();
    }

    // brilhos em nível alto
    if (level >= 4) {
      const sa = 0.3 + Math.sin(t * 2.5) * 0.25;
      ctx.fillStyle = `rgba(245,200,66,${sa})`;
      [[-crownR*.55, -trunkH - crownR*.75],
       [ crownR*.5,  -trunkH - crownR*.6 ],
       [0,           -trunkH - crownR*1.05]
      ].forEach(([sx, sy]) => {
        const sr = 1.5 + Math.sin(t * 3.2 + sx) * 1;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      });
    }

    ctx.restore();
    ctx.restore();
  }

  /* ── Cogumelo (streak) ───────────────────────────────────── */
  function drawMushroom(ctx, x, y, pct, wilted, t) {
    const count = pct < 0.29 ? 1 : pct < 0.58 ? 2 : 3;
    const sc    = 0.55 + pct * 0.9;
    const sway  = Math.sin(t * 0.75 + 3.2) * 0.05;

    const offsets = count === 1 ? [[0,0,1.0]]
      : count === 2 ? [[-10,0,0.85],[8,-3,1.1]]
      : [[-13,1,0.80],[0,-5,1.15],[12,0,0.90]];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);

    offsets.forEach(([ox, oy, szi]) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sc * szi, sc * szi);

      ctx.fillStyle = wilted ? '#c0aa88' : '#e0d0b0';
      ctx.beginPath();
      ctx.moveTo(-3.5, 0); ctx.lineTo(-3,-12); ctx.lineTo(3,-12); ctx.lineTo(3.5, 0);
      ctx.fill();

      const capC = wilted ? '#884030' : '#cc3030';
      ctx.fillStyle = capC;
      ctx.beginPath(); ctx.ellipse(0,-12,11,4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = wilted ? '#aa5040' : '#e04040';
      ctx.beginPath();
      ctx.moveTo(-11,-12); ctx.quadraticCurveTo(0,-25,11,-12); ctx.fill();
      ctx.fillStyle = capC;
      ctx.beginPath(); ctx.ellipse(0,-12,11,3,0,0,Math.PI*2); ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [[-3.5,-16.5],[3.2,-14.5],[0,-21]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    });
    ctx.restore();
  }

  /* ── Cerejeira (treino) ──────────────────────────────────── */
  // Posições fixas das flores (determinístico — sem Math.random no loop)
  const BLOSSOM_POS = [
    [-22,-48],[-17,-56],[-26,-60],[-30,-52],[-12,-57],
    [ 18,-44],[ 23,-52],[ 22,-61],[ 28,-55],[ 14,-50],
    [-10,-65],[-15,-71],[ -5,-69],[-19,-64],
    [  8,-63],[ 13,-71],[  5,-68],[ 17,-64],
  ];

  function drawCherryTree(ctx, x, y, bloomed, t) {
    const sway = Math.sin(t * 0.5 + 4.0) * 0.05;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#5a3018';
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.lineTo(-3,-44); ctx.lineTo(0,-50);
    ctx.lineTo(3,-44); ctx.lineTo(5, 0); ctx.fill();

    ctx.save();
    ctx.rotate(sway);

    ctx.strokeStyle = '#5a3018'; ctx.lineCap = 'round';
    [
      { y0:-40, cx:-12, ex:-24, ey:-56 },
      { y0:-42, cx: 10, ex: 22, ey:-52 },
      { y0:-47, cx: -8, ex:-16, ey:-64 },
      { y0:-50, cx:  6, ex: 10, ey:-65 },
    ].forEach(({ y0, cx, ex, ey }) => {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.quadraticCurveTo(cx, (y0 + ey) / 2, ex, ey);
      ctx.stroke();
    });

    if (bloomed) {
      BLOSSOM_POS.forEach(([bx, by], i) => {
        const pulse = 0.7 + Math.sin(t * 1.3 + i * 0.4) * 0.12;
        const gv    = 165 + Math.round(Math.sin(i * 1.7) * 12);
        ctx.fillStyle = `rgba(255,${gv},195,${pulse})`;
        ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,240,0.55)';
        ctx.beginPath(); ctx.arc(bx - 0.5, by - 0.5, 2, 0, Math.PI * 2); ctx.fill();
      });

      // pétalas caindo (4, posições determinísticas)
      for (let p = 0; p < 4; p++) {
        const cycle = (t * 0.28 + p * 0.67) % 1;
        const px2   = -18 + p * 13 + Math.sin(t * 0.8 + p * 1.5) * 9;
        const py2   = lerp(-65, 8, cycle);
        ctx.fillStyle = `rgba(255,180,200,${0.75 - cycle * 0.6})`;
        ctx.save();
        ctx.translate(px2, py2);
        ctx.rotate(t * 1.5 + p * 0.8);
        ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else {
      BLOSSOM_POS.slice(0, 8).forEach(([bx, by]) => {
        ctx.fillStyle = 'rgba(140,70,80,0.6)';
        ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
      });
    }

    ctx.restore();
    ctx.restore();
  }

  /* ── Itens da Loja no Canvas ────────────────────────────── */
  function getOwnedItemLevel(itemId) {
    const purchase = (gs.itemPurchases || {})[itemId];
    if (!purchase) return 0;
    const days = Math.floor((Date.now() - purchase.ts) / (1000 * 60 * 60 * 24));
    if (days >= 30) return 3;
    if (days >= 14) return 2;
    if (days >= 7)  return 1;
    return 0;
  }

  function drawShopItems(ctx, W, H) {
    const owned = gs.owned || [];
    if (!owned.length) return;
    const shopItems = (typeof SHOP_ITEMS !== 'undefined') ? SHOP_ITEMS : [];
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    owned.forEach(id => {
      const item = shopItems.find(s => s.id === id);
      if (!item) return;
      const level = getOwnedItemLevel(id);
      const icon  = item.levels[Math.min(level, item.levels.length - 1)];
      ctx.font = `26px "Apple Color Emoji","Segoe UI Emoji",serif`;
      ctx.fillText(icon, item.gx * W, item.gy * H);
    });
    ctx.restore();
  }

  /* ── Dispatch ────────────────────────────────────────────── */
  function drawPlant(ctx, p, t) {
    switch (p.id) {
      case 'sunflower': drawSunflower(ctx, p.x, p.groundY, p.pct, p.wilted, t); break;
      case 'fern':      drawFern(ctx,      p.x, p.groundY, p.pct, p.wilted, t); break;
      case 'tree':      drawTree(ctx,      p.x, p.groundY, p.extra || 0,    t); break;
      case 'mushroom':  drawMushroom(ctx,  p.x, p.groundY, p.pct, p.wilted, t); break;
      case 'cherry':    drawCherryTree(ctx, p.x, p.groundY, !p.wilted,      t); break;
    }
  }

  /* ── Tooltip ─────────────────────────────────────────────── */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawTooltip(ctx, W) {
    if (!tooltip) return;
    tooltip.ttl -= 1;
    if (tooltip.ttl <= 0) { tooltip = null; return; }

    const alpha  = tooltip.ttl < 30 ? tooltip.ttl / 30 : 1;
    const pad    = 9;
    const fs1    = 12, fs2 = 11;
    const lineH1 = fs1 + 6, lineH2 = fs2 + 5;
    const boxW   = 140;
    const boxH   = lineH1 + lineH2 + pad * 2;

    let tx = Math.max(4, Math.min(W - boxW - 4, tooltip.cx - boxW / 2));
    let ty = Math.max(4, tooltip.cy - boxH - 14);

    ctx.save();
    ctx.globalAlpha   = alpha;
    ctx.shadowColor   = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur    = 10;
    ctx.fillStyle     = '#2a1d3a';
    ctx.strokeStyle   = 'rgba(201,111,168,0.65)';
    ctx.lineWidth     = 1;
    roundRect(ctx, tx, ty, boxW, boxH, 9);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#f0e6ff';
    ctx.font = `800 ${fs1}px 'Nunito',sans-serif`;
    ctx.fillText(tooltip.lines[0], tx + boxW / 2, ty + pad);
    ctx.fillStyle = '#b89dcc';
    ctx.font = `${fs2}px 'Nunito',sans-serif`;
    ctx.fillText(tooltip.lines[1] || '', tx + boxW / 2, ty + pad + lineH1);
    ctx.restore();
  }

  /* ── Hit Test ────────────────────────────────────────────── */
  function hitTest(cx, cy) {
    for (const p of plants) {
      const dx = cx - p.x, dy = cy - p.hitCY;
      if (dx * dx + dy * dy <= p.hitR * p.hitR) return p;
    }
    return null;
  }

  /* ── Loop rAF ────────────────────────────────────────────── */
  function frame(ts) {
    const canvas = document.getElementById('jardimCanvas');
    if (!canvas) { raf = null; return; }

    // Atualiza state a cada 30 segundos
    if (ts - lastRefreshTs >= REFRESH_MS) refreshState();

    const W = canvas.offsetWidth > 0 ? canvas.offsetWidth : lastW;
    if (canvas.offsetWidth > 0) lastW = W;
    if (canvas.width  !== W)   canvas.width  = W;
    if (canvas.height !== 220) canvas.height = 220;

    const H   = 220;
    const ctx = canvas.getContext('2d');
    const t   = ts * 0.001;

    plants = buildPlants(W, H);

    drawSky(ctx, W, H);
    drawGround(ctx, W, H);
    drawShopItems(ctx, W, H);
    drawMemoryFlowers(ctx, W, H);
    plants.forEach(p => drawPlant(ctx, p, t));
    drawTooltip(ctx, W);

    raf = requestAnimationFrame(frame);
  }

  /* ── Eventos touch / click ───────────────────────────────── */
  function handleTap(canvas, clientX, clientY) {
    const rect  = canvas.getBoundingClientRect();
    const sx    = canvas.width  / (rect.width  || 1);
    const sy    = canvas.height / (rect.height || 1);
    const cx    = (clientX - rect.left) * sx;
    const cy    = (clientY - rect.top)  * sy;
    const hit   = hitTest(cx, cy);
    if (hit) {
      tooltip = {
        lines: [`${hit.emoji} ${hit.label}`, hit.status],
        cx:    hit.x,
        cy:    hit.hitCY,
        ttl:   200, // ~3.3 s a 60 fps
      };
    }
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    refreshState();

    const canvas = document.getElementById('jardimCanvas');
    if (!canvas) return;

    canvas.addEventListener('click', e =>
      handleTap(canvas, e.clientX, e.clientY));

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (e.touches[0]) handleTap(canvas, e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    // Neutraliza o drawGarden estático do garden.js para não sobrescrever a animação
    if (typeof window.drawGarden === 'function') {
      window.drawGarden = function () {};
    }

    if (raf !== null) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
