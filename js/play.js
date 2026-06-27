/* ═══════════════════════════════════════════
   play.js — audio + touch interactions
═══════════════════════════════════════════ */

let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ── PLUCK (string instruments) ── */
function playPluck(freq) {
  const ctx = getAudio();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const now  = ctx.currentTime;

  osc.type = 'triangle';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);
  osc.start(now);
  osc.stop(now + 2.8);
}

/* ── BELL / METALLOPHONE (gamelan) ── */
function playMetal(freq) {
  const ctx  = getAudio();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.value = 0.35;

  [1, 2.76, 5.40].forEach((ratio, i) => {
    const osc  = ctx.createOscillator();
    const og   = ctx.createGain();
    const now  = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    og.gain.setValueAtTime(1 / (i + 1), now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 2.2 + i * 0.4);
    osc.connect(og);
    og.connect(gain);
    osc.start(now);
    osc.stop(now + 2.6 + i * 0.4);
  });
}

/* ── NOISE BURST helper ── */
function noiseBurst(ctx, dest, filterType, filterFreq, duration, peakGain) {
  if (!duration || duration <= 0) return;
  const now = ctx.currentTime;
  const len = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const flt = ctx.createBiquadFilter();
  flt.type = filterType; flt.frequency.value = filterFreq;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(peakGain, now);
  ng.gain.exponentialRampToValueAtTime(0.001, now + duration);
  src.connect(flt); flt.connect(ng); ng.connect(dest);
  src.start(now); src.stop(now + duration);
}

/* ── TABLA DAYAN — snappy resonant "Na / Tin" ── */
function playTablaHigh() {
  const ctx = getAudio(); const now = ctx.currentTime;
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  // Pitched tone: starts ~380Hz, settles down — like a tuned membrane
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(230, now + 0.45);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.8, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(og); og.connect(master); osc.start(now); osc.stop(now + 0.55);
  // Attack transient
  noiseBurst(ctx, master, 'bandpass', 700, 0.035, 0.9);
}

/* ── TABLA BAYAN — deep resonant "Ge / Dha" ── */
function playTablaLow() {
  const ctx = getAudio(); const now = ctx.currentTime;
  const master = ctx.createGain(); master.gain.value = 1.0; master.connect(ctx.destination);
  // Start at an audible 160Hz and drop — stays in phone speaker range
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
  osc.frequency.exponentialRampToValueAtTime(75, now + 0.8);
  const og = ctx.createGain();
  og.gain.setValueAtTime(1.0, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  osc.connect(og); og.connect(master); osc.start(now); osc.stop(now + 1.05);
  // Thud transient
  noiseBurst(ctx, master, 'lowpass', 200, 0.08, 1.0);
  // Second harmonic to stay audible on small speakers
  const osc2 = ctx.createOscillator(); osc2.type = 'sine';
  osc2.frequency.setValueAtTime(320, now);
  osc2.frequency.exponentialRampToValueAtTime(180, now + 0.1);
  const og2 = ctx.createGain();
  og2.gain.setValueAtTime(0.4, now);
  og2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc2.connect(og2); og2.connect(master); osc2.start(now); osc2.stop(now + 0.4);
}

/* ── JANGGU CHAE-PYEON — bright crack "Deok" ── */
function playJangguHigh() {
  const ctx = getAudio(); const now = ctx.currentTime;
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  // Sharp crack — mostly noise
  noiseBurst(ctx, master, 'highpass', 2000, 0.04, 1.0);
  noiseBurst(ctx, master, 'bandpass', 900,  0.06, 0.7);
  // Brief pitched snap
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(700, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.35, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(og); og.connect(master); osc.start(now); osc.stop(now + 0.18);
}

/* ── JANGGU GUNG-PYEON — deep boom "Kung" ── */
function playJangguLow() {
  const ctx = getAudio(); const now = ctx.currentTime;
  const master = ctx.createGain(); master.gain.value = 1.0; master.connect(ctx.destination);
  // Start at 140Hz — stays audible on phone speakers
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);
  osc.frequency.exponentialRampToValueAtTime(60, now + 1.0);
  const og = ctx.createGain();
  og.gain.setValueAtTime(1.0, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc.connect(og); og.connect(master); osc.start(now); osc.stop(now + 1.25);
  // Keep it audible on phones via a mid-range harmonic
  const osc2 = ctx.createOscillator(); osc2.type = 'sine';
  osc2.frequency.setValueAtTime(280, now);
  osc2.frequency.exponentialRampToValueAtTime(150, now + 0.2);
  const og2 = ctx.createGain();
  og2.gain.setValueAtTime(0.5, now);
  og2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc2.connect(og2); og2.connect(master); osc2.start(now); osc2.stop(now + 0.55);
  // Low thud noise
  noiseBurst(ctx, master, 'lowpass', 180, 0.1, 0.9);
}

/* ── WIND (continuous, mic-driven) ── */
let windOsc = null, windNoise = null, windGain = null;

function startWind(freq) {
  if (windOsc) { updateWindFreq(freq); return; } // already running — just update pitch
  const ctx = getAudio();
  windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0, ctx.currentTime);
  windGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.06); // start quiet; poll loop drives actual level
  windGain.connect(ctx.destination);

  windOsc = ctx.createOscillator();
  windOsc.type = 'sine';
  windOsc.frequency.value = freq;
  windOsc.connect(windGain);
  windOsc.start();

  const buf  = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  windNoise = ctx.createBufferSource();
  windNoise.buffer = buf;
  windNoise.loop = true;

  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = freq;
  filt.Q.value = 14;

  const ng = ctx.createGain();
  ng.gain.value = 0.07;
  windNoise.connect(filt);
  filt.connect(ng);
  ng.connect(windGain);
  windNoise.start();
}

