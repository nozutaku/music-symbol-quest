(function (root) {
  const CATEGORIES = [
    { id: 'dynamics', label: '強弱記号', icon: '🔊' },
    { id: 'tempo', label: '速度記号', icon: '⏱️' },
    { id: 'expression', label: '発想記号', icon: '🎭' },
    { id: 'articulation', label: '奏法・アーティキュレーション', icon: '🎻' },
    { id: 'notation', label: '記号・反復', icon: '🔁' },
    { id: 'notes', label: '音符・休符', icon: '🎼' },
  ];

  const s = (id, category, display, reading, meaning) => ({ id, category, display, reading, meaning });

  const SYMBOLS = [
    s('pp', 'dynamics', 'pp', 'ピアニッシモ', 'とても弱く'),
    s('p', 'dynamics', 'p', 'ピアノ', '弱く'),
    s('mp', 'dynamics', 'mp', 'メゾピアノ', 'やや弱く'),
    s('mf', 'dynamics', 'mf', 'メゾフォルテ', 'やや強く'),
    s('f', 'dynamics', 'f', 'フォルテ', '強く'),
    s('ff', 'dynamics', 'ff', 'フォルティッシモ', 'とても強く'),
    s('sfz', 'dynamics', 'sfz', 'スフォルツァンド', '特に強く'),
    s('fp', 'dynamics', 'fp', 'フォルテピアノ', '強く、すぐに弱く'),
    s('cresc', 'dynamics', 'cresc.', 'クレシェンド', 'だんだん強く'),
    s('dim', 'dynamics', 'dim.', 'ディミヌエンド', 'だんだん弱く'),

    s('largo', 'tempo', 'Largo', 'ラルゴ', '幅広くゆるやかに'),
    s('adagio', 'tempo', 'Adagio', 'アダージョ', 'ゆるやかに'),
    s('andante', 'tempo', 'Andante', 'アンダンテ', '歩くような速さで'),
    s('moderato', 'tempo', 'Moderato', 'モデラート', '中くらいの速さで'),
    s('allegro', 'tempo', 'Allegro', 'アレグロ', '速く'),
    s('presto', 'tempo', 'Presto', 'プレスト', 'きわめて速く'),
    s('rit', 'tempo', 'rit.', 'リタルダンド', 'だんだん遅く'),
    s('accel', 'tempo', 'accel.', 'アッチェレランド', 'だんだん速く'),
    s('atempo', 'tempo', 'a tempo', 'ア・テンポ', 'もとの速さで'),
    s('fermata', 'tempo', '𝄐', 'フェルマータ', '音をほどよく伸ばす'),

    s('dolce', 'expression', 'dolce', 'ドルチェ', '甘くやわらかに'),
    s('cantabile', 'expression', 'cantabile', 'カンタービレ', '歌うように'),
    s('espressivo', 'expression', 'espress.', 'エスプレッシーヴォ', '表情豊かに'),
    s('maestoso', 'expression', 'maestoso', 'マエストーソ', '荘厳に'),
    s('grazioso', 'expression', 'grazioso', 'グラツィオーソ', '優雅に'),
    s('leggero', 'expression', 'leggero', 'レッジェーロ', '軽やかに'),
    s('conbrio', 'expression', 'con brio', 'コン・ブリオ', '生き生きと'),

    s('staccato', 'articulation', '♩̇', 'スタッカート', '音を短く切る'),
    s('accent', 'articulation', '>', 'アクセント', 'その音を強調する'),
    s('tenuto', 'articulation', '–', 'テヌート', '音の長さを十分に保つ'),
    s('slur', 'articulation', '⌒', 'スラー', '音をなめらかにつなげる'),
    s('marcato', 'articulation', '^', 'マルカート', '一音一音をはっきりと強調'),
    s('trill', 'articulation', 'tr~', 'トリル', '隣り合う音を素早く往復する'),

    s('treble', 'notation', '𝄞', 'ト音記号', '第2線がソの高さ（高音域）'),
    s('bass', 'notation', '𝄢', 'ヘ音記号', '第4線がファの高さ（低音域）'),
    s('sharp', 'notation', '♯', 'シャープ', '半音上げる'),
    s('flat', 'notation', '♭', 'フラット', '半音下げる'),
    s('natural', 'notation', '♮', 'ナチュラル', 'もとの高さに戻す'),
    s('repeat', 'notation', '𝄆 𝄇', 'リピート記号', '囲まれた部分を繰り返す'),
    s('dc', 'notation', 'D.C.', 'ダ・カーポ', '最初に戻る'),
    s('ds', 'notation', 'D.S.', 'ダル・セーニョ', 'セーニョ記号に戻る'),
    s('segno', 'notation', '𝄋', 'セーニョ', 'D.S. で戻る目印'),
    s('coda', 'notation', '𝄌', 'コーダ', '終結部へ進む目印'),
    s('fine', 'notation', 'Fine', 'フィーネ', '曲の終わり'),

    s('whole-note', 'notes', '𝅝', '全音符', '4分音符4つ分の長さ'),
    s('half-note', 'notes', '𝅗𝅥', '2分音符', '4分音符2つ分の長さ'),
    s('quarter-note', 'notes', '𝅘𝅥', '4分音符', '基準となる1拍の長さ（4/4拍子の場合）'),
    s('eighth-note', 'notes', '𝅘𝅥𝅮', '8分音符', '4分音符の半分の長さ'),
    s('whole-rest', 'notes', '𝄻', '全休符', '全音符と同じ長さ休む'),
    s('half-rest', 'notes', '𝄼', '2分休符', '2分音符と同じ長さ休む'),
    s('quarter-rest', 'notes', '𝄽', '4分休符', '4分音符と同じ長さ休む'),
    s('eighth-rest', 'notes', '𝄾', '8分休符', '8分音符と同じ長さ休む'),
  ];

  const api = { CATEGORIES, SYMBOLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicData = api;
})(typeof window !== 'undefined' ? window : globalThis);
