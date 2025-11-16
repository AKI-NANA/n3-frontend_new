// ====================================
// 音符が流れる背景 - スクロールで浮かび上がり
// ====================================
const musicNotesSVGs = [
  // 音符1: 八分音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="bgNote1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#C9A961;stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:#8B6F47;stop-opacity:0.25" />
      </linearGradient>
    </defs>
    <ellipse cx="15" cy="38" rx="7" ry="5" fill="url(#bgNote1)"/>
    <rect x="21" y="12" width="2.5" height="27" rx="1" fill="url(#bgNote1)"/>
    <path d="M 23.5 12 Q 32 10 32 18" stroke="url(#bgNote1)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`,
  
  // 音符2: 連桁付き八分音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="bgNote2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#6B2E3E;stop-opacity:0.25" />
        <stop offset="100%" style="stop-color:#8B6F47;stop-opacity:0.2" />
      </linearGradient>
    </defs>
    <ellipse cx="12" cy="38" rx="6" ry="4.5" fill="url(#bgNote2)"/>
    <rect x="17" y="14" width="2" height="25" rx="1" fill="url(#bgNote2)"/>
    <ellipse cx="32" cy="34" rx="6" ry="4.5" fill="url(#bgNote2)"/>
    <rect x="37" y="10" width="2" height="25" rx="1" fill="url(#bgNote2)"/>
    <rect x="19" y="14" width="20" height="2.5" rx="1" fill="url(#bgNote2)"/>
  </svg>`,
  
  // 音符3: 全音符
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="bgNote3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#C9A961;stop-opacity:0.25" />
        <stop offset="100%" style="stop-color:#B8956A;stop-opacity:0.2" />
      </linearGradient>
    </defs>
    <ellipse cx="25" cy="25" rx="10" ry="7" fill="none" stroke="url(#bgNote3)" stroke-width="2.5"/>
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
let activeNotes = new Set();

// 音符を生成
function createMusicNote() {
  console.log('音符生成開始');
  
  if (!musicNotesContainer) {
    musicNotesContainer = createMusicNotesBackground();
    console.log('コンテナ作成:', musicNotesContainer);
  }
  
  // 最大5個まで
  if (activeNotes.size >= 5) {
    console.log('最大数達成:', activeNotes.size);
    return;
  }
  
  const note = document.createElement('div');
  note.className = 'music-note';
  
  // ランダムな音符を選択
  const randomSVG = musicNotesSVGs[Math.floor(Math.random() * musicNotesSVGs.length)];
  note.innerHTML = randomSVG;
  
  // 幅広に配置 (10%-90%)
  const leftPosition = 10 + Math.random() * 80;
  const topPosition = 20 + Math.random() * 60;
  note.style.left = `${leftPosition}%`;
  note.style.top = `${topPosition}%`;
  
  musicNotesContainer.appendChild(note);
  activeNotes.add(note);
  
  console.log('音符追加:', note, '位置:', leftPosition + '%', topPosition + '%');
  
  // 少し遅延してから表示
  setTimeout(() => {
    note.classList.add('visible');
  }, 100);
  
  // 4秒後に削除
  setTimeout(() => {
    note.remove();
    activeNotes.delete(note);
  }, 4000);
}

// スクロールで音符を生成
let lastScrollY = 0;
let scrollThrottle = false;

window.addEventListener('scroll', () => {
  if (scrollThrottle) return;
  scrollThrottle = true;
  
  setTimeout(() => {
    const currentScrollY = window.scrollY;
    
    // スクロールしている時 (300px以上移動したら)
    if (Math.abs(currentScrollY - lastScrollY) > 300) {
      console.log('スクロール検出:', currentScrollY);
      createMusicNote();
      lastScrollY = currentScrollY;
    }
    
    scrollThrottle = false;
  }, 500);
});

// ページ読み込み時に最初の音符を表示
window.addEventListener('DOMContentLoaded', () => {
  console.log('ページ読み込み完了 - 音符生成');
  setTimeout(() => {
    createMusicNote();
    createMusicNote();
  }, 2000);
});
