# N3 CSS Modules スタイルガイド

## 使用中の CSS ファイル

### FullFeaturedModal.module.css

**パス**: `/components/ProductModal/FullFeaturedModal.module.css`

#### 主要クラス

```css
/* セクション */
.dataSection {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.sectionHeader {
  background: #f5f5f5;
  padding: 1rem;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
}

/* グリッドレイアウト */
.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.dataGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

/* フォーム要素 */
.formInput {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 0.9rem;
}

.formTextarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 0.9rem;
  resize: vertical;
}

/* ボタン */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btnSuccess {
  background: #4caf50;
  color: white;
}
```

## 使用方法

```typescript
import styles from './FullFeaturedModal.module.css';

// ✅ 正しい使い方
<div className={styles.dataSection}>
  <div className={styles.sectionHeader}>タイトル</div>
  <div className={styles.formGrid}>
    <input className={styles.formInput} />
  </div>
</div>

// ✅ インラインスタイルとの併用
<div className={styles.dataSection} style={{ marginTop: '2rem' }}>

// ❌ 間違い
<div className="dataSection">  // CSS Modulesでは動作しない
```
