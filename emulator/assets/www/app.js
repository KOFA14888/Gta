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
function tone(freq, dur, type, vol, when){
  const a = audio(); if(!a) return;
  const t0 = a.currentTime + (when || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  back(){ tone(900, 0.05, 'triangle', 0.09); },
  open(){ tone(660, 0.09, 'sine', 0.14); tone(990, 0.22, 'sine', 0.12, 0.08); },
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
}
const go = name => applyScreen(name);

/* Аппаратная Back (MainActivity -> javascript:) */
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
  $('#psClock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
setInterval(tickClock, 1000); tickClock();

/* ─────────── ЗАПУСК ─────────── */
const playBtn = $('#playBtn');
let launching = false;
function startLaunch(){
  if(launching) return;
  launching = true;
  sfx.open();
  playBtn.classList.add('launching');
  setTimeout(startBoot, 260);
}
playBtn.addEventListener('click', startLaunch);
$('#tileGtaVI').addEventListener('click', startLaunch);

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

/* ─────────── PERF-МОНИТОР (декорация) ─────────── */
const pf = { gpu: $('#pfGpu'), cpu: $('#pfCpu'), ram: $('#pfRam'), pwr: $('#pfPwr'), fps: $('#pfFps') };
const pc = $('#pfGraph');
const pctx = pc.getContext('2d');
const samples = [];
for(let i = 0; i < 58; i++) samples.push(57 + Math.random() * 2);
function drawGraph(){
  const w = pc.width, h = pc.height;
  pctx.clearRect(0, 0, w, h);
  pctx.beginPath();
  for(let i = 0; i < samples.length; i++){
    const x = (i / (samples.length - 1)) * w;
    const y = h - ((samples[i] - 50) / 14) * (h - 2);
    if(i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
  }
  pctx.strokeStyle = '#2ee56b';
  pctx.lineWidth = 1.4;
  pctx.stroke();
}
function tickPerf(){
  const gpu = Math.floor(Math.random() * 4);
  const cpu = 27 + Math.floor(Math.random() * 8);
  const ram = 96 + Math.floor(Math.random() * 2);
  const pwr = (2.3 + Math.random() * 0.5).toFixed(1);
  const fps = 57 + Math.floor(Math.random() * 3);
  if(pf.gpu){
    pf.gpu.textContent = gpu + '%';
    pf.cpu.textContent = cpu + '%';
    pf.ram.textContent = ram + '%';
    pf.pwr.textContent = pwr + 'w';
    pf.fps.textContent = fps + 'fps';
  }
  samples.push(fps); samples.shift();
  drawGraph();
}
setInterval(tickPerf, 900);
tickPerf();

/* ─────────── ПАУЗА / ВЫХОД ─────────── */
function togglePause(show){
  if(currentScreen !== 'game') return;
  const pm = $('#pauseMenu');
  const willShow = show !== undefined ? show : pm.classList.contains('hidden');
  pm.classList.toggle('hidden', !willShow);
  if(willShow){ video.pause(); sfx.back(); }
  else { const p = video.play(); if(p && p.catch) p.catch(() => {}); sfx.back(); }
}
function backToMenu(){
  video.pause(); video.currentTime = 0;
  $('#pauseMenu').classList.add('hidden');
  $('#gameEnd').classList.add('hidden');
  sfx.back();
  applyScreen('launch');
}
$('#pauseBtn').addEventListener('click', () => togglePause(true));
$('#pmResume').addEventListener('click', () => togglePause(false));
$('#pmExit').addEventListener('click', backToMenu);
$('#geMenuBtn').addEventListener('click', backToMenu);
