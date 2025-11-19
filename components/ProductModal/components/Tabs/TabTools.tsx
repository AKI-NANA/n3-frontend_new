'use client';

import { useState } from 'react';
import styles from '../../FullFeaturedModal.css';
import type { Product } from '@/types/product';

export interface TabToolsProps {
  product: Product | null;
  onSave?: (updates: any) => void; // カテゴリー情報を保存するコールバック
}

interface CategoryResult {
  category_name: string;
  category_id: string;
  confidence: number;
  fee?: {
    final_value_fee_percent: number;
    final_value_fee_amount: number;
    paypal_fee: number;
    total_fee: number;
  };
  hasFeeError?: boolean;
}

interface ToolResults {
  category?: CategoryResult;
  profit?: {
    revenue: number;
    costs: number;
    profit: number;
    profit_margin: number;
  };
  filter?: {
    passed: boolean;
    reasons: string[];
  };
  sellermirror?: {
    competitors_count: number;
    avg_price: number;
    min_price: number;
    max_price: number;
    suggested_price: number;
    market_saturation: string;
    top_sellers: { name: string; price: number; sold: number }[];
  };
}

export function TabTools({ product, onSave }: TabToolsProps) {
  // DBからデータを取得
  const smLowestPrice = (product as any)?.sm_lowest_price || 0;
  const smAveragePrice = (product as any)?.sm_average_price || 0;
  const smCompetitorCount = (product as any)?.sm_competitor_count || 0;
  const smProfitMargin = (product as any)?.sm_profit_margin || 0;
  const smProfitAmountUsd = (product as any)?.sm_profit_amount_usd || 0;
  
  const profitMargin = (product as any)?.profit_margin || 0;
  const profitAmountUsd = (product as any)?.profit_amount_usd || 0;
  const priceUsd = (product as any)?.price_usd || 0;
  const priceJpy = (product as any)?.price_jpy || 0;
  
  // 初期状態をDBから設定
  const [toolResults, setToolResults] = useState<ToolResults>({
    // SellerMirrorデータがDBにあれば表示
    sellermirror: (smCompetitorCount > 0 || smAveragePrice > 0) ? {
      competitors_count: smCompetitorCount,
      avg_price: smAveragePrice,
      min_price: smLowestPrice,
      max_price: smAveragePrice * 1.5, // 仮値
      suggested_price: smAveragePrice,
      market_saturation: smCompetitorCount > 20 ? '高' : smCompetitorCount > 10 ? '中' : '低',
      top_sellers: [], // DBにトップセラー情報がないため空配列
    } : undefined,
    // 利益計算データがDBにあれば表示
    profit: (profitMargin > 0 || profitAmountUsd > 0) ? {
      revenue: priceUsd,
      costs: priceUsd - profitAmountUsd,
      profit: profitAmountUsd,
      profit_margin: profitMargin,
    } : undefined,
  });
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  const runCategoryTool = async () => {
    if (!product) return;
    
    setRunningTool('category');
    setErrorDetails('');
    
    try {
      const categoryResponse = await fetch('/api/category/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          price_jpy: product.cost ? product.cost * 150 : 0,
          description: product.description,
        }),
      });

      const categoryResult = await categoryResponse.json();

      if (!categoryResult.success) {
        throw new Error(`カテゴリー判定失敗: ${categoryResult.error}`);
      }

      const category = categoryResult.category;

      // 手数料取得
      let feeData = null;
      let hasFeeError = false;

      try {
        const feeResponse = await fetch('/api/category/fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: category.category_id,
            price_usd: product.price || 0,
          }),
        });

        const feeResult = await feeResponse.json();

        if (feeResult.success && feeResult.fee) {
          feeData = feeResult.fee;
        } else {
          hasFeeError = true;
        }
      } catch (feeError) {
        hasFeeError = true;
      }

      const categoryData: CategoryResult = {
        category_name: category.category_name,
        category_id: category.category_id,
        confidence: category.confidence / 100,
        fee: feeData,
        hasFeeError,
      };

      setToolResults(prev => ({
        ...prev,
        category: categoryData,
      }));

      // 🔥 カテゴリー情報をテーブルに保存
      if (onSave) {
        onSave({
          category_name: category.category_name,
          category_number: category.category_id,
        });
      }

    } catch (error) {
      console.error('[TabTools] Error:', error);
      setErrorDetails(error instanceof Error ? error.message : String(error));
    } finally {
      setRunningTool(null);
    }
  };

  const runProfitCalculator = async () => {
    setRunningTool('profit');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setToolResults(prev => ({
        ...prev,
        profit: {
          revenue: 5000,
          costs: 3000,
          profit: 2000,
          profit_margin: 40,
        },
      }));
    } finally {
      setRunningTool(null);
    }
  };

  const runFilterTool = async () => {
    setRunningTool('filter');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setToolResults(prev => ({
        ...prev,
        filter: {
          passed: true,
          reasons: ['利益率OK (40%)', 'カテゴリ適合', '在庫あり'],
        },
      }));
    } finally {
      setRunningTool(null);
    }
  };

  const runSellerMirrorTool = async () => {
    setRunningTool('mirror');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setToolResults(prev => ({
        ...prev,
        sellermirror: {
          competitors_count: 15,
          avg_price: 4500,
          min_price: 3200,
          max_price: 6800,
          suggested_price: 4800,
          market_saturation: '中程度',
          top_sellers: [
            { name: 'CardShop123', price: 4800, sold: 45 },
            { name: 'RetroTCG', price: 4500, sold: 38 },
            { name: 'PokéMaster', price: 5200, sold: 32 },
          ],
        },
      }));
    } finally {
      setRunningTool(null);
    }
  };

  const runAllTools = async () => {
    await runCategoryTool();
    await runProfitCalculator();
    await runFilterTool();
    await runSellerMirrorTool();
  };

  const isToolRunning = (tool: string) => runningTool === tool;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
        統合ツール実行
      </h3>
      
      {/* 🔥 実行結果サマリー */}
      {(toolResults.category || toolResults.profit || toolResults.filter || toolResults.sellermirror) && (
        <div style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #e3f2fd, #f3e5f5)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '2px solid #1976d2'
        }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1976d2' }}>
            <i className="fas fa-check-circle"></i> 実行結果サマリー
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div style={{
              padding: '0.75rem',
              background: toolResults.category ? '#d4edda' : 'white',
              borderRadius: '6px',
              textAlign: 'center',
              border: `2px solid ${toolResults.category ? '#28a745' : '#e0e0e0'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>カテゴリ</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: toolResults.category ? '#28a745' : '#999' }}>
                {toolResults.category ? '✓' : '-'}
              </div>
            </div>
            <div style={{
              padding: '0.75rem',
              background: toolResults.profit ? '#d4edda' : 'white',
              borderRadius: '6px',
              textAlign: 'center',
              border: `2px solid ${toolResults.profit ? '#28a745' : '#e0e0e0'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>利益</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: toolResults.profit ? '#28a745' : '#999' }}>
                {toolResults.profit ? '✓' : '-'}
              </div>
            </div>
            <div style={{
              padding: '0.75rem',
              background: toolResults.filter ? '#d4edda' : 'white',
              borderRadius: '6px',
              textAlign: 'center',
              border: `2px solid ${toolResults.filter ? '#28a745' : '#e0e0e0'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>フィルター</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: toolResults.filter ? '#28a745' : '#999' }}>
                {toolResults.filter ? '✓' : '-'}
              </div>
            </div>
            <div style={{
              padding: '0.75rem',
              background: toolResults.sellermirror ? '#d4edda' : 'white',
              borderRadius: '6px',
              textAlign: 'center',
              border: `2px solid ${toolResults.sellermirror ? '#28a745' : '#e0e0e0'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>競合調査</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: toolResults.sellermirror ? '#28a745' : '#999' }}>
                {toolResults.sellermirror ? '✓' : '-'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {errorDetails && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '1rem',
          fontSize: '12px',
          color: '#c00'
        }}>
          <strong>エラー:</strong> {errorDetails}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* カテゴリ判定 + 手数料 */}
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            <div>カテゴリ判定 + 手数料</div>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={runCategoryTool}
              disabled={isToolRunning('category')}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              {isToolRunning('category') ? '実行中...' : '実行'}
            </button>
          </div>
          <div style={{ padding: '1rem' }}>
            {toolResults.category ? (
              <div style={{ 
                background: toolResults.category.hasFeeError ? '#fff3cd' : 'white',
                border: `1px solid ${toolResults.category.hasFeeError ? '#ffc107' : '#e0e0e0'}`,
                borderRadius: '6px',
                padding: '12px'
              }}>
                <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#666', fontSize: '12px' }}>カテゴリ:</span>
                    <div style={{ color: '#0064d2', fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>
                      {toolResults.category.category_name}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#666', fontSize: '11px' }}>ID:</span>
                      <div style={{
                        background: '#f0f0f0',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '13px',
                        color: '#0064d2',
                        marginTop: '2px'
                      }}>{toolResults.category.category_id}</div>
                    </div>
                    
                    <div>
                      <span style={{ fontWeight: 600, color: '#666', fontSize: '11px' }}>信頼度:</span>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '13px',
                        marginTop: '2px',
                        background: toolResults.category.confidence >= 0.8 ? '#d4edda' : '#fff3cd',
                        color: toolResults.category.confidence >= 0.8 ? '#155724' : '#856404'
                      }}>{(toolResults.category.confidence * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {toolResults.category.fee ? (
                  <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 600, color: '#333', marginBottom: '8px', fontSize: '12px' }}>
                      eBay手数料
                    </div>
                    
                    <div style={{ fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#666' }}>Final Value Fee:</span>
                        <span style={{ fontWeight: 600, color: '#333' }}>
                          {toolResults.category.fee.final_value_fee_percent}% 
                          <span style={{ color: '#28a745' }}> (${(toolResults.category.fee.final_value_fee_amount || 0).toFixed(2)})</span>
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#666' }}>PayPal Fee:</span>
                        <span style={{ fontWeight: 600, color: '#28a745' }}>
                          ${(toolResults.category.fee.paypal_fee || 0).toFixed(2)}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px solid #dee2e6',
                        marginTop: '4px'
                      }}>
                        <span style={{ fontWeight: 600, color: '#666' }}>総手数料:</span>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#dc3545' }}>
                          ${(toolResults.category.fee.total_fee || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    color: '#721c24',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      手数料データなし
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      このカテゴリーの手数料データが見つかりません。
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#999', margin: 0 }}>カテゴリ判定を実行してください</p>
            )}
          </div>
        </div>

        {/* フィルターチェック */}
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            <div>フィルターチェック</div>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={runFilterTool}
              disabled={isToolRunning('filter')}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              {isToolRunning('filter') ? '実行中...' : '実行'}
            </button>
          </div>
          <div style={{ padding: '1rem' }}>
            {toolResults.filter ? (
              <div>
                <div style={{ 
                  marginBottom: '0.75rem', 
                  fontWeight: 700, 
                  color: toolResults.filter.passed ? '#28a745' : '#dc3545'
                }}>
                  {toolResults.filter.passed ? '✓ 合格' : '✗ 不合格'}
                </div>
                {toolResults.filter.reasons.map((reason, idx) => (
                  <div key={idx} style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    • {reason}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', margin: 0 }}>フィルターチェックを実行してください</p>
            )}
          </div>
        </div>

        {/* 利益計算 */}
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            <div>利益計算</div>
            <button 
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={runProfitCalculator}
              disabled={isToolRunning('profit')}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              {isToolRunning('profit') ? '実行中...' : '実行'}
            </button>
          </div>
          <div style={{ padding: '1rem' }}>
            {toolResults.profit ? (
              <div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>売上:</strong> ${toolResults.profit.revenue.toFixed(2)}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>コスト:</strong> ${toolResults.profit.costs.toFixed(2)}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#28a745' }}>純利益:</strong> 
                  <span style={{ color: '#28a745', fontWeight: 700 }}>
                    {' '}${toolResults.profit.profit.toFixed(2)}
                  </span>
                </div>
                <div>
                  <strong>利益率:</strong> {toolResults.profit.profit_margin.toFixed(1)}%
                </div>
              </div>
            ) : (
              <p style={{ color: '#999', margin: 0 }}>利益計算を実行してください</p>
            )}
          </div>
        </div>

        {/* SellerMirror */}
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            <div>SellerMirror連携</div>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={runSellerMirrorTool}
              disabled={isToolRunning('mirror')}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            >
              {isToolRunning('mirror') ? '実行中...' : '実行'}
            </button>
          </div>
          <div style={{ padding: '1rem' }}>
            {toolResults.sellermirror ? (
              <div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>競合数:</strong> {toolResults.sellermirror.competitors_count}件
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>平均価格:</strong> ${toolResults.sellermirror.avg_price.toFixed(2)}
                </div>
                <div>
                  <strong style={{ color: '#17a2b8' }}>推奨価格:</strong> 
                  <span style={{ color: '#17a2b8', fontWeight: 700 }}>
                    {' '}${toolResults.sellermirror.suggested_price.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#999', margin: 0 }}>競合調査を実行してください</p>
            )}
          </div>
        </div>
      </div>

      {/* 一括実行ボタン */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button 
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={runAllTools}
          disabled={runningTool !== null}
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
        >
          {runningTool ? '実行中...' : '全ツール一括実行'}
        </button>
      </div>

      {/* SellerMirror詳細 */}
      {toolResults.sellermirror && (
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader} style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white' }}>
            SellerMirror詳細分析
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>
                市場価格範囲
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>最低価格</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    ${toolResults.sellermirror.min_price.toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: '#e3f2fd', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1976d2', marginBottom: '0.25rem' }}>平均価格</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1976d2' }}>
                    ${toolResults.sellermirror.avg_price.toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '0.25rem' }}>最高価格</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    ${toolResults.sellermirror.max_price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>
                トップセラー
              </h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {toolResults.sellermirror.top_sellers.map((seller, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '0.75rem', 
                      background: '#f8f9fa', 
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong>#{idx + 1} {seller.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                        販売数: {seller.sold}件
                      </div>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      ${seller.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
