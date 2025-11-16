# 大量テキストの無料英語翻訳 - 解決策の検討

## 🎯 問題の整理

### 現状
- ❌ HTML編集画面で日本語のままになっている
- ❌ 「商品説明」「商品仕様」などが日本語で表示
- ⚠️ 有料翻訳APIは上限がある
- ⚠️ Gemini/Claude等のLLMは長文でトークン消費が激しい

### 以前のシステムで動いていた理由
**質問:** なぜ以前は無限に英語翻訳できたのか？

**可能性の高い答え:**
1. **Google Apps Script + Google翻訳API（無料枠）**
   - スプレッドシートの`=GOOGLETRANSLATE()`関数
   - Apps Scriptから`LanguageApp.translate()`
   - 実質無制限（Googleアカウントごとの上限はあるが高い）

2. **Google Cloud Translation API（無料枠）**
   - 月間50万文字まで無料
   - それ以降は従量課金

3. **ブラウザ内翻訳（Chrome/Edge）**
   - Google翻訳エンジン使用
   - 完全無料

---

## 💡 推奨される解決策

### 🥇 最優先: Google Apps Script + スプレッドシート翻訳

**理由:**
- ✅ 完全無料（Google Workspaceの範囲内）
- ✅ 大量テキストに対応
- ✅ バッチ処理可能
- ✅ API制限が非常に緩い
- ✅ 既存のGoogleアカウントで使用可能

#### 実装方法

**1. Google Apps Scriptを使用**

```javascript
// Google Apps Script
function translateJapaneseToEnglish(text) {
  if (!text) return '';
  
  try {
    return LanguageApp.translate(text, 'ja', 'en');
  } catch (error) {
    console.error('Translation error:', error);
    return text; // エラー時は元のテキストを返す
  }
}

// バッチ翻訳用
function translateBatch(textsArray) {
  return textsArray.map(text => ({
    original: text,
    translated: translateJapaneseToEnglish(text)
  }));
}

// Web APIとして公開
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const texts = data.texts || [];
  
  const results = translateBatch(texts);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, results }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**2. Next.jsから呼び出し**

```typescript
// app/api/translate/google-apps-script/route.ts
export async function POST(request: Request) {
  const { texts } = await request.json();
  
  // Google Apps ScriptのWeb App URLを環境変数から取得
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL!;
  
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts })
  });
  
  const result = await response.json();
  
  return NextResponse.json(result);
}
```

**デプロイ手順:**
```
1. https://script.google.com/ にアクセス
2. 新規プロジェクト作成
3. 上記スクリプトを貼り付け
4. 「デプロイ」→「新しいデプロイ」
5. 「ウェブアプリ」として公開
6. URLを.env.localに保存
```

---

### 🥈 次点: スプレッドシート翻訳関数

**方法:**
1. Googleスプレッドシートを翻訳用DBとして使用
2. A列に日本語、B列に`=GOOGLETRANSLATE(A1,"ja","en")`
3. Apps Scriptで自動化

**メリット:**
- ✅ 翻訳キャッシュとして機能
- ✅ 翻訳履歴が残る
- ✅ 手動修正が可能

**実装例:**

```javascript
// Google Apps Script
function translateAndCache(text) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Translations');
  
  // キャッシュチェック
  const data = sheet.getDataRange().getValues();
  const cached = data.find(row => row[0] === text);
  
  if (cached && cached[1]) {
    return cached[1]; // キャッシュヒット
  }
  
  // 新規翻訳
  const translated = LanguageApp.translate(text, 'ja', 'en');
  
  // キャッシュに保存
  sheet.appendRow([text, translated, new Date()]);
  
  return translated;
}

// Web APIとして公開
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const text = data.text || '';
  
  const result = translateAndCache(text);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, translated: result }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

### 🥉 バックアップ: DeepL無料API（制限あり）

**制限:**
- 月間50万文字まで無料
- それ以降は従量課金

**使用場面:**
- Google Apps Scriptが使えない場合
- より高品質な翻訳が必要な場合

```typescript
// app/api/translate/deepl/route.ts
export async function POST(request: Request) {
  const { text } = await request.json();
  
  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: [text],
      target_lang: 'EN',
      source_lang: 'JA'
    })
  });
  
  const result = await response.json();
  
  return NextResponse.json({
    success: true,
    translated: result.translations[0].text
  });
}
```

---

## 🔧 推奨実装アーキテクチャ

### 階層的翻訳戦略

