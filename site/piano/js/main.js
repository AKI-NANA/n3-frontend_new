// ====================================
// タイトルアニメーション - 光の粒子
// ====================================
window.addEventListener('DOMContentLoaded', () => {
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    const text = heroTitle.textContent;
    heroTitle.textContent = '';
    
    // 一文字づつspanで囲む
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.textContent = char;
      heroTitle.appendChild(span);
    });
  }
});

// ====================================
// 画像フェードイン効果
// ====================================
window.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('img');
  
  // Intersection Observerで表示時にアニメーション
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('loaded');
        imageObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  images.forEach(img => {
    // ヒーローとロゴ以外を監視
    if (!img.closest('.hero-slide') && !img.classList.contains('logo-image')) {
      imageObserver.observe(img);
    }
  });
});

// ====================================
// 音楽データベース (全曲対応)
// ====================================
const piecesDatabase = {
  // クラシック - 音源あり
  'erize': {
    title: 'エリーゼのために',
    composer: 'ルートヴィヒ・ヴァン・ベートーヴェン',
    era: '古典派 (1770-1827)',
    description: 'ベートーヴェンが1810年頃に作曲したピアノ小品。原題は「Für Elise」で、エリーゼという女性に捧げられたとされています。',
    background: 'この曲の「エリーゼ」が誰なのかは長年の謎とされてきました。一説には、ベートーヴェンの弟子テレーゼ・マルファッティのことで、筆跡が悪く「Therese」が「Elise」と読み間違えられたという説が有力です。',
    features: '冒頭の有名なメロディーは誰もが一度は耳にしたことがある旋律で、シンプルながらも優雅で情緒的な作品です。A-B-A-C-Aの5部形式で構成され、中間部では激しい感情の起伏が表現されています。',
    difficulty: '初級〜中級',
    audio: 'mp3/erize.mp3'
  },
  'trukish': {
    title: 'トルコ行進曲',
    composer: 'ヴォルフガング・アマデウス・モーツァルト',
    era: '古典派 (1756-1791)',
    description: 'ピアノソナタ第11番イ長調 K.331の第3楽章。「トルコ風」という副題で知られる、モーツァルトの代表作の一つです。',
    background: '18世紀のヨーロッパでは、オスマン帝国(トルコ)の音楽や文化への関心が高まっており、「トルコ風」の音楽が流行していました。この曲もその影響を受けて作曲されました。',
    features: '軽快なリズムと明るい旋律が特徴で、トルコの軍楽隊を模した打楽器的な効果が印象的です。右手の速いパッセージと左手のマーチ風の伴奏が組み合わさり、華やかで活気に満ちた雰囲気を作り出しています。',
    difficulty: '中級',
    audio: 'mp3/trukish.mp3'
  },
  'koinu': {
    title: '子犬のワルツ',
    composer: 'フレデリック・ショパン',
    era: 'ロマン派 (1810-1849)',
    description: 'ワルツ第6番変ニ長調 作品64-1。ショパンが晩年の1846年から1848年にかけて作曲した3つのワルツのうちの1曲です。',
    background: 'ジョルジュ・サンドの愛犬が自分の尻尾を追いかけてくるくる回る様子を見たショパンが、その光景を音楽で表現したという逸話から「子犬のワルツ」と呼ばれるようになりました。',
    features: '冒頭から続く右手の速いパッセージが、子犬がくるくると回る様子を表現しています。軽快で愛らしい雰囲気ながら、技術的には高度なテクニックが必要とされる作品です。',
    difficulty: '中級〜上級',
    audio: 'mp3/koinu.mp3'
  },
  'fantaisie': {
    title: '幻想即興曲',
    composer: 'フレデリック・ショパン',
    era: 'ロマン派 (1810-1849)',
    description: '即興曲第4番嬰ハ短調 作品66。ショパンの即興曲の中で最も有名な作品で、1834年に作曲されました。',
    background: 'ショパンはこの曲を生前出版することを望まず、死後に友人のフォンタナによって出版されました。「幻想」という言葉は、自由で即興的な性格を持つこの曲の特徴を表しています。',
    features: '右手と左手が異なるリズムで進行する(ポリリズム)という技術的に非常に難しい部分が特徴です。激しく情熱的な外側の部分と、美しく抒情的な中間部の対比が印象的です。',
    difficulty: '上級',
    audio: 'mp3/fantaisie.mp3'
  },
  'nocturne': {
    title: 'ノクターン第2番',
    composer: 'フレデリック・ショパン',
    era: 'ロマン派 (1810-1849)',
    description: 'ノクターン(夜想曲)第2番変ホ長調 作品9-2。1830-1832年頃に作曲された、ショパンの最も有名な作品の一つです。',
    background: 'ノクターン(夜想曲)とは、夜の雰囲気や情景を表現した音楽のジャンルで、アイルランドの作曲家ジョン・フィールドによって確立されました。ショパンはこの形式を更に発展させ、芸術性の高い作品を数多く残しました。',
    features: '美しく抒情的なメロディーが特徴で、装飾音を多用した優雅な旋律が夜の静けさと詩情を表現しています。中間部では激しさを増し、再び静かな主題に戻るという構成になっています。',
    difficulty: '中級',
    audio: 'mp3/nocturne-op9-2.mp3'
  },
  'lovedream': {
    title: '愛の夢 第3番',
    composer: 'フランツ・リスト',
    era: 'ロマン派 (1811-1886)',
    description: '「3つの夜想曲」より第3番変イ長調。もともとは歌曲として作曲され、後にピアノ独奏曲に編曲されました。',
    background: 'フェルディナント・フライリヒラートの詩「愛せよ、愛することができる限り」に基づいて作曲されました。リストは1850年にこの曲をピアノ独奏曲に編曲し、「愛の夢」というタイトルで出版しました。',
    features: '甘美で情熱的なメロディーが特徴で、ロマンティックな雰囲気に満ちています。技巧的なパッセージと美しい旋律が融合した、リストらしい華やかな作品です。',
    difficulty: '上級',
    audio: 'mp3/lovedream.mp3'
  },
  'lacampanella': {
    title: 'ラ・カンパネラ',
    composer: 'フランツ・リスト',
    era: 'ロマン派 (1811-1886)',
    description: '「パガニーニによる大練習曲」第3番嬰ト短調。イタリア語で「小さな鐘」を意味する、リストの代表作の一つです。',
    background: 'ヴァイオリンの名手パガニーニのヴァイオリン協奏曲第2番の終楽章の主題を基に、リストがピアノ用に編曲したものです。1851年に完成した最終稿が現在広く演奏されています。',
    features: '鐘の音を模した高音域の跳躍や、超絶技巧を要するパッセージが特徴です。華麗で技巧的な作品で、ピアニストの技術力を示す代表的なレパートリーとなっています。',
    difficulty: '超上級',
    audio: 'mp3/lacampanella.mp3'
  },
  
  // クラシック - 音源なし (詳細情報のみ)
  'moonlight': {
    title: '月光ソナタ',
    composer: 'ルートヴィヒ・ヴァン・ベートーヴェン',
    era: '古典派 (1770-1827)',
    description: 'ピアノソナタ第14番嬰ハ短調 作品27-2。「月光」という愛称で知られるベートーヴェンの代表作です。',
    background: '「月光」という愛称は、詩人レルシュタープが第1楽章を「スイスのルツェルン湖の月光の波に揺らぐ小舟のよう」と評したことに由来します。',
    features: '第1楽章の憂鬱で瞑想的な雰囲気が特徴的です。全3楽章で構成され、第3楽章では激しく情熱的な音楽へと転じます。',
    difficulty: '中級〜上級'
  },
  'revolution': {
    title: '革命のエチュード',
    composer: 'フレデリック・ショパン',
    era: 'ロマン派 (1810-1849)',
    description: '練習曲作品10-12。激しい左手のパッセージが特徴的な、ショパンの代表的なエチュードです。',
    background: '1831年のワルシャワ蜂起の失敗を知ったショパンの心情が表現されていると言われています。',
    features: '左手の激しいパッセージが、革命の激動を表現しています。技巧的にも感情的にも非常に難易度の高い作品です。',
    difficulty: '上級'
  },
  'dacan': {
    title: 'かっこう',
    composer: 'ルイ=クロード・ダカン',
    era: 'バロック派 (1694-1772)',
    description: 'チェンバロのための小品。かっこうの鳴き声を模した軽快で愛らしい作品です。',
    background: 'フランス・バロック時代の作曲家ダカンによる、描写的な音楽の代表作です。',
    features: 'かっこうの鳴き声を巧みに表現した、明るく楽しい曲調が特徴です。',
    difficulty: '初級〜中級'
  },
  'maiden': {
    title: '乙女の祈り',
    composer: 'テクラ・バダジェフスカ',
    era: 'ロマン派 (1834-1861)',
    description: 'ポーランドの女性作曲家による、優雅で親しみやすいピアノ小品です。',
    background: '世界中で愛されている名曲で、ピアノ学習者の定番曲となっています。',
    features: '美しく流麗なメロディーが特徴で、ロマンティックな雰囲気に満ちています。',
    difficulty: '中級'
  },
  'canon': {
    title: 'カノン',
    composer: 'ヨハン・パッヘルベル',
    era: 'バロック派 (1653-1706)',
    description: '「カノンとジーグ ニ長調」の第1曲。結婚式などでも頻繁に演奏される、バロック音楽の代表曲です。',
    background: '3つのヴァイオリンと通奏低音のための作品で、後にピアノ編曲されました。',
    features: '同じ旋律が繰り返されながら重なっていく「カノン」の形式が特徴的です。',
    difficulty: '中級'
  },
  'gymnopedies': {
    title: 'ジムノペディ第1番',
    composer: 'エリック・サティ',
    era: '近代 (1866-1925)',
    description: '1888年に作曲された3つのジムノペディのうちの第1番。静謐で瞑想的な雰囲気の作品です。',
    background: 'サティの代表作で、ミニマル音楽の先駆けとも言われています。',
    features: 'ゆったりとしたテンポと、シンプルながら印象的な和音進行が特徴です。',
    difficulty: '中級'
  },
  'waltz-etude': {
    title: 'ワルツ・エチュード',
    composer: 'ウィリアム・ギロック',
    era: '現代 (1917-1993)',
    description: 'アメリカの作曲家ギロックによる、優雅なワルツです。',
    background: 'ギロックはピアノ教育のための作品を数多く残しました。',
    features: '美しいワルツのリズムと、華やかな技巧が融合した作品です。',
    difficulty: '中級'
  },
  'menuet': {
    title: 'メヌエット ト長調',
    composer: 'ヨハン・セバスティアン・バッハ',
    era: 'バロック派 (1685-1750)',
    description: '「アンナ・マグダレーナ・バッハの音楽帳」に収録されている有名なメヌエットです。',
    background: 'バッハがピアノ学習者のために編纂した曲集の中の1曲です。',
    features: 'バロック時代の舞曲の優雅さと、対位法的な美しさを持つ作品です。',
    difficulty: '初級'
  },
  'sonatine': {
    title: 'ソナチネ',
    composer: 'ムツィオ・クレメンティ',
    era: '古典派 (1752-1832)',
    description: 'ピアノ学習者のための小さなソナタ。クレメンティは数多くのソナチネを作曲しました。',
    background: 'クレメンティはピアノ教育に大きく貢献した作曲家です。',
    features: '古典的な形式美と、明快な構成が特徴です。',
    difficulty: '初級〜中級'
  },
  'impromptu': {
    title: '即興曲 変ホ長調',
    composer: 'フランツ・シューベルト',
    era: 'ロマン派 (1797-1828)',
    description: '4つの即興曲 作品90の第2番。美しく歌謡的な旋律が特徴です。',
    background: 'シューベルトの歌曲的な作風がピアノ曲にも表れています。',
    features: '流麗なメロディーと、ロマンティックな和声が魅力的です。',
    difficulty: '上級'
  },
  'twinkle': {
    title: 'きらきら星変奏曲',
    composer: 'ヴォルフガング・アマデウス・モーツァルト',
    era: '古典派 (1756-1791)',
    description: '12の変奏曲 K.265。誰もが知っている「きらきら星」の旋律による変奏曲です。',
    background: 'フランス民謡「ああ、お母さん聞いて」による変奏曲として作曲されました。',
    features: 'シンプルな主題が、様々な技巧的変奏によって華麗に展開されます。',
    difficulty: '中級〜上級'
  },
  'flower-waltz': {
    title: '花のワルツ',
    composer: 'ピョートル・チャイコフスキー',
    era: 'ロマン派 (1840-1893)',
    description: 'バレエ「くるみ割り人形」第2幕より。華やかで優雅なワルツです。',
    background: 'チャイコフスキーの三大バレエの一つから、最も人気のある曲です。',
    features: '流麗なワルツのリズムと、豪華なオーケストレーションが特徴です。',
    difficulty: '上級'
  },
  'clair-de-lune': {
    title: '月の光',
    composer: 'クロード・ドビュッシー',
    era: '印象派 (1862-1918)',
    description: 'ベルガマスク組曲の第3曲。幻想的で美しい、ドビュッシーの代表作です。',
    background: 'ヴェルレーヌの詩「月の光」に触発されて作曲されました。',
    features: '印象派音楽特有の美しい和声と、繊細な音色が魅力です。',
    difficulty: '上級'
  },

  // ポピュラー曲
  'whole-new-world': {
    title: 'ホールニューワールド',
    composer: 'アラン・メンケン',
    era: 'ディズニー映画「アラジン」(1992)',
    description: '魔法の絨毯に乗って夜空を飛ぶシーンで歌われる名曲です。',
    background: 'アカデミー歌曲賞を受賞した、ディズニーの代表曲の一つです。',
    features: '夢と冒険に満ちた、ロマンティックなメロディーが特徴です。',
    difficulty: '中級'
  },
  'tangled': {
    title: '輝く未来',
    composer: 'アラン・メンケン',
    era: 'ディズニー映画「塔の上のラプンツェル」(2010)',
    description: 'ランタンのシーンで歌われる感動的な楽曲です。',
    background: 'ディズニー・プリンセス映画の名曲として人気があります。',
    features: '希望と輝きに満ちた、美しいバラードです。',
    difficulty: '中級'
  },
  'beauty-beast': {
    title: '美女と野獣',
    composer: 'アラン・メンケン',
    era: 'ディズニー映画「美女と野獣」(1991)',
    description: 'ディズニー映画の主題歌として世界中で愛される名曲です。',
    background: 'アカデミー歌曲賞を受賞した不朽の名作です。',
    features: 'ロマンティックで壮大なバラードが特徴です。',
    difficulty: '中級'
  },
  'idol': {
    title: 'アイドル',
    composer: 'YOASOBI',
    era: '2023年',
    description: 'アニメ「【推しの子】」のオープニングテーマ。',
    background: '社会現象となった大ヒット曲です。',
    features: 'キャッチーなメロディーと、現代的なサウンドが魅力です。',
    difficulty: '中級'
  },
  'yusha': {
    title: '勇者',
    composer: 'YOASOBI',
    era: '2023年',
    description: 'YOASOBIの人気楽曲の一つです。',
    background: '小説を音楽にするYOASOBIらしい作品です。',
    features: '力強いメロディーと、ドラマティックな展開が特徴です。',
    difficulty: '中級'
  },
  'sparkle': {
    title: 'スパークル',
    composer: 'RADWIMPS',
    era: '映画「君の名は。」(2016)',
    description: '映画のクライマックスで流れる感動的な楽曲です。',
    background: '新海誠監督作品の代表的な主題歌です。',
    features: '切なく美しいメロディーが心に響きます。',
    difficulty: '中級'
  },
  'bansanka': {
    title: '晩餐歌',
    composer: 'Tuki.',
    era: '2020年代',
    description: 'ボカロPによる人気楽曲です。',
    background: 'SNSを中心に人気を集めた楽曲です。',
    features: '独特の世界観と、印象的なメロディーが特徴です。',
    difficulty: '中級'
  },
  'itsumo': {
    title: 'いつも何度でも',
    composer: '木村弓',
    era: '映画「千と千尋の神隠し」(2001)',
    description: 'ジブリ映画の主題歌として世界中で愛される名曲です。',
    background: '宮崎駿監督の代表作の主題歌です。',
    features: '優しく温かいメロディーが心を癒します。',
    difficulty: '初級〜中級'
  },
  'totoro': {
    title: 'となりのトトロ',
    composer: '久石譲',
    era: '映画「となりのトトロ」(1988)',
    description: 'ジブリの代表曲として誰もが知っている名曲です。',
    background: '日本を代表するアニメーション映画の主題歌です。',
    features: '明るく楽しい、親しみやすいメロディーです。',
    difficulty: '初級'
  },
  'rouge': {
    title: 'ルージュの伝言',
    composer: '荒井由実(松任谷由実)',
    era: '映画「魔女の宅急便」(1989)',
    description: 'ジブリ映画で使用され、新たな人気を得た楽曲です。',
    background: 'ユーミンの代表曲の一つです。',
    features: 'ポップで爽やかなメロディーが特徴です。',
    difficulty: '中級'
  },
  'summer': {
    title: 'Summer',
    composer: '久石譲',
    era: '映画「菊次郎の夏」(1999)',
    description: '夏の情景を美しく描いた、久石譲の代表作です。',
    background: '北野武監督作品の音楽として作曲されました。',
    features: '爽やかで印象的なメロディーが夏を感じさせます。',
    difficulty: '中級'
  },
  'howl': {
    title: 'ハウルの動く城',
    composer: '久石譲',
    era: '映画「ハウルの動く城」(2004)',
    description: 'ジブリ映画の主題曲。壮大で美しいワルツです。',
    background: '宮崎駿監督と久石譲のコンビによる名曲です。',
    features: 'ロマンティックで幻想的なメロディーが魅力です。',
    difficulty: '上級'
  },
  'ballade': {
    title: '渚のアデリーヌ',
    composer: 'ポール・ド・センヌヴィル',
    era: '1976年',
    description: 'リチャード・クレイダーマンの演奏で世界的に有名になった楽曲です。',
    background: 'イージーリスニングの代表曲です。',
    features: '優雅で美しいメロディーが心を癒します。',
    difficulty: '中級'
  },
  'cruel-angel': {
    title: '残酷な天使のテーゼ',
    composer: '佐藤英敏',
    era: 'アニメ「新世紀エヴァンゲリオン」(1995)',
    description: 'アニメ史に残る名曲として、長年愛され続けています。',
    background: '日本のアニメソングの代表曲です。',
    features: '力強く印象的なメロディーが特徴です。',
    difficulty: '中級〜上級'
  },
  'passion': {
    title: '情熱大陸',
    composer: '葉加瀬太郎',
    era: 'テレビ番組「情熱大陸」(1998〜)',
    description: 'ドキュメンタリー番組のテーマ曲として有名です。',
    background: 'ヴァイオリニスト葉加瀬太郎の代表曲です。',
    features: '情熱的で疾走感のあるメロディーが魅力です。',
    difficulty: '上級'
  },
  'senbonzakura': {
    title: '千本桜',
    composer: '黒うさP',
    era: 'ボーカロイド曲 (2011)',
    description: '初音ミクの代表曲として圧倒的な人気を誇ります。',
    background: 'ボカロ文化を代表する楽曲です。',
    features: '和風で華やかな、スピード感のある曲調が特徴です。',
    difficulty: '上級'
  },
  'native': {
    title: 'ナイティブフェイス',
    composer: 'ZUN',
    era: '東方Project',
    description: '東方Projectの人気楽曲です。',
    background: '同人音楽として高い人気を誇ります。',
    features: '独特のメロディーとリズムが印象的です。',
    difficulty: '上級'
  },
  'bohemian': {
    title: 'ボヘミアンラプソディ',
    composer: 'クイーン',
    era: '1975年',
    description: 'ロック史に残る名曲。映画化もされました。',
    background: 'クイーンの代表曲として世界中で愛されています。',
    features: '複雑な構成と、ドラマティックな展開が特徴です。',
    difficulty: '超上級'
  }
};

