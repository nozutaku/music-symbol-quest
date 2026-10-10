const test = require('node:test');
const assert = require('node:assert/strict');
const { SYMBOLS } = require('../src/symbols.js');
const { svgFor, GLYPH_IDS } = require('../src/glyphs.js');

const SHAPE_IDS = ['staccato', 'tenuto', 'accent', 'fermata', 'tie', 'slur', 'cresc', 'decresc'];

test('glyphs: 音符・休符カテゴリの全記号と、形で示す演奏記号・強弱記号に SVG がある', () => {
  const required = [...SYMBOLS.filter((s) => s.category === 'notes').map((s) => s.id), ...SHAPE_IDS];
  for (const id of required) {
    const svg = svgFor(id);
    assert.equal(typeof svg, 'string', `${id} の図がない`);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 \d+ \d+"/, `${id} が SVG ではない`);
    assert.ok(svg.endsWith('</svg>'), `${id} の SVG が閉じていない`);
  }
});

test('glyphs: 教材の表にない id には図を作らず null（文字表示にフォールバック）', () => {
  assert.equal(svgFor('sfz'), null);
  assert.equal(svgFor('treble'), null);
  assert.equal(svgFor(''), null);
});

test('glyphs: すべての図の id が symbols.js に実在する', () => {
  const ids = new Set(SYMBOLS.map((s) => s.id));
  for (const id of GLYPH_IDS) assert.ok(ids.has(id), `${id} は記号データにない`);
});

test('glyphs: 音符の形 - 全音符は符幹なし、2分以下は符幹あり、8分は旗1本・16分は旗2本', () => {
  const count = (svg, re) => (svg.match(re) || []).length;
  const stems = (id) => count(svgFor(id), /<rect [^>]*width="1\.6"/g);
  const flags = (id) => count(svgFor(id), /<path d="M[\d.]+ [\d.]+ C/g);
  assert.equal(stems('whole-note'), 0);
  for (const id of ['half-note', 'quarter-note', 'eighth-note', 'sixteenth-note']) assert.equal(stems(id), 1, id);
  assert.deepEqual(['quarter-note', 'eighth-note', 'sixteenth-note'].map(flags), [0, 1, 2]);
});

test('glyphs: 白い音符（全・2分）は穴あきマスク、黒い音符（4分）はマスクなし', () => {
  assert.match(svgFor('whole-note'), /<mask /);
  assert.match(svgFor('half-note'), /<mask /);
  assert.doesNotMatch(svgFor('quarter-note'), /<mask /);
});

test('glyphs: 休符は五線（5本）の上に描かれる', () => {
  for (const id of ['whole-rest', 'half-rest', 'quarter-rest', 'eighth-rest', 'sixteenth-rest']) {
    assert.equal((svgFor(id).match(/opacity="0\.75"/g) || []).length, 5, id);
  }
});

test('glyphs: 同じ記号を複数回描いてもマスク id が衝突しない', () => {
  const a = svgFor('half-note').match(/<mask id="([^"]+)"/)[1];
  const b = svgFor('half-note').match(/<mask id="([^"]+)"/)[1];
  assert.notEqual(a, b);
});

test('glyphs: タイは同じ高さ、スラーは違う高さの2音（符頭の y 座標）', () => {
  const heads = (id) => [...svgFor(id).matchAll(/<ellipse cx="[\d.]+" cy="([\d.]+)"/g)].map((m) => m[1]);
  const tie = heads('tie');
  const slur = heads('slur');
  assert.equal(tie.length, 2);
  assert.equal(tie[0], tie[1]);
  assert.equal(slur.length, 2);
  assert.notEqual(slur[0], slur[1]);
});