function updateWindFreq(freq) {
  if (!windOsc) return;
  const ctx = getAudio();
  windOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
}

function stopWind() {
  if (!windGain) return;
  const ctx = getAudio();
  // Fade out smoothly before stopping to avoid click/pop
  windGain.gain.setValueAtTime(windGain.gain.value, ctx.currentTime);
  windGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.07);
  const osc = windOsc, noise = windNoise;
  windOsc = null; windNoise = null; windGain = null;
  setTimeout(() => {
    try { osc.stop();   } catch(e){}
    try { noise.stop(); } catch(e){}
  }, 80);
}

/* ════════════════════════════════════════
   STRING INTERFACE
════════════════════════════════════════ */
function initString(inst, container) {
  const notes = inst.notes;
  const names = inst.noteNames || notes.map(() => '');
  const color = inst.stringColor || 'var(--gold-pale)';

  container.innerHTML = `
    <div class="string-wrap" id="string-wrap">
      ${notes.map((f, i) => `
        <div class="string-row" data-idx="${i}" data-freq="${f}" style="--sc:${color}">
          <div class="string-line"></div>
          <span class="string-note-tag">${names[i] || ''}</span>
        </div>`).join('')}
    </div>`;

  const wrap = container.querySelector('#string-wrap');
  let lastIdx = -1;

  function pluckRow(el) {
    const idx = parseInt(el.dataset.idx);
    if (idx === lastIdx) return;
    lastIdx = idx;
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
    playPluck(parseFloat(el.dataset.freq));
    setTimeout(() => el.classList.remove('active'), 500);
  }

  function getRowAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return el.closest('.string-row') || (el.classList.contains('string-row') ? el : null);
  }

  wrap.addEventListener('touchstart', e => {
    e.preventDefault();
    lastIdx = -1;
    Array.from(e.changedTouches).forEach(t => {
      const row = getRowAt(t.clientX, t.clientY);
      if (row) pluckRow(row);
    });
  }, { passive: false });

  wrap.addEventListener('touchmove', e => {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      const row = getRowAt(t.clientX, t.clientY);
      if (row) pluckRow(row);
    });
  }, { passive: false });

  wrap.addEventListener('mousedown', e => {
    lastIdx = -1;
    const row = e.target.closest('.string-row');
    if (row) pluckRow(row);
  });

  wrap.addEventListener('mouseover', e => {
    if (e.buttons !== 1) return;
    const row = e.target.closest('.string-row');
    if (row) pluckRow(row);
  });

  /* ── KEYBOARD ── number keys pluck the corresponding string */
  const rows = Array.from(container.querySelectorAll('.string-row'));
  function onKbDown(e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= rows.length) {
      e.preventDefault();
      lastIdx = -1; // allow same string to re-trigger on keyboard
      pluckRow(rows[num - 1]);
    }
  }
  document.addEventListener('keydown', onKbDown);
  window._kbCleanup = () => document.removeEventListener('keydown', onKbDown);
}