// ====================================
// グローバル音楽プレーヤー管理
// ====================================
let currentAudio = null;
const bgmPlayer = document.getElementById('bgmPlayer');
const musicControl = document.getElementById('musicControl');
let isMusicEnabled = false;
let currentPlayingPiece = null; // 現在再生中の曲のキー

// BGMを停止する関数
function stopBGM() {
  if (!bgmPlayer.paused) {
    bgmPlayer.pause();
  }
}

// BGMを再開する関数
function resumeBGM() {
  if (isMusicEnabled && bgmPlayer.paused) {
    bgmPlayer.play().catch(e => console.log('BGM resume failed:', e));
    updateMusicControl();
  }
}

// サンプル音源を停止する関数
function stopSampleAudio() {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentPlayingPiece = null;
  updateModalPlayButton();
}

// すべての音楽を完全に停止する関数
function stopAllMusic() {
  stopBGM();
  stopSampleAudio();
  updateMusicControl();
}

// 音楽コントロールボタンの表示を更新
function updateMusicControl() {
  musicControl.classList.remove('playing', 'paused', 'stopped');
  
  // サンプル音源が再生中の場合
  if (currentAudio && !currentAudio.paused) {
    musicControl.classList.add('sample-playing');
  }
  // BGMが再生中の場合
  else if (!bgmPlayer.paused) {
    musicControl.classList.add('playing');
  }
  // 全て停止の場合
  else {
    musicControl.classList.add('stopped');
  }
}

