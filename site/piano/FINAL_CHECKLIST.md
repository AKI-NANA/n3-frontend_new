# 🎹 山内ピアノ教室 Webサイト - 最終チェックリスト

## 📋 実装完了確認

### ✅ 完了済み項目

#### 1. デザインと基本要素
- [x] ロゴ(Yamauchi Piano Studio)をヘッダーに配置
- [x] 日本語正式名称「山内ピアノ教室」をロゴ下に追加
- [ ] ファビコン画像の作成と配置 ← **要対応**
  - [ ] favicon.png (32x32px)
  - [ ] apple-touch-icon.png (180x180px)
  - 📖 `FAVICON_GUIDE.md`を参照
- [x] 不要なTOP画像参照を削除
- [x] 実際の画像ファイルを使用

#### 2. 機能実装
- [x] お問い合わせフォームに選択肢を追加
  - [x] 無料体験レッスンの申し込み
  - [x] 質問
  - [x] その他のお問い合わせ
- [x] EmailJS統合(メール送信機能)
  - [ ] Public Keyの設定 ← **要対応**
  - [ ] Service IDの設定 ← **要対応**
  - [ ] Template IDの設定 ← **要対応**
  - 📖 `EMAILJS_SETUP.md`を参照
- [x] Googleカレンダー埋め込み
  - [ ] Calendar IDの設定 ← **要対応**
  - 📖 `CALENDAR_SETUP.md`を参照
- [x] 音楽排他再生機能
  - [x] BGMと曲の試聴の排他制御
  - [x] 再生中の他の音源を自動停止
  - [x] 曲終了後のBGM自動再開

#### 3. コンテンツとUI
- [x] 成長フェーズのアイコン追加
  - [x] 👶 幼少期から
  - [x] 🎓 中学生・高校生
  - [x] 🎭 舞台に挑戦
- [x] 音楽史モーダル完全実装
  - [x] 7曲の詳細情報
  - [x] 作曲者情報
  - [x] 曲の概要
  - [x] 時代背景
  - [x] 曲の特徴
  - [x] 演奏難易度
- [x] モーダル内再生ボタン
- [x] 全音源ファイル統合
  - [x] erize.mp3
  - [x] trukish.mp3
  - [x] koinu.mp3
  - [x] fantaisie.mp3
  - [x] nocturne-op9-2.mp3
  - [x] lovedream.mp3
  - [x] lacampanella.mp3
- [x] 発表会動画の埋め込み

---

## 🔧 設定が必要な項目(デプロイ前)

### 優先度: 高

#### 1. EmailJS設定
**ファイル:** `yamauchi_piano_complete_v2.html`

**手順:**
1. EmailJSアカウント作成(無料)
2. Gmail Service追加
3. Email Template作成
4. Public Key取得
5. HTMLファイルに設定

**該当箇所:**
- 行1254: `emailjs.init("YOUR_PUBLIC_KEY_HERE");`
- 行1273: `emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', formData)`

**詳細ガイド:** `EMAILJS_SETUP.md`

**所要時間:** 約15分

---

#### 2. Googleカレンダー設定
**ファイル:** `yamauchi_piano_complete_v2.html`

**手順:**
1. Googleカレンダー作成
2. カレンダーを公開設定
3. Calendar ID取得
4. HTMLファイルに設定

**該当箇所:**
- 行1101: `src="...&src=YOUR_CALENDAR_ID&..."`

**詳細ガイド:** `CALENDAR_SETUP.md`

**所要時間:** 約10分

---

### 優先度: 中

#### 3. ファビコン作成
**ファイル:** `jpg/favicon.png`, `jpg/apple-touch-icon.png`

**手順:**
1. Canvaまたはファビコンジェネレーターでデザイン
2. 2つのサイズで保存
   - favicon.png (32x32px)
   - apple-touch-icon.png (180x180px)
3. `/site/piano/jpg/`に配置

**詳細ガイド:** `FAVICON_GUIDE.md`

**所要時間:** 約20分

---

#### 4. LINEリンク設定
**ファイル:** `yamauchi_piano_complete_v2.html`

**手順:**
1. LINE公式アカウント作成(任意)
2. LINE IDまたはQRコードリンク取得
3. HTMLファイルに設定

**該当箇所:**
- 行1149: `<a href="https://line.me/ti/p/YOUR_LINE_ID" ...>`

**所要時間:** 約5分(LINE公式アカウント既存の場合)

---

## 🚀 デプロイ前最終チェック

### ファイル確認
- [ ] `yamauchi_piano_complete_v2.html`が存在する
- [ ] `mp3/`フォルダに7つの音源ファイルが存在する
- [ ] `mp4/`フォルダに発表会動画が存在する
- [ ] `jpg/`フォルダに画像ファイルが存在する
- [ ] `jpg/favicon.png`が存在する
- [ ] `jpg/apple-touch-icon.png`が存在する

### 機能テスト
- [ ] ブラウザでHTMLファイルを開ける
- [ ] BGMモーダルが表示される
- [ ] BGMが再生される(ON選択時)
- [ ] ヒーロースライダーが動作する
- [ ] スムーススクロールが動作する
- [ ] レパートリータブが切り替わる
- [ ] 曲のモーダルが開く
- [ ] 曲の試聴ボタンが動作する
- [ ] 音楽の排他再生が動作する(1つだけ再生される)
- [ ] お問い合わせフォームが送信できる
- [ ] Googleカレンダーが表示される
- [ ] TOPに戻るボタンが動作する
- [ ] ファビコンがブラウザタブに表示される

