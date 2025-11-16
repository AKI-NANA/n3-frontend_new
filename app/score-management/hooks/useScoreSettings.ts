/**
 * useScoreSettings - スコア設定管理フック
 */

import { useState, useEffect, useCallback } from 'react';
import { ScoreSettings, SettingsUpdateRequest } from '@/lib/scoring/types';

interface UseScoreSettingsReturn {
  settings: ScoreSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: SettingsUpdateRequest) => Promise<void>;
  refreshSettings: () => Promise<void>;
  totalWeight: number;
}

export function useScoreSettings(): UseScoreSettingsReturn {
  const [settings, setSettings] = useState<ScoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 設定を読み込む
   */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/score/settings');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
      } else {
        throw new Error('設定の取得に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(errorMessage);
      console.error('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 設定を更新
   */
  const updateSettings = useCallback(
    async (updates: SettingsUpdateRequest) => {
      if (!settings) {
        console.error('設定が読み込まれていません');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/score/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: settings.id,
            ...updates,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.settings) {
          setSettings(data.settings);
          console.log('✅ 設定を更新しました');
        } else {
          throw new Error(data.error || '設定の更新に失敗しました');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラー';
        setError(errorMessage);
        console.error('Settings update error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  /**
   * 設定を再読み込み
   */
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  /**
   * 重みの合計を計算
   */
  const totalWeight = settings
    ? (settings.weight_profit || 0) +
      (settings.weight_competition || 0) +
      (settings.weight_future || 0) +
      (settings.weight_trend || 0) +
      (settings.weight_scarcity || 0) +
      (settings.weight_reliability || 0)
    : 0;

  // 初回読み込み
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings,
    totalWeight,
  };
}
