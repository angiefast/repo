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

/* ── DRUM (tabla / janggu) ── */
function playDrum(freq, decay = 0.6) {
  const ctx  = getAudio();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const now  = ctx.currentTime;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.25, now + decay);
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(1.0, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
  osc.start(now);
  osc.stop(now + decay + 0.05);
}

/* ── WIND (continuous, mic-driven) ── */
let windOsc = null, windNoise = null, windGain = null;

function startWind(freq) {
  stopWind();
  const ctx = getAudio();
  windGain = ctx.createGain();
  windGain.gain.value = 0.38;
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
  windOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.06);
}

function stopWind() {
  try { if (windOsc)   { windOsc.stop();   windOsc   = null; } } catch(e){}
  try { if (windNoise) { windNoise.stop();  windNoise = null; } } catch(e){}
  windGain = null;
}

/* ════════════════════════════════════════
   STRING INTERFACE
════════════════════════════════════════ */
function initString(inst, container) {
  const notes = inst.notes;
  const names = inst.noteNames || notes.map(() => '');

  container.innerHTML = `
    <div class="string-wrap" id="string-wrap">
      ${notes.map((f, i) => `
        <div class="string-row" data-idx="${i}" data-freq="${f}">
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
}

/* ════════════════════════════════════════
   WIND INTERFACE
════════════════════════════════════════ */
function initWind(inst, container) {
  const holes = inst.holes || [];
  const combos = inst.combos || {};
  const notes = inst.notes;
  const names = inst.noteNames || [];

  container.innerHTML = `
    <div class="wind-wrap">
      <div class="breath-track"><div class="breath-fill" id="breath-fill"></div></div>
      <div class="blow-label" id="blow-label">Blow into your microphone ↑</div>
      <div class="note-display" id="note-display">—</div>
      <div class="holes-grid" id="holes-grid">
        ${holes.map((label, i) => `
          <button class="hole-btn" data-hole="${i}" ontouchstart="return false;">${label}</button>`).join('')}
      </div>
    </div>`;

  const breathFill  = container.querySelector('#breath-fill');
  const noteDisplay = container.querySelector('#note-display');
  const holeBtns    = container.querySelectorAll('.hole-btn');
  let pressed = new Array(holes.length).fill(0);
  let blowing = false;
  let micStream = null, analyser = null;

  function getComboKey() { return pressed.join(''); }
  function getCurrentFreq() {
    const key = getComboKey();
    const idx = combos[key] ?? 0;
    return notes[idx];
  }
  function getCurrentName() {
    const key = getComboKey();
    const idx = combos[key] ?? 0;
    return names[idx] || '—';
  }

  // Hole press handling (touch + mouse)
  holeBtns.forEach(btn => {
    const i = parseInt(btn.dataset.hole);
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      pressed[i] = 1;
      btn.classList.add('pressed');
      if (blowing) { startWind(getCurrentFreq()); noteDisplay.textContent = getCurrentName(); }
    }, { passive: false });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      pressed[i] = 0;
      btn.classList.remove('pressed');
      if (blowing) { updateWindFreq(getCurrentFreq()); noteDisplay.textContent = getCurrentName(); }
    }, { passive: false });
    btn.addEventListener('mousedown', () => {
      pressed[i] = 1;
      btn.classList.add('pressed');
      if (blowing) { updateWindFreq(getCurrentFreq()); noteDisplay.textContent = getCurrentName(); }
    });
    btn.addEventListener('mouseup', () => {
      pressed[i] = 0;
      btn.classList.remove('pressed');
      if (blowing) { updateWindFreq(getCurrentFreq()); noteDisplay.textContent = getCurrentName(); }
    });
  });

  // Mic setup
  const BLOW_THRESHOLD = 8;
  let rafId;

  async function startMic() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = getAudio();
      const src = ctx.createMediaStreamSource(micStream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      container.querySelector('#blow-label').textContent = 'Blow steadily into your microphone ↑';
      pollMic();
    } catch(err) {
      container.querySelector('#blow-label').textContent = 'Mic access denied — tap holes to test notes';
    }
  }

  function pollMic() {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    function check() {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let v of buf) sum += Math.abs(v - 128);
      const vol = sum / buf.length;
      const pct = Math.min(100, (vol / BLOW_THRESHOLD) * 100);
      breathFill.style.width = pct + '%';

      const nowBlowing = vol > BLOW_THRESHOLD;
      if (nowBlowing && !blowing) {
        blowing = true;
        startWind(getCurrentFreq());
        noteDisplay.textContent = getCurrentName();
      } else if (!nowBlowing && blowing) {
        blowing = false;
        stopWind();
        noteDisplay.textContent = '—';
      } else if (blowing) {
        updateWindFreq(getCurrentFreq());
        noteDisplay.textContent = getCurrentName();
      }
      rafId = requestAnimationFrame(check);
    }
    check();
  }

  startMic();

  // Cleanup when leaving
  window._windCleanup = () => {
    stopWind();
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

    container.querySelectorAll('.gbar').forEach(bar => {
      function hit() {
        bar.classList.add('hit');
        playMetal(inst.notes[parseInt(bar.dataset.idx)]);
        setTimeout(() => bar.classList.remove('hit'), 140);
      }
      bar.addEventListener('touchstart', e => { e.preventDefault(); hit(); }, { passive: false });
      bar.addEventListener('mousedown', hit);
    });

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

    container.querySelectorAll('.tabla-drum').forEach(drum => {
      function hit() {
        drum.classList.add('hit');
        const idx = parseInt(drum.dataset.idx);
        playDrum(inst.notes[idx], idx === 1 ? 1.0 : 0.5);
        setTimeout(() => drum.classList.remove('hit'), 120);
      }
      drum.addEventListener('touchstart', e => { e.preventDefault(); hit(); }, { passive: false });
      drum.addEventListener('mousedown', hit);
    });

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

    container.querySelectorAll('.janggu-head').forEach(head => {
      function hit() {
        head.classList.add('hit');
        const idx = parseInt(head.dataset.idx);
        playDrum(inst.notes[idx], idx === 0 ? 0.35 : 1.2);
        setTimeout(() => head.classList.remove('hit'), 120);
      }
      head.addEventListener('touchstart', e => { e.preventDefault(); hit(); }, { passive: false });
      head.addEventListener('mousedown', hit);
    });
  }
}

/* ════════════════════════════════════════
   ROUTER — called from instrument.html
════════════════════════════════════════ */
function initPlay(inst, container) {
  if (inst.type === 'string')     initString(inst, container);
  else if (inst.type === 'wind')  initWind(inst, container);
  else if (inst.type === 'percussion') initPercussion(inst, container);
}