/* ════════════════════════════════════════
   WIND INTERFACE
════════════════════════════════════════ */
function initWind(inst, container) {
  const holes  = inst.holes  || [];
  const combos = inst.combos || {};
  const notes  = inst.notes;
  const names  = inst.noteNames || [];

  container.innerHTML = `
    <div class="wind-wrap">
      <div class="breath-track"><div class="breath-fill" id="breath-fill"></div></div>
      <div class="blow-label" id="blow-label">Allow mic access when prompted…</div>
      <div class="note-display" id="note-display">—</div>
      <div class="holes-grid" id="holes-grid">
        ${holes.map((label, i) => `
          <button class="hole-btn" data-hole="${i}">${label}</button>`).join('')}
      </div>
      <button class="hold-blow-btn" id="hold-blow">Hold to Blow</button>
    </div>`;

  const breathFill  = container.querySelector('#breath-fill');
  const noteDisplay = container.querySelector('#note-display');
  const blowLabel   = container.querySelector('#blow-label');
  const holeBtns    = container.querySelectorAll('.hole-btn');
  const holdBtn     = container.querySelector('#hold-blow');

  let pressed     = new Array(holes.length).fill(0);
  let blowing     = false;
  let holdActive  = false; // true while the Hold to Blow button is physically pressed
  let micStream   = null;
  let analyser    = null;
  let rafId       = null;
  let stopTimer   = null;

  function getCurrentFreq() {
    // Number of holes pressed determines the note — intuitive and always distinct
    const idx = Math.min(pressed.filter(p => p).length, notes.length - 1);
    return notes[idx];
  }
  function getCurrentName() {
    const idx = Math.min(pressed.filter(p => p).length, names.length - 1);
    return names[idx] || '—';
  }

  function setBlowing(on) {
    if (on) {
      // Cancel any pending stop
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (!blowing) {
        blowing = true;
        startWind(getCurrentFreq());
        noteDisplay.textContent = getCurrentName();
      }
    } else {
      // Debounce the stop — don't cut out on brief mic silence
      if (!stopTimer) {
        stopTimer = setTimeout(() => {
          blowing = false;
          stopWind();
          noteDisplay.textContent = '—';
          stopTimer = null;
        }, 200);
      }
    }
  }

  /* ── HOLE BUTTONS ── */
  function pressHoleByIdx(i) {
    if (i < 0 || i >= holeBtns.length) return;
    pressed[i] = 1;
    holeBtns[i].classList.add('pressed');
    noteDisplay.textContent = getCurrentName();
    if (blowing) updateWindFreq(getCurrentFreq());
  }
  function releaseHoleByIdx(i) {
    if (i < 0 || i >= holeBtns.length) return;
    pressed[i] = 0;
    holeBtns[i].classList.remove('pressed');
    if (blowing) updateWindFreq(getCurrentFreq());
  }
  holeBtns.forEach((btn, i) => {
    btn.addEventListener('touchstart', e => { e.preventDefault(); pressHoleByIdx(i);   }, { passive: false });
    btn.addEventListener('touchend',   e => { e.preventDefault(); releaseHoleByIdx(i); }, { passive: false });
    btn.addEventListener('mousedown',  () => pressHoleByIdx(i));
    btn.addEventListener('mouseup',    () => releaseHoleByIdx(i));
    btn.addEventListener('mouseleave', () => releaseHoleByIdx(i));
  });

  /* ── HOLD-TO-BLOW ──
     holdActive blocks the mic-poll from stopping the wind so the button
     can be held indefinitely while pressing holes to change notes. */
  function holdStart() { holdActive = true;  setBlowing(true);  }
  function holdEnd()   { holdActive = false; setBlowing(false); }
  holdBtn.addEventListener('touchstart', e => { e.preventDefault(); holdStart(); }, { passive: false });
  holdBtn.addEventListener('touchend',   e => { e.preventDefault(); holdEnd();   }, { passive: false });
  holdBtn.addEventListener('mousedown',  holdStart);
  holdBtn.addEventListener('mouseup',    holdEnd);
  holdBtn.addEventListener('mouseleave', () => { if (holdActive) holdEnd(); });

  /* ── KEYBOARD ── numbers = holes · Space = blow */
  function onKbDown(e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= holes.length) { e.preventDefault(); pressHoleByIdx(num - 1); }
    if (e.code === 'Space') { e.preventDefault(); holdStart(); }
  }
  function onKbUp(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= holes.length) { e.preventDefault(); releaseHoleByIdx(num - 1); }
    if (e.code === 'Space') { e.preventDefault(); holdEnd(); }
  }
  document.addEventListener('keydown', onKbDown);
  document.addEventListener('keyup',   onKbUp);
  window._kbCleanup = () => {
    document.removeEventListener('keydown', onKbDown);
    document.removeEventListener('keyup',   onKbUp);
  };

  /* ── MIC SETUP ──
     CRITICAL: call getAudio() BEFORE the await so the AudioContext is created
     while the user-gesture is still active (required by Safari / iOS). */
  const THRESHOLD = 3;

  async function startMic() {
    const ctx = getAudio(); // ← must happen synchronously inside the gesture chain
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const src = ctx.createMediaStreamSource(micStream);
      analyser  = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      blowLabel.textContent = 'Make any sound into your mic  ·  or hold the button below';
      holdBtn.textContent   = 'Hold to Blow';
      pollMic();
    } catch (err) {
      blowLabel.textContent = 'Mic unavailable — hold the button below to play';
    }
  }

  const MAX_VOL = 28; // roughly a loud blow

  function pollMic() {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += Math.abs(v - 128);
      const vol = sum / buf.length;

      // Breath meter scales to MAX_VOL
      breathFill.style.width = Math.min(100, (vol / MAX_VOL) * 100) + '%';

      // Don't let the mic poll override the Hold to Blow button
      if (!holdActive) {
        if (vol > THRESHOLD) {
          const t = Math.min(1, (vol - THRESHOLD) / (MAX_VOL - THRESHOLD));
          const targetGain = 0.08 + t * 0.62;
          setBlowing(true);
          if (windGain) windGain.gain.setTargetAtTime(targetGain, getAudio().currentTime, 0.04);
        } else {
          setBlowing(false);
        }
      }

      rafId = requestAnimationFrame(tick);
    }
    tick();
  }

  startMic();

  window._windCleanup = () => {
    setBlowing(false);
    if (rafId) cancelAnimationFrame(rafId);
    if (micStream) micStream.getTracks().forEach(t => t.stop());
  };
}