// ====================================
// BGMコントロール
// ====================================
bgmPlayer.volume = 0.3;

function acceptMusic() {
  document.getElementById('musicModal').classList.add('hidden');
  isMusicEnabled = true;
  bgmPlayer.play().catch(e => console.log('Audio play failed:', e));
  musicControl.classList.add('visible');
  updateMusicControl();
}

function declineMusic() {
  document.getElementById('musicModal').classList.add('hidden');
  isMusicEnabled = false;
  musicControl.classList.add('visible', 'stopped');
}

// 右固定ボタンのクリックイベント
musicControl.addEventListener('click', () => {
  // サンプル音源が再生中の場合 → サンプル停止
  if (currentAudio && !currentAudio.paused) {
    stopSampleAudio();
    // BGMが有効なら再開
    if (isMusicEnabled) {
      resumeBGM();
    }
  }
  // BGMが再生中の場合 → BGM一時停止
  else if (!bgmPlayer.paused) {
    stopBGM();
    musicControl.classList.remove('playing');
    musicControl.classList.add('paused');
  }
  // 停止状態の場合 → BGM再生
  else {
    if (isMusicEnabled) {
      bgmPlayer.play().catch(e => console.log('Audio play failed:', e));
      musicControl.classList.remove('paused', 'stopped');
      musicControl.classList.add('playing');
    }
  }
});

