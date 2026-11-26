'use strict';
/* ═══════════════════════════════════════════
   GTA 6 EMULATOR · Vice City build 1.0.7
   ═══════════════════════════════════════════ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ─────────── WebAudio SFX ─────────── */
let actx = null;
function audio(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(actx && actx.state==='suspended') actx.resume(); return actx; }
function tone(freq, dur, type, vol, when, slideTo){
  const a = audio(); if(!a) return;
  const t0 = a.currentTime + (when||0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type||'sine'; o.frequency.setValueAtTime(freq, t0);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0+dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol||.18, t0+.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0+dur+.02);
}
function noiseBurst(dur, vol, when, low){
  const a = audio(); if(!a) return;
  const t0 = a.currentTime + (when||0);
  const len = Math.floor(a.sampleRate*dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2.4);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type='lowpass'; f.frequency.value = low||900;
  const g = a.createGain(); g.gain.value = vol||.5;
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(t0);
}
const sfx = {
  click(){ tone(2400,.045,'triangle',.12); },
  back(){ tone(1400,.05,'triangle',.1); },
  chime(){ tone(220,.9,'sine',.22); tone(440,.8,'sine',.16,.12); tone(880,1.1,'sine',.12,.24); tone(1760,1.3,'sine',.06,.3); },
  shot(){ noiseBurst(.16,.55,0,750); tone(150,.18,'square',.3,0,55); },
  reload(){ tone(900,.05,'square',.14); tone(600,.05,'square',.14,.14); tone(1200,.07,'square',.16,.3); },
  coin(){ tone(1319,.12,'sine',.2); tone(1760,.32,'sine',.2,.11); },
  denied(){ tone(220,.16,'sawtooth',.14); },
  swap(){ tone(750,.05,'triangle',.13); tone(980,.06,'triangle',.13,.06); }
};

/* ─────────── SCREENS + HISTORY ─────────── */
const SCREENS = ['launch','boot','game'];
let currentScreen = 'launch';
function applyScreen(name){
  currentScreen = name;
  SCREENS.forEach(n => {
    const el = $('#screen-'+n);
    if(el) el.classList.toggle('active', n===name);
  });
  if(name !== 'game'){ const v = $('#gameVideo'); if(v){ v.pause(); } $('#pauseMenu').classList.add('hidden'); }
  if(name === 'launch'){ syncLauncherSave(); }
}
function go(name){
  applyScreen(name);
}
/* Единая обработка аппаратной Back (MainActivity -> javascript:) */
window.onAndroidBack = function(){
  if(currentScreen === 'game'){
    if(!$('#gameEnd').classList.contains('hidden')){
      $('#geMenuBtn').click();
      return;
    }
    if(!$('#pauseMenu').classList.contains('hidden')){
      video.pause(); video.currentTime = 0;
      $('#pauseMenu').classList.add('hidden');
      sfx.back();
      applyScreen('launch');
      return;
    }
    togglePause(true);
    return;
  }
  if(currentScreen === 'boot'){
    clearBootTimers();
    launchGame();
    return;
  }
  /* лаунчер — выходим из приложения */
  if(window.GameBridge && GameBridge.exitApp) GameBridge.exitApp();
};

/* ─────────── LAUNCHER ─────────── */
const playBtn = $('#playBtn');
function syncLauncherSave(){
  let hasSave = false;
  try{ hasSave = localStorage.getItem('gta6_save') === '1'; }catch(e){}
  $('#playLabel').textContent = hasSave ? 'ПРОДОЛЖИТЬ' : 'ИГРАТЬ';
  $('#playBtn').querySelector('.play-sub').textContent = hasSave ? 'АВТОСОХРАНЕНИЕ · VICE CITY' : 'НОВАЯ ИГРА · PS5 · 21 СЕК';
  $('#saveLine').textContent = hasSave ? 'Автосохранение · Vice City — причал · 12:47' : 'Новое сохранение · Пролог — «Vice City»';
}
syncLauncherSave();

let booting = false;
playBtn.addEventListener('click', () => {
  if(booting) return;
  booting = true;
  sfx.click();
  playBtn.classList.add('launching');
  $('#playLabel').textContent = 'ЗАПУСК';
  setTimeout(startBoot, 420);
});

/* ─────────── BOOT SEQUENCE ─────────── */
const BOOT_LOG = [
  [0.04,'Крепление виртуального диска GTA6.vmdk…'],
  [0.16,'ViperEngine 1.0.7 · ARM64 · Vulkan 1.3.275'],
  [0.28,'Инициализация GPU: Mali / Adreno — OK'],
  [0.40,'Компиляция шейдеров: 1482 / 3120'],
  [0.52,'Компиляция шейдеров: 2364 / 3120'],
  [0.63,'Загрузка текстур (4K): vice_city_pbr…'],
  [0.73,'Загрузка аудиобанка: ru-RU · Kylotonn VO'],
  [0.82,'libgtav.so — 168 240 КБ — OK'],
  [0.90,'Создание образов GPU · part 7/8'],
  [0.96,'Вход в VICE CITY…']
];
let bootTimers = [];
function clearBootTimers(){ bootTimers.forEach(t => cancelAnimationFrame(t)); bootTimers = []; }
function startBoot(){
  go('boot');
  playBtn.classList.remove('launching');
  booting = false;
  sfx.chime();
  const fill = $('#bootFill'), pct = $('#bootPct'), log = $('#bootLog');
  fill.style.width = '0%'; pct.textContent = '0%'; log.textContent = 'Инициализация…';
  const DUR = 4200, t0 = performance.now();
  const tick = () => {
    const raw = Math.min(1, (performance.now()-t0)/DUR);
    const eased = Math.min(1, 1 - Math.pow(1-raw, 2.35));
    const val = Math.floor(eased*100);
    fill.style.width = val + '%';
    pct.textContent = val + '%';
    for(const [at, msg] of BOOT_LOG){ if(eased >= at) log.textContent = msg; }
    if(raw < 1){ const id = requestAnimationFrame(tick); bootTimers.push(id); }
    else launchGame();
  };
  bootTimers.push(requestAnimationFrame(tick));
}
$('#screen-boot').addEventListener('click', () => { if(currentScreen==='boot'){ clearBootTimers(); launchGame(); } });