/* ════════════════════════════════════════
   PERCUSSION INTERFACE
════════════════════════════════════════ */
function initPercussion(inst, container) {
  const layout = inst.layout;

  if (layout === 'gamelan') {
    container.innerHTML = `
      <div class="perc-wrap">
        <div class="gamelan-bars" id="perc-bars">
          ${inst.bars.map((name, i) => `
            <div class="gbar" data-idx="${i}">
              <span class="gbar-name">${name}</span>
              <span class="gbar-note">${inst.noteNames[i]}</span>
            </div>`).join('')}
        </div>
      </div>`;

    const gbars = Array.from(container.querySelectorAll('.gbar'));
    function hitBar(idx) {
      const bar = gbars[idx]; if (!bar) return;
      bar.classList.add('hit');
      playMetal(inst.notes[idx]);
      setTimeout(() => bar.classList.remove('hit'), 140);
    }
    gbars.forEach((bar, i) => {
      bar.addEventListener('touchstart', e => { e.preventDefault(); hitBar(i); }, { passive: false });
      bar.addEventListener('mousedown', () => hitBar(i));
    });
    function onKbDown(e) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= gbars.length) { e.preventDefault(); hitBar(num - 1); }
    }
    document.addEventListener('keydown', onKbDown);
    window._kbCleanup = () => document.removeEventListener('keydown', onKbDown);

  } else if (layout === 'tabla') {
    const pads = inst.pads;
    container.innerHTML = `
      <div class="perc-wrap">
        <div class="tabla-pair">
          ${pads.map((p, i) => `
            <div class="tabla-drum" data-idx="${i}">
              <span class="drum-name">${p.label}</span>
              <span class="drum-sub">${p.sub}</span>
            </div>`).join('')}
        </div>
      </div>`;

    const tdrums = Array.from(container.querySelectorAll('.tabla-drum'));
    function hitTabla(idx) {
      const drum = tdrums[idx]; if (!drum) return;
      drum.classList.add('hit');
      if (idx === 0) playTablaHigh(); else playTablaLow();
      setTimeout(() => drum.classList.remove('hit'), 120);
    }
    tdrums.forEach((drum, i) => {
      drum.addEventListener('touchstart', e => { e.preventDefault(); hitTabla(i); }, { passive: false });
      drum.addEventListener('mousedown', () => hitTabla(i));
    });
    function onKbDown(e) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const num = parseInt(e.key);
      if (num === 1 || num === 2) { e.preventDefault(); hitTabla(num - 1); }
    }
    document.addEventListener('keydown', onKbDown);
    window._kbCleanup = () => document.removeEventListener('keydown', onKbDown);

  } else if (layout === 'janggu') {
    const pads = inst.pads;
    container.innerHTML = `
      <div class="perc-wrap">
        <div class="janggu-pair">
          ${pads.map((p, i) => `
            <div class="janggu-head" data-idx="${i}">
              <span class="drum-name">${p.label}</span>
              <span class="drum-sub">${p.sub}</span>
            </div>`).join('')}
        </div>
      </div>`;

    const jheads = Array.from(container.querySelectorAll('.janggu-head'));
    function hitJanggu(idx) {
      const head = jheads[idx]; if (!head) return;
      head.classList.add('hit');
      if (idx === 0) playJangguHigh(); else playJangguLow();
      setTimeout(() => head.classList.remove('hit'), 120);
    }
    jheads.forEach((head, i) => {
      head.addEventListener('touchstart', e => { e.preventDefault(); hitJanggu(i); }, { passive: false });
      head.addEventListener('mousedown', () => hitJanggu(i));
    });
    function onKbDown(e) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const num = parseInt(e.key);
      if (num === 1 || num === 2) { e.preventDefault(); hitJanggu(num - 1); }
    }
    document.addEventListener('keydown', onKbDown);
    window._kbCleanup = () => document.removeEventListener('keydown', onKbDown);
  }
}

/* ════════════════════════════════════════
   ROUTER — called from instrument.html
════════════════════════════════════════ */
function initPlay(inst, container) {
  // Pre-create/resume AudioContext while we're still inside the user gesture.
  // This is required on iOS/Safari — creating it later (on first drum tap, etc.)
  // may silently fail because the gesture window has closed.
  getAudio();
  if (inst.type === 'string')     initString(inst, container);
  else if (inst.type === 'wind')  initWind(inst, container);
  else if (inst.type === 'percussion') initPercussion(inst, container);
}
