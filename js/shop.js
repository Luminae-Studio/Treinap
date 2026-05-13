// ── SHOP ──
function buildShop() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML='';
  SHOP_ITEMS.forEach(item=>{
    const owned = (state.owned||[]).includes(item.id);
    const lvl = owned ? getItemLevel(item.id) : 0;
    const currentIcon = owned ? item.levels[Math.min(lvl, item.levels.length-1)] : item.icon;
    const el = document.createElement('div');
    el.style.cssText=`background:var(--card);border:1px solid ${owned?'rgba(109,204,122,0.35)':'var(--border)'};border-radius:14px;padding:14px;text-align:center;position:relative;transition:all .2s;cursor:${owned?'default':'pointer'};`;
    if(owned) {
      const lvlPct = Math.round((lvl/3)*100);
      const lvlNames = ['Recém chegado','Enraizado','Florescendo','Lendário'];
      const purchase = (state.itemPurchases||{})[item.id];
      const days = purchase ? Math.floor((Date.now()-purchase.ts)/(1000*60*60*24)) : 0;
      el.innerHTML=`
        <div style="position:absolute;top:8px;right:10px;font-size:11px;color:var(--green);font-weight:900;">✓</div>
        <div style="font-size:36px;margin-bottom:6px;">${currentIcon}</div>
        <div style="font-size:11px;font-weight:800;color:var(--text);margin-bottom:2px;">${item.name}</div>
        <div style="font-size:9px;color:var(--green);font-weight:700;margin-bottom:6px;">No jardim · ${lvlNames[lvl]}</div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-bottom:3px;">
          <span>Nível ${lvl+1}/4</span><span>${days}d no jardim</span>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:5px;overflow:hidden;">
          <div style="height:100%;width:${lvlPct}%;background:${lvl>=3?'var(--gold)':lvl>=2?'var(--accent)':'var(--green)'};border-radius:4px;transition:width .6s;"></div>
        </div>
        <div style="font-size:9px;color:var(--text3);margin-top:3px;">${lvl<3?`Próx nível em ${lvl===0?7:lvl===1?14:30} dias`:'Nível máximo! ✨'}</div>`;
    } else {
      el.innerHTML=`
        <div style="font-size:36px;margin-bottom:6px;">${item.icon}</div>
        <div style="font-size:11px;font-weight:800;color:var(--text);margin-bottom:4px;">${item.name}</div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:10px;line-height:1.4;">${item.desc}</div>
        <div style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,200,66,0.12);border:1px solid rgba(245,200,66,0.3);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:900;color:var(--gold);">⭐ ${item.price}</div>`;
      el.onclick=()=>buyItem(item);
    }
    grid.appendChild(el);
  });
}

function buyItem(item) {
  if((state.coins||0) < item.price) {
    toast(`Precisa de ⭐ ${item.price} — você tem ${state.coins||0}`); return;
  }
  state.coins -= item.price;
  if(!state.owned) state.owned=[];
  state.owned.push(item.id);
  // guarda timestamp da compra para calcular nível por tempo
  if(!state.itemPurchases) state.itemPurchases={};
  state.itemPurchases[item.id] = {ts: Date.now(), date: TODAY};
  save(state);
  toast(`${item.icon} ${item.name} apareceu no jardim! 🌸`);
  playSprite('celebrate', false);
  updateCharUI();
  buildShop();
  // mostra no jardim imediatamente
  if(document.getElementById('tab-jardim').classList.contains('active')) buildGarden();
}