/* ─────────── GAME ─────────── */
const video = $('#gameVideo');
function launchGame(){
  clearBootTimers();
  try{ localStorage.setItem('gta6_save','1'); }catch(e){}
  go('game');
  video.currentTime = 0;
  const p = video.play();
  if(p && p.catch) p.catch(() => $('#videoFallback').classList.remove('hidden'));
  $('#gameEnd').classList.add('hidden');
  scheduleAchievements();
}
$('#videoFallback').addEventListener('click', () => {
  video.play().then(() => $('#videoFallback').classList.add('hidden')).catch(() => {});
});

/* FPS-счётчик */
let fpsTimer = null;
function startFps(){
  clearInterval(fpsTimer);
  fpsTimer = setInterval(() => { $('#fpsVal').textContent = String(58 + Math.floor(Math.random()*3)); }, 420);
}
function stopFps(){ clearInterval(fpsTimer); }
const _origApply = applyScreen;
applyScreen = function(n){ _origApply(n); if(n==='game') startFps(); else stopFps(); };

/* Достижения-тосты */
let achTimers = [];
function scheduleAchievements(){
  achTimers.forEach(clearTimeout); achTimers = [];
  achTimers.push(setTimeout(() => showAchievement('Прибытие в Vice City'), 5200));
  achTimers.push(setTimeout(() => showAchievement('Психопат за рулём'), 12800));
}
let achHideT = null;
function showAchievement(name){
  $('#achName').textContent = name;
  const t = $('#achToast');
  t.classList.add('show'); sfx.coin();
  clearTimeout(achHideT);
  achHideT = setTimeout(() => t.classList.remove('show'), 4200);
}

/* Оружие */
const WEAPONS = ['Кулаки','Пистолет','SMG','Дробовик','RPG-7'];
let weaponIdx = 0;
function setWeapon(i){
  weaponIdx = (i + WEAPONS.length) % WEAPONS.length;
  $('#weaponName').textContent = WEAPONS[weaponIdx];
  sfx.swap();
}

/* Выстрел */
const hitFlash = $('#hitFlash'), gameScreen = $('#screen-game');
function fire(){
  hitFlash.classList.remove('fire'); void hitFlash.offsetWidth; hitFlash.classList.add('fire');
  gameScreen.classList.remove('shake'); void gameScreen.offsetWidth; gameScreen.classList.add('shake');
  sfx.shot();
}

/* Перезарядка */
let reloadT = null;
function reload(){
  $('#reloadHint').classList.add('show'); sfx.reload();
  clearTimeout(reloadT);
  reloadT = setTimeout(() => $('#reloadHint').classList.remove('show'), 1600);
}

/* ─────────── DUALSENSE INPUT ─────────── */
$$('.gpt').forEach(el => {
  const down = e => {
    e.preventDefault();
    el.classList.add('down');
    const b = el.dataset.btn;
    switch(b){
      case 'CROSS': case 'R2': fire(); break;
      case 'CIRCLE': reload(); break;
      case 'R1': setWeapon(weaponIdx+1); break;
      case 'L1': setWeapon(weaponIdx-1); break;
      case 'PS': togglePause(true); break;
      case 'OPTIONS': togglePause(true); break;
      default: sfx.click();
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
  const pm = $('#pauseMenu');
  const willShow = show !== undefined ? show : pm.classList.contains('hidden');
  pm.classList.toggle('hidden', !willShow);
  if(willShow){ video.pause(); sfx.click(); } else { const p = video.play(); if(p&&p.catch) p.catch(()=>{}); sfx.click(); }
}
$('#menuBtn').addEventListener('click', () => togglePause(true));
$('#pmResume').addEventListener('click', () => togglePause(false));
$('#pmExit').addEventListener('click', () => {
  video.pause(); video.currentTime = 0;
  $('#pauseMenu').classList.add('hidden');
  if(window.GameBridge && GameBridge.exitApp){ GameBridge.exitApp(); } else { go('launch'); }
});

/* Конец видео → экран статистики */
video.addEventListener('ended', () => {
  $('#gameEnd').classList.remove('hidden');
  sfx.chime();
});
$('#geMenuBtn').addEventListener('click', () => {
  video.currentTime = 0;
  $('#gameEnd').classList.add('hidden');
  go('launch');
});

