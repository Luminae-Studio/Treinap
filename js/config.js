// ── HABITS CONFIG ──
// ── WORKOUT CONFIG ──
const WORKOUT_CONFIG = [
  {id:'musculacao', icon:'🏋️', name:'Musculação', xpPerMin:1.2},
  {id:'cardio', icon:'🏃', name:'Cardio', xpPerMin:1.0},
  {id:'yoga', icon:'🧘', name:'Yoga', xpPerMin:0.8},
  {id:'danca', icon:'💃', name:'Dança', xpPerMin:1.0},
  {id:'natacao', icon:'🏊', name:'Natação', xpPerMin:1.1},
  {id:'pilates', icon:'🤸', name:'Pilates', xpPerMin:0.9},
];

const SHOP_ITEMS = [
  {
    id:'banco', icon:'🪑', name:'Banquinho', price:60,
    desc:'Um lugar para a Ayelen descansar',
    gx:0.14, gy:0.76,
    levels:['🪑','🪑🌿','🛋️🌿','🛋️🌺✨']
  },
  {
    id:'fonte', icon:'⛲', name:'Fonte', price:120,
    desc:'Uma fontezinha que traz calma',
    gx:0.74, gy:0.70,
    levels:['⛲','⛲💧','⛲🌊','⛲🌊✨']
  },
  {
    id:'lampiao', icon:'🏮', name:'Lampião', price:90,
    desc:'Ilumina o jardim à noite',
    gx:0.88, gy:0.78,
    levels:['🏮','🏮✨','🏮🌟','🕯️🌟💫']
  },
  {
    id:'borboleta', icon:'🦋', name:'Borboletas', price:150,
    desc:'Borboletas que voam pelo jardim',
    gx:0.50, gy:0.42,
    levels:['🦋','🦋🦋','🦋🦋🌸','🦋🦋🌸✨']
  },
  {
    id:'arcoiris', icon:'🌈', name:'Arco-íris', price:200,
    desc:'Aparece no céu após conquistas',
    gx:0.48, gy:0.12,
    levels:['🌈','🌈✨','🌈🌟','🌈🌟💫']
  },
  {
    id:'gatinho', icon:'🐱', name:'Gatinho', price:180,
    desc:'Um gatinho que dorme no jardim',
    gx:0.26, gy:0.80,
    levels:['🐱','🐱💤','🐱🌸','😺🌸✨']
  },
  {
    id:'cogumelo', icon:'🍄', name:'Cogumelos mágicos', price:80,
    desc:'Crescem entre as flores',
    gx:0.62, gy:0.78,
    levels:['🍄','🍄🍄','🍄🍄✨','🍄🍄🌟']
  },
  {
    id:'estrelas', icon:'⭐', name:'Estrelas cadentes', price:250,
    desc:'Estrelas no céu do jardim',
    gx:0.30, gy:0.08,
    levels:['⭐','⭐🌙','✨⭐🌙','💫✨⭐🌙']
  },
];

// Nível do item baseado em dias desde a compra
function getItemLevel(itemId) {
  const purchase = (state.itemPurchases||{})[itemId];
  if(!purchase) return 0;
  const days = Math.floor((Date.now() - purchase.ts) / (1000*60*60*24));
  if(days >= 30) return 3;
  if(days >= 14) return 2;
  if(days >= 7)  return 1;
  return 0;
}