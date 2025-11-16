# 🎹 山内ピアノ教室 - 電話ボタン&レスポンシブ対応 修正指示

## 修正内容

### 1. 電話ボタンの追加
- 電話番号: 070-5657-0373
- タップで直接発信
- メールフォームと並べて表示

### 2. レスポンシブ対応
- スマホ・タブレット・PC対応
- ブレークポイント: 768px, 1024px
- タッチデバイス最適化

---

## HTMLの修正箇所

お問い合わせセクションに以下を追加:

```html
<!-- 電話・メールの選択カード -->
<div class="contact-methods">
  <a href="tel:07056570373" class="contact-method-card phone-card">
    <div class="contact-icon">📞</div>
    <h3>お電話でのお問い合わせ</h3>
    <p class="phone-number">070-5657-0373</p>
    <p class="contact-note">受付時間: 10:00〜20:00</p>
    <span class="contact-cta">タップして発信</span>
  </a>

  <div class="contact-method-card email-card">
    <div class="contact-icon">✉️</div>
    <h3>メールフォームでのお問い合わせ</h3>
    <p class="contact-note">24時間受付・2営業日以内に返信</p>
    <button class="contact-cta-btn" onclick="document.getElementById('contactForm').scrollIntoView({behavior: 'smooth'})">
      フォームを開く
    </button>
  </div>
</div>
```

---

## CSSの追加

```css
/* お問い合わせ方法選択カード */
.contact-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin: 3rem 0;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.contact-method-card {
  background: var(--white);
  border-radius: 12px;
  padding: 2.5rem;
  text-align: center;
  box-shadow: 0 5px 25px var(--shadow);
  transition: all 0.3s ease;
  cursor: pointer;
  text-decoration: none;
  color: var(--text);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.contact-method-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 40px var(--shadow-heavy);
}

.phone-card {
  background: linear-gradient(135deg, #8B4513 0%, #D4A574 100%);
  color: var(--white);
}

.phone-card:hover {
  background: linear-gradient(135deg, #6B3410 0%, #C49564 100%);
}

.email-card {
  border: 2px solid var(--primary);
}

.contact-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.contact-method-card h3 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  font-family: 'Playfair Display', serif;
}

.phone-number {
  font-size: 2rem;
  font-weight: bold;
  margin: 1.5rem 0;
  letter-spacing: 0.05em;
}

.contact-note {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 1.5rem;
}

.contact-cta {
  display: inline-block;
  padding: 0.8rem 2rem;
  background: rgba(255,255,255,0.2);
  border-radius: 50px;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.3s ease;
}

.phone-card .contact-cta:hover {
  background: rgba(255,255,255,0.3);
}

.contact-cta-btn {
  padding: 1rem 2.5rem;
  background: var(--primary);
  color: var(--white);
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.1em;
}

.contact-cta-btn:hover {
  background: var(--secondary);
  transform: scale(1.05);
}

/* ============================================
   レスポンシブ対応
============================================ */

/* タブレット (1024px以下) */
@media (max-width: 1024px) {
  section {
    padding: 5rem 2rem;
  }

  .hero-title {
    font-size: 3rem;
  }

  .nav-menu {
    display: none; /* ハンバーガーメニューに切り替え推奨 */
  }

  .welcome-content,
  .profile-content,
  .access-content {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .atmosphere-features {
    grid-template-columns: 1fr;
  }

  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .repertoire-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .recital-images {
    grid-template-columns: 1fr;
  }

  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .contact-methods {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

/* スマートフォン (768px以下) */
@media (max-width: 768px) {
  /* 基本レイアウト */
  section {
    padding: 4rem 1.5rem;
  }

  .container {
    padding: 0 1rem;
  }

  /* ヘッダー */
  .header {
    padding: 1rem;
  }

  .logo-section {
    gap: 0.8rem;
  }

  .logo-image {
    width: 50px;
    height: 50px;
  }

  .school-name-ja {
    font-size: 0.85rem;
  }

  .school-name-en {
    font-size: 0.7rem;
  }

  /* ヒーローセクション */
  .hero-title {
    font-size: 2.2rem;
    line-height: 1.4;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .cta-button {
    padding: 0.9rem 2rem;
    font-size: 0.9rem;
  }

  /* セクションタイトル */
  .section-title {
    font-size: 2rem;
  }

  .section-subtitle {
    font-size: 0.95rem;
  }

  /* ギャラリー */
  .gallery-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  /* レパートリー */
  .repertoire-list {
    grid-template-columns: 1fr;
  }

  /* お問い合わせカード */
  .contact-methods {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin: 2rem 0;
  }

  .contact-method-card {
    padding: 2rem 1.5rem;
  }

  .phone-number {
    font-size: 1.6rem;
  }

  .contact-icon {
    font-size: 3rem;
  }

  /* フォーム */
  .contact-form {
    padding: 2rem 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  /* モーダル */
  .piece-modal-content {
    width: 95%;
    max-height: 90vh;
    padding: 2rem 1.5rem;
  }

  .piece-modal-close {
    top: 10px;
    right: 10px;
    width: 35px;
    height: 35px;
    font-size: 1.5rem;
  }

  /* 固定ボタン */
  .back-to-top,
  .music-control {
    width: 50px;
    height: 50px;
    bottom: 20px;
    right: 20px;
  }

  .music-control {
    bottom: 85px;
  }

  /* フッター */
  .footer-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .footer-section {
    text-align: center;
  }
}

/* 極小スマートフォン (480px以下) */
@media (max-width: 480px) {
  .hero-title {
    font-size: 1.8rem;
  }

  .section-title {
    font-size: 1.7rem;
  }

  .phone-number {
    font-size: 1.4rem;
  }

  .contact-method-card {
    padding: 1.5rem 1rem;
  }

  .cta-button {
    padding: 0.8rem 1.5rem;
    font-size: 0.85rem;
  }
}

/* タッチデバイス最適化 */
@media (hover: none) and (pointer: coarse) {
  /* タッチデバイス用のタップ領域拡大 */
  .repertoire-item,
  .gallery-item,
  .contact-method-card {
    min-height: 60px;
  }

  /* ホバーエフェクトを無効化 */
  .repertoire-item:hover,
  .gallery-item:hover,
  .contact-method-card:hover {
    transform: none;
  }

  /* タップ時のエフェクト */
  .repertoire-item:active,
  .contact-method-card:active {
    transform: scale(0.98);
  }
}

/* 横向きスマートフォン */
@media (max-width: 768px) and (orientation: landscape) {
  .hero-section {
    min-height: 60vh;
  }

  .hero-title {
    font-size: 2rem;
  }
}
```

