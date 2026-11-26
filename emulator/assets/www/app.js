'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ─────────── ЗВУКИ ─────────── */
let actx = null;
function audio(){
  if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} }
  if(actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type, vol, when, slideTo){
  const a = audio(); if(!a) return;
  const t0 = a.currentTime + (when || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noiseBurst(dur, vol, when, low){
  const a = audio(); if(!a) return;
  const t0 = a.currentTime + (when || 0);
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low || 750;
  const g = a.createGain(); g.gain.value = vol || 0.5;
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(t0);
}
const sfx = {
  move(){ tone(1500, 0.04, 'triangle', 0.1); },
  back(){ tone(900, 0.05, 'triangle', 0.09); },
  open(){ tone(660, 0.09, 'sine', 0.14); tone(990, 0.22, 'sine', 0.12, 0.08); },
  denied(){ tone(240, 0.12, 'sine', 0.1); },
  shot(){ noiseBurst(0.15, 0.5, 0, 700); tone(140, 0.16, 'square', 0.28, 0, 55); },
  chime(){ tone(220, 0.8, 'sine', 0.18); tone(440, 0.9, 'sine', 0.13, 0.1); tone(880, 1.1, 'sine', 0.09, 0.2); }
};

/* ─────────── ЭКРАНЫ ─────────── */
const SCREENS = ['launch', 'boot', 'game'];
let currentScreen = 'launch';
function applyScreen(name){
  currentScreen = name;
  SCREENS.forEach(n => { const el = $('#screen-' + n); if(el) el.classList.toggle('active', n === name); });
  if(name !== 'game'){
    const v = $('#gameVideo'); if(v) v.pause();
    $('#pauseMenu').classList.add('hidden');
  }
  if(name === 'launch') syncSave();
}
const go = name => applyScreen(name);

function syncSave(){
  let has = false;
  try{ has = localStorage.getItem('gta6_save') === '1'; }catch(e){}
  $('#playLabel').textContent = has ? 'Продолжить' : 'Играть';
}

/* Аппаратная Back из MainActivity */
window.onAndroidBack = function(){
  if(currentScreen === 'game'){
    if(!$('#gameEnd').classList.contains('hidden')) return backToMenu();
    if(!$('#pauseMenu').classList.contains('hidden')) return backToMenu();
    return togglePause(true);
  }
  if(currentScreen === 'boot'){ clearBoot(); return launchGame(); }
  if(window.GameBridge && GameBridge.exitApp) GameBridge.exitApp();
};

/* ─────────── ЧАСЫ ─────────── */
function tickClock(){
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  $('#psClock').textContent = h + ':' + m;
}
setInterval(tickClock, 1000); tickClock();

/* ─────────── ТАЙЛЫ ─────────── */
$$('.tile.locked').forEach(t => t.addEventListener('click', () => {
  t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
  sfx.denied();
}));
$('#tileGtaVI').addEventListener('click', () => { sfx.move(); $('#playBtn').focus({preventScroll: true}); startLaunch(); });

/* ─────────── ЗАПУСК ─────────── */
const playBtn = $('#playBtn');
let launching = false;
playBtn.addEventListener('click', startLaunch);
function startLaunch(){
  if(launching) return;
  launching = true;
  sfx.open();
  playBtn.classList.add('launching');
  setTimeout(startBoot, 260);
}

/* ─────────── BOOT ─────────── */
const bootFill = $('#bootFill');
let bootRaf = 0;
const BOOT_DUR = 2100;
function clearBoot(){ cancelAnimationFrame(bootRaf); }
function startBoot(){
  go('boot');
  sfx.chime();
  bootFill.style.width = '0%';
  const t0 = performance.now();
  const tick = () => {
    const raw = Math.min(1, (performance.now() - t0) / BOOT_DUR);
    const eased = 1 - Math.pow(1 - raw, 2.2);
    bootFill.style.width = (eased * 100).toFixed(1) + '%';
    if(raw < 1) bootRaf = requestAnimationFrame(tick);
    else launchGame();
  };
  bootRaf = requestAnimationFrame(tick);
}
$('#screen-boot').addEventListener('click', () => { if(currentScreen === 'boot'){ clearBoot(); launchGame(); } });

/* ─────────── ВИДЕО ─────────── */
const video = $('#gameVideo');
function launchGame(){
  clearBoot();
  try{ localStorage.setItem('gta6_save', '1'); }catch(e){}
  go('game');
  launching = false;
  playBtn.classList.remove('launching');
  $('#gameEnd').classList.add('hidden');
  $('#pauseMenu').classList.add('hidden');
  video.currentTime = 0;
  const p = video.play();
  if(p && p.catch) p.catch(() => $('#videoFallback').classList.remove('hidden'));
}
$('#videoFallback').addEventListener('click', () => {
  video.play().then(() => $('#videoFallback').classList.add('hidden')).catch(() => {});
});
video.addEventListener('ended', () => $('#gameEnd').classList.remove('hidden'));

/* ─────────── ДУАЛСЭНС ─────────── */
const gameScreen = $('#screen-game');
const hitFlash = $('#hitFlash');
function fire(){
  hitFlash.classList.remove('fire'); void hitFlash.offsetWidth; hitFlash.classList.add('fire');
  gameScreen.classList.remove('shake'); void gameScreen.offsetWidth; gameScreen.classList.add('shake');
  sfx.shot();
}
$$('.gpt').forEach(el => {
  const down = e => {
    e.preventDefault();
    el.classList.add('down');
    switch(el.dataset.btn){
      case 'CROSS': case 'R2': fire(); break;
      case 'PS': case 'OPTIONS': togglePause(); break;
      case 'CIRCLE': if(!$('#pauseMenu').classList.contains('hidden')) backToMenu(); else sfx.move(); break;
      default: sfx.move();
    }
  };
  const up = () => el.classList.remove('down');
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('contextmenu', e => e.preventDefault());
});

/* ─────────── ПАУЗА / ВЫХОД ─────────── */
function togglePause(show){
  if(currentScreen !== 'game') return;
  const pm = $('#pauseMenu');
  const willShow = show !== undefined ? show : pm.classList.contains('hidden');
  pm.classList.toggle('hidden', !willShow);
  if(willShow){ video.pause(); sfx.move(); }
  else { const p = video.play(); if(p && p.catch) p.catch(() => {}); sfx.move(); }
}
function backToMenu(){
  video.pause(); video.currentTime = 0;
  $('#pauseMenu').classList.add('hidden');
  $('#gameEnd').classList.add('hidden');
  sfx.back();
  applyScreen('launch');
}
$('#menuBtn').addEventListener('click', () => togglePause(true));
$('#pmResume').addEventListener('click', () => togglePause(false));
$('#pmExit').addEventListener('click', backToMenu);
$('#geMenuBtn').addEventListener('click', backToMenu);

syncSave();