```
1. ローカルキャッシュ確認（Supabase）
   ↓ キャッシュミス
2. Google Apps Script翻訳（優先）
   ↓ エラー時
3. DeepL無料API（バックアップ）
   ↓ 上限超過時
4. 手動翻訳待ち（キューに追加）
```

### データベース構造

```sql
-- 翻訳キャッシュテーブル
CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_text TEXT NOT NULL,
  source_lang VARCHAR(2) DEFAULT 'ja',
  target_lang VARCHAR(2) DEFAULT 'en',
  translated_text TEXT NOT NULL,
  translation_method VARCHAR(50), -- 'google_apps_script', 'deepl', 'manual'
  quality_score DECIMAL(3,2), -- 0.00-1.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス
  UNIQUE(source_text, source_lang, target_lang)
);

CREATE INDEX idx_translation_cache_source ON translation_cache(source_text);
CREATE INDEX idx_translation_cache_used ON translation_cache(used_count DESC, last_used_at DESC);
```

---

## 📊 実装の優先順位

### フェーズ1: 即座に実装（今日）
1. **Google Apps Script翻訳APIのセットアップ**
   - スクリプト作成・デプロイ（15分）
   - Next.js統合（30分）
   - テスト（15分）

### フェーズ2: 翌日実装
2. **翻訳キャッシュDB実装**
   - Supabaseテーブル作成（10分）
   - キャッシュロジック実装（30分）
   - HTML編集画面との統合（30分）

### フェーズ3: 余裕があれば
3. **DeepLバックアップ実装**
   - API登録（5分）
   - フォールバック実装（20分）

---

## 🎯 HTML編集画面での翻訳フロー

### 現在の問題
```
ユーザーがHTML編集
  ↓
日本語で保存 ❌
  ↓
Descriptionが日本語のまま ❌
```

### 修正後のフロー
```
ユーザーがHTML編集
  ↓
保存ボタン押下
  ↓
1. キャッシュ確認
2. なければGoogle Apps Scriptで翻訳
3. 英語版を生成
  ↓
日本語版と英語版の両方を保存 ✅
  ↓
eBayには英語版を表示 ✅
```

---

## 💻 実装コード例

### HTML編集画面の修正

**ファイル:** `app/tools/html-editor/page.tsx`

```typescript
const handleSave = async () => {
  // 日本語HTMLを取得
  const japaneseHTML = editorContent;
  
  // 翻訳が必要なテキストを抽出
  const textsToTranslate = extractTextsFromHTML(japaneseHTML);
  
  showToast('翻訳中...', 'info');
  
  try {
    // Google Apps Scriptで一括翻訳
    const response = await fetch('/api/translate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: textsToTranslate })
    });
    
    const { translations } = await response.json();
    
    // 翻訳結果をHTMLに適用
    const englishHTML = replaceTextsInHTML(japaneseHTML, translations);
    
    // 両方を保存
    await saveHTML({
      product_id: productId,
      html_japanese: japaneseHTML,
      html_english: englishHTML
    });
    
    showToast('✅ 保存完了（英語翻訳済み）', 'success');
  } catch (error) {
    showToast('❌ 翻訳エラー', 'error');
  }
};

// HTMLからテキストを抽出（タグは保持）
function extractTextsFromHTML(html: string): string[] {
  const texts: string[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // テキストノードのみ抽出
  const walker = document.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text && text.length > 0) {
      texts.push(text);
    }
  }
  
  return texts;
}
```

---

## 🚀 即座に実装可能な最小構成

### Step 1: Google Apps Script作成（5分）

```javascript
function doPost(e) {
  const { texts } = JSON.parse(e.postData.contents);
  
  const results = texts.map(text => 
    LanguageApp.translate(text, 'ja', 'en')
  );
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, results }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 2: 環境変数設定（1分）

```bash
# .env.local
GOOGLE_APPS_SCRIPT_TRANSLATE_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Step 3: Next.js API作成（5分）

```typescript
// app/api/translate/route.ts
export async function POST(request: Request) {
  const { texts } = await request.json();
  
  const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL!, {
    method: 'POST',
    body: JSON.stringify({ texts })
  });
  
  return NextResponse.json(await response.json());
}
```

---

## ✅ まとめ

### 推奨: Google Apps Script翻訳
- **コスト:** 完全無料
- **制限:** 実質無制限
- **品質:** 十分（Google翻訳エンジン）
- **実装時間:** 30分以内

### 理由
1. 完全無料で大量テキストに対応
2. バッチ処理が簡単
3. Googleアカウントがあれば即座に使える
4. 以前のシステムでも同じ方法を使っていた可能性が高い

次のステップで実装を開始しますか？
