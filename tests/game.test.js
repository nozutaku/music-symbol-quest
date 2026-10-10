const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, SYMBOLS } = require('../src/symbols.js');
const { createRng, shuffle, buildQuestion, calcRank, createGame, QUESTION_TYPES } = require('../src/game.js');

const sym = (id) => SYMBOLS.find((s) => s.id === id);

// ---- データの整合性 ----
test('データ: 全記号に id/category/display/reading/meaning があり id は重複しない', () => {
  const ids = new Set();
  for (const s of SYMBOLS) {
    for (const key of ['id', 'category', 'display', 'reading', 'meaning']) {
      assert.equal(typeof s[key], 'string', `${s.id}.${key}`);
      assert.notEqual(s[key].trim(), '', `${s.id}.${key} が空`);
    }
    assert.ok(!ids.has(s.id), `id 重複: ${s.id}`);
    ids.add(s.id);
  }
});

test('データ: 全記号のカテゴリが CATEGORIES に存在し、各カテゴリに4個以上ある', () => {
  const catIds = CATEGORIES.map((c) => c.id);
  for (const s of SYMBOLS) assert.ok(catIds.includes(s.category), `${s.id}: 不明なカテゴリ ${s.category}`);
  for (const id of catIds) {
    assert.ok(SYMBOLS.filter((s) => s.category === id).length >= 4, `${id} の記号が4個未満`);
  }
});

test('データ: 読み・表記が重複しない（選択肢が曖昧にならない）', () => {
  for (const key of ['reading', 'display']) {
    const values = SYMBOLS.map((s) => s[key]);
    assert.equal(new Set(values).size, values.length, `${key} に重複あり`);
  }
});

test('データ: 教材の表で意味が同じ記号（Adagio/Lento、decresc./dim.）でも選択肢に同じ意味が2つ並ばない', () => {
  assert.equal(sym('adagio').meaning, sym('lento').meaning);
  assert.equal(sym('decresc').meaning, sym('dim').meaning);
  for (const id of ['adagio', 'lento', 'decresc', 'dim']) {
    for (let seed = 0; seed < 30; seed++) {
      const q = buildQuestion(SYMBOLS, sym(id), 'meaning', createRng(seed));
      assert.equal(q.choices.filter((c) => c === sym(id).meaning).length, 1, `${id} seed=${seed}`);
    }
  }
});