window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('musicModal').style.display = 'flex';
  }, 500);
});

// ====================================
// ナビゲーション
// ====================================
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 100) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ====================================
// ヒーロースライダー
// ====================================
const slides = document.querySelectorAll('.hero-slide');
let currentSlide = 0;

function nextSlide() {
  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}

setInterval(nextSlide, 4000);

// ====================================
// TOPに戻るボタン
// ====================================
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (window.scrollY > 500) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ====================================
// 画像フェードイン
// ====================================
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const fadeInOnScroll = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.nostalgic-img').forEach(img => {
  fadeInOnScroll.observe(img);
});

// ====================================
// レパートリータブ切り替え
// ====================================
function showRepertoire(type) {
  document.querySelectorAll('.repertoire-list').forEach(list => {
    list.classList.remove('active');
  });
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });

  if (type === 'classic') {
    document.getElementById('classic-list').classList.add('active');
    document.querySelector('.tab-button:nth-child(1)').classList.add('active');
  } else {
    document.getElementById('popular-list').classList.add('active');
    document.querySelector('.tab-button:nth-child(2)').classList.add('active');
  }
}

// ====================================
// 曲の詳細モーダル
// ====================================
function showPieceModal(pieceKey) {
  const piece = piecesDatabase[pieceKey];
  if (!piece) {
    alert('この曲の詳細情報は準備中です。');
    return;
  }

  const modal = document.getElementById('pieceModal');
  const modalContent = document.getElementById('modalContent');
  const playBtn = document.getElementById('modalPlayBtn');

  currentPlayingPiece = pieceKey;

  // モーダルコンテンツの構築
  modalContent.innerHTML = `
    <h3>${piece.title}</h3>
    <h4>${piece.composer}</h4>
    <p><strong>時代:</strong> ${piece.era}</p>
    
    <div class="section-heading">曲の概要</div>
    <p>${piece.description}</p>
    
    <div class="section-heading">時代背景</div>
    <p>${piece.background}</p>
    
    <div class="section-heading">曲の特徴</div>
    <p>${piece.features}</p>
    
    <div class="section-heading">演奏難易度</div>
    <p>${piece.difficulty}</p>
  `;

  // 再生ボタンの表示制御
  if (piece.audio) {
    playBtn.style.display = 'inline-block';
    updateModalPlayButton();
  } else {
    playBtn.style.display = 'none';
  }

  modal.classList.add('active');
}