---

## 実装のポイント

### 📞 電話ボタン
1. `tel:` URIスキームで直接発信
2. タップしやすい大きさ
3. 視覚的に目立つデザイン
4. 受付時間を明記

### 📱 レスポンシブ対応
1. **3段階ブレークポイント**
   - デスクトップ: 1024px以上
   - タブレット: 768px - 1024px
   - スマートフォン: 768px以下

2. **タッチデバイス最適化**
   - タップ領域を十分に確保
   - ホバーエフェクトをタッチ用に調整
   - フォント認識性向上

3. **レイアウト調整**
   - 2カラム → 1カラム
   - 画像サイズ自動調整
   - 余白・パディング最適化

---

## 実装手順

1. ✅ HTMLに電話ボタンのHTMLを追加
2. ✅ CSSにスタイルを追加
3. ✅ レスポンシブCSSを追加
4. ✅ スマホで動作確認

---

## テスト項目

### 📱 スマートフォン
- [ ] 電話ボタンをタップで発信できる
- [ ] レイアウトが1カラムになる
- [ ] フォントサイズが読みやすい
- [ ] ボタンがタップしやすい

### 💻 タブレット
- [ ] レイアウトが適切
- [ ] 画像が綺麗に表示
- [ ] ナビゲーションが使いやすい

### 🖥️ デスクトップ
- [ ] 従来通り表示される
- [ ] 電話番号がクリックできる(Skypeなど起動)

---

次のステップで実際のHTMLとCSSを修正します!
