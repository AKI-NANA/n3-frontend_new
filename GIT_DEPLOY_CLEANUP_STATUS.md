# 🎯 Git Deploy ツールへのクリーンアップ機能追加完了

## ✅ 作成した

ファイル

### 1. APIエンドポイント
**`/app/api/git/cleanup/route.ts`** ✅ 完成

#### 機能
- **GET**: 不要ファイルの検出
  - カテゴリ別にファイルをスキャン
  - `.gitignore`の状態確認
  - 推奨アクションの提示

- **DELETE**: 不要ファイルの削除
  - カテゴリ別に削除実行
  - `.gitignore`の自動更新
  - 削除結果のレポート

---

## 🚀 使用方法

### APIを直接呼び出す方法

#### 1. 不要ファイルをチェック

```bash
curl http://localhost:3000/api/git/cleanup
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "total": 15,
    "categories": [
      {
        "name": "bak",
        "description": "バックアップファイル (.bak)",
        "count": 5,
        "files": ["app/tools/git-deploy/page.tsx.bak", ...]
      }
    ],
    "gitignoreStatus": {
      "*.bak": false,
      "*.original": true
    },
    "recommendations": [
      {
        "type": "warning",
        "message": "15件の不要ファイルがGit追跡されています"
      }
    ]
  }
}
```

#### 2. 不要ファイルを削除

```bash
curl -X DELETE http://localhost:3000/api/git/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "categories": [
      {"name": "bak", "pattern": "\\.bak$"},
      {"name": "original", "pattern": "\\.original$"}
    ],
    "updateGitignore": true
  }'
```

---

## 🎨 フロントエンドUIの追加（次のステップ）

既存の `http://localhost:3000/tools/git-deploy` に**クリーンアップタブ**を追加する必要があります。

### 追加する機能

1. **不要ファイル検出タブ**
   - カテゴリ別のファイル数表示
   - ファイルリストの表示
   - `.gitignore`ステータス

2. **削除確認ダイアログ**
   - カテゴリ別の選択チェックボックス
   - 詳細リスト表示
   - 最終確認プロンプト

3. **実行結果表示**
   - 削除成功/失敗の表示
   - `.gitignore`更新ステータス

---

## 📝 UIコンポーネント追加の手順

### Step 1: 新しいタブを追加

`app/tools/git-deploy/page.tsx` の `activeTab` ステートに `'cleanup'` を追加：

```typescript
const [activeTab, setActiveTab] = useState<'deploy' | 'commands' | 'guide' | 'cleanup'>('deploy')
```

### Step 2: クリーンアップタブのボタンを追加

```tsx
<Button
  variant={activeTab === 'cleanup' ? 'default' : 'outline'}
  onClick={() => setActiveTab('cleanup')}
  className="flex items-center gap-2"
>
  <XCircle className="w-4 h-4" />
  不要ファイル削除
</Button>
```

### Step 3: クリーンアップタブのコンテンツを追加

```tsx
{activeTab === 'cleanup' && (
  <CleanupTab />
)}
```

### Step 4: CleanupTab コンポーネントを実装

```typescript
const CleanupTab = () => {
  const [cleanupData, setCleanupData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const checkUnnecessaryFiles = async () => {
    setLoading(true)
    const response = await fetch('/api/git/cleanup')
    const data = await response.json()
    setCleanupData(data.data)
    setLoading(false)
  }
  
  const deleteFiles = async (categories: any[]) => {
    const response = await fetch('/api/git/cleanup', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories,
        updateGitignore: true
      })
    })
    const result = await response.json()
    // 結果を表示
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>不要ファイル検出・削除</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={checkUnnecessaryFiles}>
          スキャン開始
        </Button>
        {/* 結果表示UI */}
      </CardContent>
    </Card>
  )
}
```

---

## ⏰ 時間節約のための代替案

フロントエンドUIの完全な実装には時間がかかるため、**2つの選択肢**を提供します：

### 選択肢A: ターミナルスクリプトを使用（推奨・すぐ使える）

```bash
# すでに作成済み
chmod +x git-cleanup-safe.sh
./git-cleanup-safe.sh
```

**メリット**:
- ✅ すぐに使える
- ✅ 安全な確認プロンプト付き
- ✅ バックアップ自動作成

### 選択肢B: APIを直接呼び出し

```bash
# チェック
curl http://localhost:3000/api/git/cleanup | jq

# 削除（例：.bakファイルのみ）
curl -X DELETE http://localhost:3000/api/git/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "categories": [{"name": "bak", "pattern": "\\.bak$"}],
    "updateGitignore": true
  }' | jq
```

### 選択肢C: フロントエンドUIを完成させる（時間必要）

`app/tools/git-deploy/page.tsx` を拡張してUIを追加
- 所要時間：30-60分
- 実装内容：上記のStep 1-4

---

## 🎯 推奨アクション

**今すぐデプロイしたい場合**:
→ **選択肢A**（ターミナルスクリプト）を使用

```bash
cd /Users/aritahiroaki/n3-frontend_new
chmod +x git-diagnosis.sh git-cleanup-safe.sh
./git-diagnosis.sh          # 現状確認
./git-cleanup-safe.sh       # 安全な削除
```

**後でUIツールを完成させたい場合**:
→ APIは完成しているので、フロントエンド実装のみ

---

## 📊 現在の状況

| 項目 | 状態 |
|------|------|
| APIエンドポイント | ✅ 完成 |
| ターミナルスクリプト | ✅ 完成 |
| フロントエンドUI | ⏳ 未実装 |
| 実用性 | ✅ APIとスクリプトで十分使用可能 |

---

**どの選択肢で進めますか？** 🚀