function closePieceModal() {
  document.getElementById('pieceModal').classList.remove('active');
  currentPlayingPiece = null;
}

// モーダル内再生ボタンの表示を更新
function updateModalPlayButton() {
  const playBtn = document.getElementById('modalPlayBtn');
  if (!playBtn) return;

  if (currentAudio && !currentAudio.paused) {
    playBtn.textContent = '⏸ 停止';
    playBtn.classList.add('playing');
  } else {
    playBtn.textContent = '▶ 再生';
    playBtn.classList.remove('playing');
  }
}

// モーダル内再生/停止ボタンのクリック
function toggleModalPlay() {
  if (!currentPlayingPiece) return;
  
  const piece = piecesDatabase[currentPlayingPiece];
  if (!piece || !piece.audio) return;

  // 再生中の場合は停止
  if (currentAudio && !currentAudio.paused) {
    stopSampleAudio();
    // BGMが有効なら再開
    if (isMusicEnabled) {
      resumeBGM();
    }
  }
  // 停止中の場合は再生
  else {
    // BGMを停止
    stopBGM();
    
    // 新しい音楽を再生
    currentAudio = new Audio(piece.audio);
    currentAudio.volume = 0.5;
    currentAudio.play().catch(e => console.log('Audio play failed:', e));

    // 再生終了時の処理
    currentAudio.onended = () => {
      stopSampleAudio();
      // BGMが有効なら再開
      if (isMusicEnabled) {
        resumeBGM();
      }
    };

    updateModalPlayButton();
    updateMusicControl();
  }
}

