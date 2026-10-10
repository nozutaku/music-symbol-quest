const test = require('node:test');
const assert = require('node:assert/strict');
const { PATTERNS, playPattern, createPlayer } = require('../src/sound.js');

function fakeContext(state = 'running') {
  const oscs = [];
  const ctx = {
    currentTime: 10,
    state,
    resumed: false,
    destination: {},
    resume() { ctx.resumed = true; },
    createGain() {
      return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    },
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, started: null, stopped: null, connect() {}, start(t) { o.started = t; }, stop(t) { o.stopped = t; } };
      oscs.push(o);
      return o;
    },
  };
  return { ctx, oscs };
}

test('正解音(ピンポーン): 高い音のあとに低い音が続き、後の音のほうが長い。不正解音(ブッブー)は正解音より低い', () => {
  const [ping, pong] = PATTERNS.correct.notes;
  assert.ok(ping.freq > pong.freq);
  assert.ok(pong.duration > ping.duration);
  const buzz = PATTERNS.wrong.notes;
  assert.equal(buzz.length, 2);
  assert.equal(buzz[0].freq, buzz[1].freq);
  assert.ok(buzz[1].duration > buzz[0].duration);
  assert.ok(buzz[1].start > buzz[0].start + buzz[0].duration, '「ブッ」と「ブー」の間に無音がある');
  assert.ok(buzz[0].freq < pong.freq);
});

test('全パターンの音符は周波数・長さが正で、開始時刻が昇順', () => {
  for (const [name, p] of Object.entries(PATTERNS)) {
    let prev = -1;
    for (const n of p.notes) {
      assert.ok(n.freq > 0 && n.duration > 0, name);
      assert.ok(n.start >= prev, `${name}: start が昇順でない`);
      prev = n.start;
    }
  }
});

test('playPattern(correct): サイン波2音（ピン・ポーン）が現在時刻基準で予約され、終了秒数を返す', () => {
  const { ctx, oscs } = fakeContext();
  const end = playPattern(ctx, 'correct');
  assert.equal(oscs.length, 2);
  assert.deepEqual(oscs.map((o) => o.frequency.value), [1760, 1318.51]);
  assert.ok(Math.abs(oscs[1].started - 10.25) < 1e-9);
  assert.ok(oscs.every((o) => o.type === 'sine' && o.stopped > o.started));
  assert.ok(Math.abs(end - 1.35) < 1e-9);
});

test('playPattern(wrong): のこぎり波のブザーが「ブッ」「ブー」の2回鳴り、2回目は0.26秒後に始まる', () => {
  const { ctx, oscs } = fakeContext();
  const end = playPattern(ctx, 'wrong');
  assert.equal(oscs.length, 2);
  assert.ok(Math.abs(oscs[1].started - 10.26) < 1e-9);
  assert.ok(Math.abs(end - 0.76) < 1e-9);
  assert.ok(oscs.every((o) => o.type === 'sawtooth'));
});

test('playPattern: 未知の名前はエラー', () => {
  assert.throws(() => playPattern(fakeContext().ctx, 'nope'), /unknown sound/);
});

test('createPlayer: ミュート中は鳴らさずコンテキストも作らない、解除すると鳴る', () => {
  let created = 0;
  const { ctx, oscs } = fakeContext();
  const player = createPlayer(() => { created++; return ctx; });
  player.setMuted(true);
  assert.equal(player.play('correct'), false);
  assert.equal(created, 0);
  assert.equal(oscs.length, 0);
  player.setMuted(false);
  assert.equal(player.play('correct'), true);
  assert.equal(oscs.length, 2);
});

test('createPlayer: suspended 状態なら resume を呼び、コンテキストは再利用される', () => {
  let created = 0;
  const { ctx } = fakeContext('suspended');
  const player = createPlayer(() => { created++; return ctx; });
  player.play('wrong');
  player.play('wrong');
  assert.equal(ctx.resumed, true);
  assert.equal(created, 1);
});

test('createPlayer: 音を出せない環境（コンテキスト生成失敗・null）でも例外を出さず false', () => {
  assert.equal(createPlayer(() => { throw new Error('no audio'); }).play('correct'), false);
  assert.equal(createPlayer(() => null).play('correct'), false);
});

test('音量: 正解音は不正解のブザーより大きく設定され、どちらも 0 より大きく 1 以下', () => {
  const { correct, wrong } = PATTERNS;
  assert.ok(correct.volume > wrong.volume);
  for (const p of [correct, wrong]) assert.ok(p.volume > 0 && p.volume <= 1);
});
