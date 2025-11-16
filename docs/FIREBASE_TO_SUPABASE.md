# Firebase→Supabase変換ガイド

## 🎯 概要

Firebase依存ツールをSupabaseに変換するための手順書です。

## 📋 変換が必要なツール (25個)

| # | ツール名 | URL | 優先度 |
|---|---------|-----|-------|
| 1 | buyma-simulator | /tools/buyma-simulator | ⭐⭐⭐ |
| 2 | variation-creator | /tools/variation-creator | ⭐⭐⭐ |
| 3 | expense-classification | /tools/expense-classification | ⭐⭐ |
| 4 | order-management-v2 | /tools/order-management-v2 | ⭐⭐ |
| 5 | kobutsu-management | /tools/kobutsu-management | ⭐⭐ |
| ... | (残り20個) | ... | ⭐ |

## 🔧 変換手順（1ツールあたり）

### ステップ1: Supabaseテーブル作成

元のFirestoreコレクション構造を確認し、対応するSupabaseテーブルを作成。

**例: buyma-simulator**
```sql
-- 仕入先マスター
CREATE TABLE buyma_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  country TEXT,
  shipping_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 出品ドラフト
CREATE TABLE buyma_draft_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  product_name TEXT NOT NULL,
  cost DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  profit DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ステップ2: コード変換

#### 2.1 Importを置き換え

**Before (Firebase):**
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc } from 'firebase/firestore';
```

**After (Supabase):**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
```

#### 2.2 初期化コードを置き換え

**Before:**
```typescript
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
```

**After:**
```typescript
const supabase = createClientComponentClient();
```

#### 2.3 データ取得を置き換え

**Before (Firestore onSnapshot):**
```typescript
const unsubscribe = onSnapshot(
  collection(db, 'buyma_suppliers'),
  (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSuppliers(list);
  }
);
```

**After (Supabase Realtime):**
```typescript
const fetchSuppliers = async () => {
  const { data, error } = await supabase
    .from('buyma_suppliers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (data) setSuppliers(data);
};

// リアルタイム購読
const channel = supabase
  .channel('buyma_suppliers_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'buyma_suppliers' },
    () => fetchSuppliers()
  )
  .subscribe();
```

#### 2.4 データ追加を置き換え

**Before:**
```typescript
await addDoc(collection(db, 'buyma_suppliers'), {
  name: 'サプライヤー名',
  country: 'USA',
  created_at: serverTimestamp()
});
```

**After:**
```typescript
await supabase
  .from('buyma_suppliers')
  .insert({
    name: 'サプライヤー名',
    country: 'USA',
    user_id: (await supabase.auth.getUser()).data.user?.id
  });
```

### ステップ3: 認証を置き換え

**Before:**
```typescript
await signInAnonymously(auth);
onAuthStateChanged(auth, (user) => {
  if (user) setUserId(user.uid);
});
```

**After:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user) setUserId(user.id);
```

## 🚀 自動変換ツール（将来的に作成予定）

完全自動化は難しいですが、パターンマッチングで80%程度は自動変換可能です。

## 📝 変換完了チェックリスト

- [ ] Supabaseテーブル作成
- [ ] Import文をSupabaseに変更
- [ ] 初期化コードを変更
- [ ] データ取得をSupabase構文に変更
- [ ] データ追加/更新/削除をSupabase構文に変更
- [ ] 認証ロジックを変更
- [ ] リアルタイム購読を設定
- [ ] エラーハンドリングを追加
- [ ] 動作確認

## 💡 推奨アプローチ

1. **優先度の高いツールから順番に変換**（buyma-simulator, variation-creator等）
2. **1ツールずつ完全に動作確認してから次へ**
3. **変換パターンをドキュメント化**して次回に活用

## ⚠️ 注意点

- Firestoreの`serverTimestamp()`は`NOW()`に相当
- FirestoreのサブコレクションはSupabaseでは別テーブル+外部キー
- リアルタイム購読はSupabaseでも可能だが設定方法が異なる