### レスポンシブテスト
- [ ] デスクトップ(1920px)で正常表示
- [ ] ノートPC(1366px)で正常表示
- [ ] タブレット(768px)で正常表示
- [ ] スマートフォン(375px)で正常表示

### クロスブラウザテスト
- [ ] Google Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge
- [ ] モバイルSafari(iPhone)
- [ ] モバイルChrome(Android)

---

## 📤 デプロイ手順

### 推奨: Netlify(無料)

1. **準備**
   ```bash
   cd /Users/aritahiroaki/n3-frontend_new/site/piano
   ```

2. **Netlifyアカウント作成**
   - https://www.netlify.com/ にアクセス
   - GitHubアカウントでサインアップ

3. **手動デプロイ**
   - Netlifyダッシュボードで「Sites」→「Add new site」
   - 「Deploy manually」を選択
   - `site/piano`フォルダ全体をドラッグ&ドロップ

4. **設定**
   - Site name: `yamauchi-piano-studio`
   - Custom domain: (任意)独自ドメイン設定

5. **SSL証明書**
   - 自動で有効化(HTTPS対応)

**デプロイURL例:**
https://yamauchi-piano-studio.netlify.app

---

### 代替: GitHub Pages

1. **GitHubリポジトリ作成**
   ```bash
   cd /Users/aritahiroaki/n3-frontend_new
   git add site/piano/*
   git commit -m "Add yamauchi piano studio website"
   git push origin main
   ```

2. **GitHub Pages設定**
   - Repository Settings → Pages
   - Source: main branch
   - Folder: /site/piano
   - Save

**デプロイURL例:**
https://yourusername.github.io/site/piano/yamauchi_piano_complete_v2.html

---

## 📊 パフォーマンスチェック

### ページ速度
- [ ] Google PageSpeed Insights でテスト
  - https://pagespeed.web.dev/
  - 目標: 90点以上

### 最適化項目
- [x] 画像の遅延読み込み
- [x] CSS/JSの統合
- [x] 最小限の外部依存
- [ ] 画像の圧縮(必要に応じて)
  - TinyPNG: https://tinypng.com/

---

## 🔍 SEO最終チェック

### 基本SEO
- [x] `<title>`タグ設定
- [x] `<meta description>`設定
- [x] ファビコン設定
- [x] 画像alt属性
- [x] セマンティックHTML
- [x] モバイルフレンドリー

### 推奨追加対策(デプロイ後)
- [ ] Google Search Console登録
- [ ] Google Analytics設定
- [ ] サイトマップ作成
- [ ] robots.txt作成
- [ ] OGPタグ追加

---

## 🎯 公開後のタスク

### 即座に実施
1. [ ] 全ページを実際にテスト
2. [ ] お問い合わせフォームからテストメール送信
3. [ ] スマートフォンで動作確認
4. [ ] 教室のSNSでWebサイトを告知

### 1週間以内
1. [ ] Google Search Consoleでインデックス登録
2. [ ] Google Analyticsでアクセス解析開始
3. [ ] ユーザーフィードバック収集

### 1ヶ月以内
1. [ ] アクセス解析結果を確認
2. [ ] 必要に応じてコンテンツ調整
3. [ ] SEO対策の効果測定

---

## 📝 メンテナンス計画

### 定期的に更新
- **毎月**: レッスンカレンダーの確認・更新
- **四半期**: 発表会の写真・動画追加
- **半年**: レパートリーリスト更新
- **年1回**: 料金表・プロフィール更新

### 技術メンテナンス
- **月1回**: ブラウザでの動作確認
- **四半期**: セキュリティアップデート確認
- **年1回**: デザインリフレッシュ検討

---

## 🆘 トラブルシューティング

### よくある問題と解決策

**Q: メールが送信されない**
A: EmailJSの設定を確認。コンソールでエラーメッセージを確認。

**Q: 音楽が再生されない**
A: ブラウザの自動再生ポリシー。ユーザーのクリック後に再生。

**Q: カレンダーが表示されない**
A: Calendar IDの確認。カレンダーが公開設定か確認。

**Q: ファビコンが表示されない**
A: ブラウザキャッシュをクリア。ファイルパスを確認。

**Q: スマートフォンでレイアウトが崩れる**
A: ブラウザのキャッシュクリア。別のブラウザで確認。

---

## 📞 サポート

### 技術的な質問
- EmailJS: https://www.emailjs.com/docs/
- Google Calendar: https://support.google.com/calendar/

### プロジェクト連絡先
- 教室: 山内ピアノ教室
- メール: ayako.piano.1023@gmail.com
- 電話: 070-5657-0373

---

## ✨ 完了おめでとうございます!

すべてのチェックが完了したら、Webサイトを公開する準備が整っています。

**最後の確認:**
- [ ] すべての「要対応」項目が完了している
- [ ] すべての機能テストが合格している
- [ ] デプロイ先が決定している
- [ ] 公開後のプロモーション計画がある

**公開準備完了!** 🎉

---

**最終更新日:** 2025-01-15
**バージョン:** v2.0