// レパートリーアイテムクリック
document.querySelectorAll('.repertoire-item').forEach(item => {
  item.addEventListener('click', function() {
    const pieceKey = this.getAttribute('data-piece');
    showPieceModal(pieceKey);
  });
});

// モーダル外クリックで閉じる
document.getElementById('pieceModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closePieceModal();
  }
});

// ====================================
// EmailJS設定とフォーム送信
// ====================================
(function() {
  emailjs.init("YOUR_PUBLIC_KEY_HERE");
})();

const contactForm = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');

contactForm.addEventListener('submit', function(e) {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.textContent = '送信中...';
  formMessage.style.display = 'none';

  const formData = {
    inquiry_type: document.getElementById('inquiryType').value,
    from_name: document.getElementById('name').value,
    from_email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    message: document.getElementById('message').value
  };

  emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', formData)
    .then(function() {
      formMessage.className = 'form-message success';
      formMessage.textContent = 'お問い合わせありがとうございます。2営業日以内にご返信いたします。';
      formMessage.style.display = 'block';
      contactForm.reset();
    })
    .catch(function(error) {
      formMessage.className = 'form-message error';
      formMessage.textContent = '送信に失敗しました。お手数ですが、直接メールまたはお電話でお問い合わせください。';
      formMessage.style.display = 'block';
      console.error('EmailJS Error:', error);
    })
    .finally(function() {
      submitBtn.disabled = false;
      submitBtn.textContent = '送信する';
    });
});

