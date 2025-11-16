# Google Apps Script 翻訳API - セットアップガイド

## 📋 実装手順

### Step 1: Google Apps Scriptプロジェクト作成

1. https://script.google.com/ にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を「N3 Translation API」に変更

### Step 2: スクリプトコードを貼り付け

```javascript
/**
 * N3 Translation API
 * 日本語から英語への翻訳を提供
 */

/**
 * 単一テキストの翻訳
 */
function translateText(text, sourceLang = 'ja', targetLang = 'en') {
  if (!text || text.trim() === '') {
    return '';
  }
  
  try {
    return LanguageApp.translate(text, sourceLang, targetLang);
  } catch (error) {
    console.error('Translation error:', error);
    return text; // エラー時は元のテキストを返す
  }
}

/**
 * バッチ翻訳（複数テキストを一度に翻訳）
 */
function translateBatch(texts, sourceLang = 'ja', targetLang = 'en') {
  if (!Array.isArray(texts)) {
    return [];
  }
  
  return texts.map(text => {
    if (!text || text.trim() === '') {
      return '';
    }
    return translateText(text, sourceLang, targetLang);
  });
}

/**
 * HTMLテキストの翻訳（タグは保持）
 */
function translateHTML(html, sourceLang = 'ja', targetLang = 'en') {
  if (!html || html.trim() === '') {
    return html;
  }
  
  // 簡易的なHTML解析と翻訳
  // タグ内のテキストのみを翻訳
  var translated = html;
  
  // <h2>...</h2> などのテキストを翻訳
  var regex = />([^<]+)</g;
  var matches = html.match(regex);
  
  if (matches) {
    matches.forEach(function(match) {
      var text = match.substring(1, match.length - 1).trim();
      if (text && text.length > 0) {
        var translatedText = translateText(text, sourceLang, targetLang);
        translated = translated.replace('>' + text + '<', '>' + translatedText + '<');
      }
    });
  }
  
  return translated;
}

/**
 * 商品データの翻訳（タイトル、説明、HTML）
 */
function translateProduct(productData) {
  var result = {
    success: true,
    original: productData,
    translated: {}
  };
  
  try {
    // タイトルの翻訳
    if (productData.title) {
      result.translated.title = translateText(productData.title);
    }
    
    // 説明の翻訳
    if (productData.description) {
      result.translated.description = translateText(productData.description);
    }
    
    // HTMLの翻訳
    if (productData.html) {
      result.translated.html = translateHTML(productData.html);
    }
    
    // カテゴリ名の翻訳
    if (productData.category_name) {
      result.translated.category_name = translateText(productData.category_name);
    }
    
    // その他のテキストフィールド
    if (productData.condition) {
      result.translated.condition = translateText(productData.condition);
    }
    
    if (productData.brand) {
      result.translated.brand = productData.brand; // ブランド名は翻訳しない
    }
    
  } catch (error) {
    result.success = false;
    result.error = error.toString();
  }
  
  return result;
}

/**
 * Web API エンドポイント（POSTリクエストを処理）
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var result = {};
    
    // 翻訳タイプに応じて処理を分岐
    if (data.type === 'single' && data.text) {
      // 単一テキスト翻訳
      result = {
        success: true,
        translated: translateText(data.text, data.sourceLang, data.targetLang)
      };
      
    } else if (data.type === 'batch' && data.texts) {
      // バッチ翻訳
      result = {
        success: true,
        results: translateBatch(data.texts, data.sourceLang, data.targetLang)
      };
      
    } else if (data.type === 'html' && data.html) {
      // HTML翻訳
      result = {
        success: true,
        translated: translateHTML(data.html, data.sourceLang, data.targetLang)
      };
      
    } else if (data.type === 'product' && data.product) {
      // 商品データ翻訳
      result = translateProduct(data.product);
      
    } else {
      result = {
        success: false,
        error: 'Invalid request format'
      };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * テスト用関数（Apps Script内で実行可能）
 */
function testTranslation() {
  var testText = 'これは高品質な商品です。';
  var result = translateText(testText);
  Logger.log('Original: ' + testText);
  Logger.log('Translated: ' + result);
  
  var testHTML = '<h2>商品説明</h2><p>この商品は高品質で、厳選された素材を使用しています。</p>';
  var htmlResult = translateHTML(testHTML);
  Logger.log('HTML Result: ' + htmlResult);
}
```

### Step 3: デプロイ

1. 「デプロイ」→「新しいデプロイ」をクリック
2. 「種類の選択」→「ウェブアプリ」を選択
3. 設定:
   - **説明**: N3 Translation API v1
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 全員
4. 「デプロイ」をクリック
5. **ウェブアプリのURL**をコピー（例: https://script.google.com/macros/s/ABC.../exec）

### Step 4: 環境変数に設定

`.env.local`に以下を追加:

```bash
# Google Apps Script 翻訳API
GOOGLE_APPS_SCRIPT_TRANSLATE_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Step 5: テスト

Google Apps Script画面で「testTranslation」関数を実行:
1. 関数選択: `testTranslation`
2. 「実行」ボタンをクリック
3. 「実行ログ」で結果を確認

---

## 🔧 トラブルシューティング

### エラー: 「承認が必要です」
1. 「権限を確認」をクリック
2. Googleアカウントを選択
3. 「詳細」→「N3 Translation API (安全ではないページ)に移動」
4. 「許可」をクリック

### エラー: 「アクセスが拒否されました」
デプロイ設定で「アクセスできるユーザー」が「全員」になっているか確認

---

## 📝 使用例

### Next.jsから呼び出し

```typescript
// 単一テキスト翻訳
const response = await fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({
    type: 'single',
    text: 'これは商品です',
    sourceLang: 'ja',
    targetLang: 'en'
  })
});

// バッチ翻訳
const response = await fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({
    type: 'batch',
    texts: ['商品A', '商品B', '商品C']
  })
});

// 商品データ翻訳
const response = await fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify({
    type: 'product',
    product: {
      title: 'ポケモン ピカチュウ トートバッグ',
      description: 'この商品は高品質です',
      html: '<h2>商品説明</h2><p>詳細...</p>'
    }
  })
});
```

---

## ✅ 完了チェックリスト

- [ ] Google Apps Scriptプロジェクト作成
- [ ] スクリプトコード貼り付け
- [ ] Web Appとしてデプロイ
- [ ] URLを.env.localに保存
- [ ] testTranslation関数でテスト成功

完了したら、次のステップ（Next.js統合）に進みます！
