# 山内ピアノ教室 Webサイト - EmailJS設定ガイド

## EmailJSとは
EmailJSは、サーバーサイドのコードなしで、JavaScriptから直接メールを送信できるサービスです。

## 設定手順

### 1. EmailJSアカウントの作成

1. [EmailJS公式サイト](https://www.emailjs.com/)にアクセス
2. 「Sign Up」をクリックして無料アカウントを作成
3. メールアドレスを確認

### 2. Email Serviceの追加

1. EmailJSダッシュボードにログイン
2. 左メニューから「Email Services」を選択
3. 「Add New Service」をクリック
4. Gmailを選択(または任意のメールサービス)
5. Googleアカウントでログイン
6. Service IDをメモしておく(例: service_xxxxxxx)

### 3. Email Templateの作成

1. 左メニューから「Email Templates」を選択
2. 「Create New Template」をクリック
3. 以下のように設定:

**Template Settings:**
- Template Name: `piano_contact_form`
- Subject: `【山内ピアノ教室】お問い合わせ: {{inquiry_type}}`

**Template Content:**
```
お問い合わせ種類: {{inquiry_type}}
お名前: {{from_name}}
メールアドレス: {{from_email}}
電話番号: {{phone}}

お問い合わせ内容:
{{message}}

---
このメールは山内ピアノ教室のWebサイトから送信されました。
```

**To Email:**
- `ayako.piano.1023@gmail.com`

**From Name:**
- `{{from_name}}`

**From Email:**
- 設定したEmail Serviceのメールアドレス

**Reply To:**
- `{{from_email}}`

4. 「Save」をクリック
5. Template IDをメモしておく(例: template_xxxxxxx)

### 4. Public Keyの取得

1. 左メニューから「Account」を選択
2. 「General」タブを開く
3. 「Public Key」をコピー(例: your_public_key_xxxxxxx)

### 5. HTMLファイルの更新

作成したHTMLファイル(`yamauchi_piano_complete_v2.html`)を開き、以下の3箇所を更新:

#### 1) Public Keyの設定 (行1254付近)
```javascript
(function() {
  emailjs.init("your_public_key_xxxxxxx"); // ← ここにPublic Keyを貼り付け
})();
```

#### 2) Service IDとTemplate IDの設定 (行1273付近)
```javascript
emailjs.send('service_xxxxxxx', 'template_xxxxxxx', formData)
```
↓
```javascript
emailjs.send('あなたのService ID', 'あなたのTemplate ID', formData)
```

### 6. テスト

1. HTMLファイルをブラウザで開く
2. お問い合わせフォームに入力
3. 送信ボタンをクリック
4. `ayako.piano.1023@gmail.com`にメールが届くことを確認

## トラブルシューティング

### メールが届かない場合

1. **EmailJSダッシュボードで確認**
   - 左メニュー「Email Logs」で送信履歴を確認
   - エラーメッセージがあれば確認

2. **Public Key/Service ID/Template IDの確認**
   - コピー&ペーストミスがないか確認
   - スペースや改行が入っていないか確認

3. **Gmailの迷惑メールフォルダを確認**
   - 迷惑メールに振り分けられていないか確認

4. **ブラウザのコンソールを確認**
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーメッセージを確認

### よくあるエラー

**Error: "Public key is required"**
→ Public Keyが正しく設定されていません

**Error: "Service is not found"**
→ Service IDが間違っています

**Error: "Template is not found"**
→ Template IDが間違っています

**Error: "Failed to send email"**
→ Email Serviceの認証が切れている可能性があります。EmailJSダッシュボードで再認証してください。

## 無料プランの制限

EmailJSの無料プランでは以下の制限があります:
- 月間200通まで送信可能
- 1リクエストあたり50KBまで

教室の規模なら無料プランで十分ですが、必要に応じて有料プランへアップグレードできます。

## セキュリティに関する注意

- Public Keyはブラウザから見えますが、これは問題ありません
- Private Key(Secret Key)は絶対にクライアント側のコードに含めないでください
- EmailJSダッシュボードで送信元ドメインを制限することをお勧めします

## サポート

EmailJSに関する詳細は公式ドキュメントを参照:
https://www.emailjs.com/docs/