// ====================================
// スクロールインジケーター - 画像が消えるまでジャンプ
// ====================================
const scrollIndicator = document.querySelector('.scroll-indicator');
if (scrollIndicator) {
  scrollIndicator.addEventListener('click', () => {
    const heroSection = document.getElementById('home');
    if (heroSection) {
      const heroHeight = heroSection.offsetHeight;
      window.scrollTo({
        top: heroHeight,
        behavior: 'smooth'
      });
    }
  });
  
  // クリックできることを示す
  scrollIndicator.style.cursor = 'pointer';
}

// ====================================
// 音符が流れる背景
// ====================================
const musicNotesSVGs = [
  // 音符1: 八分音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#C9A961;stop-opacity:0.85" />
        <stop offset="100%" style="stop-color:#8B6F47;stop-opacity:0.85" />
      </linearGradient>
    </defs>
    <ellipse cx="15" cy="38" rx="7" ry="5" fill="url(#grad1)"/>
    <rect x="21" y="12" width="2.5" height="27" rx="1" fill="url(#grad1)"/>
    <path d="M 23.5 12 Q 32 10 32 18" stroke="url(#grad1)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`,
  
  // 音符2: 連桡付き八分音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6B2E3E;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:#8B6F47;stop-opacity:0.8" />
      </linearGradient>
    </defs>
    <ellipse cx="12" cy="38" rx="6" ry="4.5" fill="url(#grad2)"/>
    <rect x="17" y="14" width="2" height="25" rx="1" fill="url(#grad2)"/>
    <ellipse cx="32" cy="34" rx="6" ry="4.5" fill="url(#grad2)"/>
    <rect x="37" y="10" width="2" height="25" rx="1" fill="url(#grad2)"/>
    <rect x="19" y="14" width="20" height="2.5" rx="1" fill="url(#grad2)"/>
  </svg>`,
  
  // 音符3: 全音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#C9A961;stop-opacity:0.7" />
        <stop offset="100%" style="stop-color:#B8956A;stop-opacity:0.7" />
      </linearGradient>
    </defs>
    <ellipse cx="25" cy="25" rx="10" ry="7" fill="none" stroke="url(#grad3)" stroke-width="2.5"/>
  </svg>`,
  
  // 音符4: 四分音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#736B4A;stop-opacity:0.85" />
        <stop offset="100%" style="stop-color:#8B6F47;stop-opacity:0.85" />
      </linearGradient>
    </defs>
    <ellipse cx="18" cy="36" rx="7" ry="5" fill="url(#grad5)"/>
    <rect x="24" y="10" width="2.5" height="27" rx="1" fill="url(#grad5)"/>
  </svg>`,
  
  // 音符5: 十六分音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#C9A961;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:#6B2E3E;stop-opacity:0.8" />
      </linearGradient>
    </defs>
    <ellipse cx="15" cy="38" rx="6" ry="4.5" fill="url(#grad6)"/>
    <rect x="20" y="12" width="2" height="27" rx="1" fill="url(#grad6)"/>
    <path d="M 22 12 Q 30 10 30 18" stroke="url(#grad6)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M 22 17 Q 28 15 28 22" stroke="url(#grad6)" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`
];

