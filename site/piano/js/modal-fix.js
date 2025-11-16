// BGMモーダルのタイマー管理
let modalTimer = null;

function showMusicModal() {
  const musicModal = document.getElementById('musicModal');
  musicModal.style.display = 'flex';
  
  // 既存のタイマーをクリア
  if (modalTimer) {
    clearTimeout(modalTimer);
  }
}

// ページ読み込み時にモーダル表示
window.addEventListener('load', () => {
  setTimeout(() => {
    showMusicModal();
  }, 500);
});

// acceptMusic と declineMusic 関数を修正
function acceptMusic() {
  const musicModal = document.getElementById('musicModal');
  musicModal.classList.add('hidden');
  if (modalTimer) {
    clearTimeout(modalTimer);
  }
  // 以降の処理は既存のまま
}

function declineMusic() {
  const musicModal = document.getElementById('musicModal');
  musicModal.classList.add('hidden');
  if (modalTimer) {
    clearTimeout(modalTimer);
  }
  // 以降の処理は既存のまま
}