// ---- 乱数・シャッフル ----
test('createRng: 同じシードなら同じ列、値は 0以上1未満', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 20; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('shuffle: 要素の集合は保たれ、元配列は変更されない', () => {
  const src = [1, 2, 3, 4, 5, 6];
  const out = shuffle(src, createRng(1));
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(src, [1, 2, 3, 4, 5, 6]);
});

// ---- 問題生成 ----
test('buildQuestion(meaning): 「f」の問題は正解が「強く」で選択肢は4つの重複なし', () => {
  const q = buildQuestion(SYMBOLS, sym('f'), 'meaning', createRng(7));
  assert.equal(q.prompt.main, 'f');
  assert.equal(q.choices.length, 4);
  assert.equal(q.choices[q.correctIndex], '強く');
  assert.equal(new Set(q.choices).size, 4);
});

test('buildQuestion(reading): 「Allegro」の正解は「アレグロ」', () => {
  const q = buildQuestion(SYMBOLS, sym('allegro'), 'reading', createRng(3));
  assert.equal(q.prompt.main, 'Allegro');
  assert.equal(q.choices[q.correctIndex], 'アレグロ');
});

test('buildQuestion(symbol): 「半音上げる」の問題は記号 ♯ を選ぶ形式で読みを補足表示', () => {
  const q = buildQuestion(SYMBOLS, sym('sharp'), 'symbol', createRng(5));
  assert.equal(q.prompt.main, '半音上げる');
  assert.equal(q.prompt.sub, 'シャープ');
  assert.equal(q.choices[q.correctIndex], '♯');
});

test('buildQuestion: 選択肢は同カテゴリの記号が優先される（強弱記号なら全て強弱記号）', () => {
  const dynamics = SYMBOLS.filter((s) => s.category === 'dynamics').map((s) => s.meaning);
  for (let seed = 0; seed < 30; seed++) {
    const q = buildQuestion(SYMBOLS, sym('p'), 'meaning', createRng(seed));
    for (const c of q.choices) assert.ok(dynamics.includes(c), `${c} は強弱記号ではない`);
  }
});

test('buildQuestion: 表記が同じ別記号が候補にあっても正解と同じ文字列は選択肢に入らない', () => {
  const pool = [
    { id: 'a', category: 'x', display: '⌒', reading: 'スラー', meaning: 'つなげる' },
    { id: 'b', category: 'x', display: '⌒', reading: 'タイ', meaning: '同じ音をつなぐ' },
    { id: 'c', category: 'x', display: 'c', reading: 'シー', meaning: 'c の意味' },
    { id: 'd', category: 'x', display: 'd', reading: 'ディー', meaning: 'd の意味' },
    { id: 'e', category: 'x', display: 'e', reading: 'イー', meaning: 'e の意味' },
  ];
  const q = buildQuestion(pool, pool[0], 'symbol', createRng(1));
  assert.equal(q.choices.filter((c) => c === '⌒').length, 1);
  assert.equal(new Set(q.choices).size, 4);
});

test('buildQuestion: 異常系 - 候補が足りない場合・未知のタイプはエラー', () => {
  const few = SYMBOLS.slice(0, 3);
  assert.throws(() => buildQuestion(few, few[0], 'meaning', createRng(1)), /not enough/);
  assert.throws(() => buildQuestion(SYMBOLS, SYMBOLS[0], 'unknown', createRng(1)), /unknown question type/);
});

test('buildQuestion: 全記号×全タイプで正解インデックスが正しい指す先を持つ', () => {
  const field = { meaning: 'meaning', reading: 'reading', symbol: 'display' };
  for (const type of QUESTION_TYPES) {
    for (const s of SYMBOLS) {
      const q = buildQuestion(SYMBOLS, s, type, createRng(11));
      assert.equal(q.choices[q.correctIndex], s[field[type]], `${s.id}/${type}`);
      assert.equal(new Set(q.choices).size, q.choices.length, `${s.id}/${type} 選択肢重複`);
    }
  }
});

// ---- ランク ----
test('calcRank: 境界値 90%→S, 89%→A, 70%→A, 69%→B, 50%→B, 49%→C, 0問→C', () => {
  assert.equal(calcRank(9, 10), 'S');
  assert.equal(calcRank(89, 100), 'A');
  assert.equal(calcRank(7, 10), 'A');
  assert.equal(calcRank(69, 100), 'B');
  assert.equal(calcRank(5, 10), 'B');
  assert.equal(calcRank(49, 100), 'C');
  assert.equal(calcRank(0, 0), 'C');
});

// ---- ゲーム進行 ----
function playWith(game, pickCorrect) {
  const log = [];
  while (!game.state.finished) {
    const q = game.current();
    const idx = pickCorrect() ? q.correctIndex : (q.correctIndex + 1) % q.choices.length;
    log.push(game.answer(idx));
    game.next();
  }
  return log;
}

test('createGame: 全問正解するとスコアは 100,150,200,250,300,350,350 の合計でランクS', () => {
  const game = createGame({ symbols: SYMBOLS, rounds: 7, rng: createRng(1) });
  const log = playWith(game, () => true);
  assert.deepEqual(log.map((r) => r.gained), [100, 150, 200, 250, 300, 350, 350]);
  const r = game.result();
  assert.equal(r.score, 1700);
  assert.equal(r.correct, 7);
  assert.equal(r.maxCombo, 7);
  assert.equal(r.rank, 'S');
  assert.equal(r.cleared, true);
});

test('createGame: 不正解でコンボが途切れ、ライフが1減り、得点は増えない', () => {
  const game = createGame({ symbols: SYMBOLS, rounds: 5, rng: createRng(2) });
  let q = game.current();
  game.answer(q.correctIndex); game.next();
  q = game.current();
  game.answer(q.correctIndex); game.next();
  assert.equal(game.state.combo, 2);
  q = game.current();
  const res = game.answer((q.correctIndex + 1) % 4);
  assert.equal(res.isCorrect, false);
  assert.equal(res.gained, 0);
  assert.equal(game.state.combo, 0);
  assert.equal(game.state.lives, 2);
  assert.equal(game.state.score, 250);
  assert.equal(game.state.maxCombo, 2);
});

test('createGame: 3回間違えるとラウンド途中でもゲームオーバー（cleared=false）', () => {
  const game = createGame({ symbols: SYMBOLS, rounds: 10, lives: 3, rng: createRng(3) });
  const log = playWith(game, () => false);
  assert.equal(log.length, 3);
  assert.equal(game.state.finished, true);
  assert.equal(game.current(), null);
  assert.equal(game.result().cleared, false);
  assert.equal(game.result().rank, 'C');
});

test('createGame: 同じ記号は1ゲーム内で2回出題されない', () => {
  const game = createGame({ symbols: SYMBOLS, rounds: 10, rng: createRng(4) });
  const ids = [];
  while (!game.state.finished) {
    ids.push(game.current().symbol.id);
    game.answer(game.current().correctIndex);
    game.next();
  }
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
});

test('createGame: 記号数がラウンド数より少なければ記号数が総問題数になる', () => {
  const pool = SYMBOLS.filter((s) => s.category === 'tempo').slice(0, 5);
  const game = createGame({ symbols: pool, rounds: 10, rng: createRng(5) });
  assert.equal(game.state.total, 5);
});

test('createGame: 異常系 - 二重回答・未回答で next・終了後の回答はエラー', () => {
  const game = createGame({ symbols: SYMBOLS, rounds: 1, rng: createRng(6) });
  assert.throws(() => game.next(), /answer the current question first/);
  game.answer(game.current().correctIndex);
  assert.throws(() => game.answer(0), /already answered/);
  game.next();
  assert.throws(() => game.answer(0), /game is finished/);
});

test('createGame: 異常系 - 記号が選択肢数より少ないとエラー', () => {
  assert.throws(() => createGame({ symbols: SYMBOLS.slice(0, 3) }), /not enough/);
});

test('symbol問題: 意味が同じ記号（Adagio/Lento、decresc./dim.）も別の記号として扱い、正解は1つで読みの補足も出る', () => {
  for (const id of ['adagio', 'lento', 'decresc', 'dim']) {
    for (let seed = 0; seed < 100; seed++) {
      const q = buildQuestion(SYMBOLS, sym(id), 'symbol', createRng(seed));
      assert.equal(q.prompt.sub, sym(id).reading, id);
      assert.equal(q.choices.filter((c) => c === sym(id).display).length, 1, id);
      assert.equal(q.choices[q.correctIndex], sym(id).display, id);
    }
  }
});