// 音符背景コンテナを作成
function createMusicNotesBackground() {
  const container = document.createElement('div');
  container.className = 'music-notes-bg';
  document.body.appendChild(container);
  return container;
}

let musicNotesContainer = null;
let noteCreationInterval = null;

// 音符を生成
function createMusicNote() {
  if (!musicNotesContainer) {
    musicNotesContainer = createMusicNotesBackground();
  }
  
  const note = document.createElement('div');
  note.className = 'music-note';
  
  // ランダムな音符を選択
  const randomSVG = musicNotesSVGs[Math.floor(Math.random() * musicNotesSVGs.length)];
  note.innerHTML = randomSVG;
  
  // ランダムな位置
  const leftPosition = Math.random() * 100;
  note.style.left = `${leftPosition}%`;
  note.style.bottom = '0';
  
  // ランダムな漂いと回転
  const drift = (Math.random() - 0.5) * 200;
  const rotation = (Math.random() - 0.5) * 60;
  note.style.setProperty('--drift', `${drift}px`);
  note.style.setProperty('--rotation', `${rotation}deg`);
  
  // ランダムなアニメーション時間
  const duration = 15 + Math.random() * 10; // 15-25秒
  note.style.animation = `floatUp ${duration}s linear forwards`;
  
  musicNotesContainer.appendChild(note);
  
  // アニメーション終了後に削除
  setTimeout(() => {
    note.remove();
  }, duration * 1000);
}

// スクロールで音符を生成
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  
  // 下にスクロールしている時のみ
  if (currentScrollY > lastScrollY && currentScrollY > 100) {
    // ランダムに音符を生成 (10%の確率)
    if (Math.random() < 0.1) {
      createMusicNote();
    }
  }
  
  lastScrollY = currentScrollY;
});

// 定期的に音符を生成 (5-10秒ごと)
function startPeriodicNotes() {
  function scheduleNext() {
    const delay = 5000 + Math.random() * 5000; // 5-10秒
    setTimeout(() => {
      createMusicNote();
      scheduleNext();
    }, delay);
  }
  scheduleNext();
}

startPeriodicNotes();
