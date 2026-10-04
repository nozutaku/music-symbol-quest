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

test('正解音: 音程が単調に上昇し、不正解音: 下降し、不正解の最高音は正解の最低音より低い', () => {
  const up = PATTERNS.correct.notes.map((n) => n.freq);
  const down = PATTERNS.wrong.notes.map((n) => n.freq);
  assert.deepEqual([...up].sort((a, b) => a - b), up);
  assert.deepEqual([...down].sort((a, b) => b - a), down);
  assert.ok(Math.max(...down) < Math.min(...up));
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

test('playPattern(correct): 音符数ぶんのオシレーターが現在時刻基準で予約され、終了秒数を返す', () => {
  const { ctx, oscs } = fakeContext();
  const end = playPattern(ctx, 'correct');
  assert.equal(oscs.length, 4);
  assert.deepEqual(oscs.map((o) => o.frequency.value), [523.25, 659.25, 783.99, 1046.5]);
  assert.ok(Math.abs(oscs[2].started - 10.2) < 1e-9);
  assert.ok(oscs.every((o) => o.type === 'triangle' && o.stopped > o.started));
  assert.ok(Math.abs(end - 0.58) < 1e-9);
});

test('playPattern(wrong): のこぎり波で2音が鳴る', () => {
  const { ctx, oscs } = fakeContext();
  playPattern(ctx, 'wrong');
  assert.equal(oscs.length, 2);
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
  assert.equal(oscs.length, 4);
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
