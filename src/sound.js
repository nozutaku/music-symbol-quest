(function (root) {
  // freq: Hz / start: 開始秒 / duration: 長さ秒
  const PATTERNS = {
    // C5 → E5 → G5 → C6: 明るい上昇アルペジオ
    correct: {
      wave: 'triangle',
      volume: 0.25,
      notes: [
        { freq: 523.25, start: 0, duration: 0.12 },
        { freq: 659.25, start: 0.1, duration: 0.12 },
        { freq: 783.99, start: 0.2, duration: 0.12 },
        { freq: 1046.5, start: 0.3, duration: 0.28 },
      ],
    },
    // 低い音が下降: ブブー
    wrong: {
      wave: 'sawtooth',
      volume: 0.18,
      notes: [
        { freq: 196.0, start: 0, duration: 0.18 },
        { freq: 146.83, start: 0.18, duration: 0.35 },
      ],
    },
  };

  // AudioContext を受け取りパターンを再生する。再生終了予定の秒数を返す。
  function playPattern(ctx, name) {
    const pattern = PATTERNS[name];
    if (!pattern) throw new Error(`unknown sound: ${name}`);
    const t0 = ctx.currentTime;
    let end = 0;
    for (const n of pattern.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = pattern.wave;
      osc.frequency.value = n.freq;
      // クリックノイズ防止のため、短いフェードイン・フェードアウトを付ける
      gain.gain.setValueAtTime(0.0001, t0 + n.start);
      gain.gain.linearRampToValueAtTime(pattern.volume, t0 + n.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + n.start);
      osc.stop(t0 + n.start + n.duration + 0.02);
      end = Math.max(end, n.start + n.duration);
    }
    return end;
  }

  function createPlayer(contextFactory) {
    let ctx = null;
    let muted = false;
    return {
      get muted() { return muted; },
      setMuted(v) { muted = Boolean(v); },
      play(name) {
        if (muted) return false;
        try {
          if (!ctx) ctx = contextFactory();
          if (!ctx) return false;
          if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
          playPattern(ctx, name);
          return true;
        } catch (e) {
          if (e && /^unknown sound/.test(e.message)) throw e;
          return false; // 音が出せない環境でもゲームは続行する
        }
      },
    };
  }

  const api = { PATTERNS, playPattern, createPlayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicSound = api;
})(typeof window !== 'undefined' ? window : globalThis);
