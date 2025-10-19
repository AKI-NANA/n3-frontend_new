<?php
/**
 * 高度ランダム化エンジン - 確率分布ベースの出品制御システム
 * 
 * 機能:
 * - 正規分布・指数分布による科学的ランダム化
 * - API制限を考慮した動的調整
 * - 曜日重み付け・時間制約の適用
 * - 前回実行結果に基づく適応的制御
 */
class AdvancedRandomizationEngine {
    private $pdo;
    private static $cachedNormal = null;
    
    public function __construct($pdo = null) {
        $this->pdo = $pdo ?: $this->getDbConnection();
    }
    
    /**
     * 確率分布に基づく出品件数決定
     * 
     * @param array $config 設定配列
     * @return int 出品件数
     */
    public function generateListingCount($config) {
        $distribution = $config['distribution'] ?? 'uniform';
        $min = $config['min'] ?? 5;
        $max = $config['max'] ?? 25;
        
        switch ($distribution) {
            case 'normal':
                return $this->normalDistribution(
                    $config['mean'] ?? 15,
                    $config['std_dev'] ?? 5,
                    $min,
                    $max
                );
                
            case 'exponential':
                return $this->exponentialDistribution(
                    $config['lambda'] ?? 0.1,
                    $min,
                    $max
                );
                
            case 'poisson':
                return $this->poissonDistribution(
                    $config['lambda'] ?? 10,
                    $min,
                    $max
                );
                
            default: // uniform
                return mt_rand($min, $max);
        }
    }
    
    /**
     * 動的間隔計算（前回実行結果を考慮）
     * 
     * @param array $config 間隔設定
     * @param array|null $lastExecutionResult 前回実行結果
     * @return int 間隔（分）
     */
    public function calculateDynamicInterval($config, $lastExecutionResult = null) {
        $distribution = $config['distribution'] ?? 'uniform';
        $min = $config['min'] ?? 15;
        $max = $config['max'] ?? 240;
        
        // 基本間隔計算
        switch ($distribution) {
            case 'exponential':
                $baseInterval = $this->exponentialDistribution(
                    $config['lambda'] ?? 0.02,
                    $min,
                    $max
                );
                break;
                
            case 'normal':
                $baseInterval = $this->normalDistribution(
                    $config['mean'] ?? 60,
                    $config['std_dev'] ?? 30,
                    $min,
                    $max
                );
                break;
                
            default:
                $baseInterval = mt_rand($min, $max);
        }
        
        // 前回実行結果に基づく適応的調整
        if ($lastExecutionResult) {
            $baseInterval = $this->applyAdaptiveAdjustment($baseInterval, $lastExecutionResult, $config);
        }
        
        // 現在時間に基づく調整
        $baseInterval = $this->applyTimeBasedAdjustment($baseInterval, $config);
        
        return max($min, min($max, intval($baseInterval)));
    }
    
    /**
     * 曜日重み付け考慮の時刻決定
     * 
     * @param array $config 時間制約設定
     * @param DateTime $targetDate 対象日
     * @return DateTime スケジュール時刻
     */
    public function generateWeightedScheduleTime($config, $targetDate) {
        $dayOfWeek = $targetDate->format('N'); // 1=月曜, 7=日曜
        
        // 曜日重み取得
        $weights = $config['day_of_week_weights'] ?? [];
        $dayWeight = $weights[$dayOfWeek] ?? 1.0;
        
        // 時間制約取得
        $preferredHours = $config['preferred_hours'] ?? [9, 10, 11, 19, 20, 21];
        $blackoutHours = $config['blackout_hours'] ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 22, 23];
        
        // 利用可能時間を計算
        $availableHours = array_diff($preferredHours, $blackoutHours);
        
        if (empty($availableHours)) {
            throw new Exception('利用可能な時間帯が設定されていません');
        }
        
        // 曜日重みに基づく時間選択
        $selectedHour = $this->selectWeightedHour($availableHours, $dayWeight);
        
        // 分のランダム化（より自然な分散を作成）
        $minute = $this->generateWeightedMinute();
        
        // 基本時刻設定
        $scheduledTime = clone $targetDate;
        $scheduledTime->setTime($selectedHour, $minute, mt_rand(0, 59));
        
        // 曜日重みに基づく時間の微調整
        $varianceMinutes = $this->calculateTimeVariance($dayWeight, $config);
        if ($varianceMinutes != 0) {
            $scheduledTime->add(new DateInterval("PT{$varianceMinutes}M"));
        }
        
        return $scheduledTime;
    }
    
    /**
     * API制限考慮のリアルタイム調整
     * 
     * @param int $plannedCount 予定件数
     * @param array $accountLimits アカウント制限
     * @return int 調整後件数
     */
    public function adjustForApiLimits($plannedCount, $accountLimits) {
        $currentHourlyCount = $accountLimits['current_hourly_count'] ?? 0;
        $currentDailyCount = $accountLimits['current_daily_count'] ?? 0;
        $maxHourly = $accountLimits['max_listings_per_hour'] ?? 100;
        $maxDaily = $accountLimits['max_listings_per_day'] ?? 500;
        $safetyMargin = $accountLimits['safety_margin'] ?? 0.8;
        $burstAllowance = $accountLimits['burst_allowance'] ?? 5;
        
        // 時間制限チェック
        $hourlyLimit = intval($maxHourly * $safetyMargin);
        $availableHourlySlots = max(0, $hourlyLimit - $currentHourlyCount);
        
        // 日次制限チェック
        $dailyLimit = intval($maxDaily * $safetyMargin);
        $availableDailySlots = max(0, $dailyLimit - $currentDailyCount);
        
        // 制限の最小値を適用
        $adjustedCount = min($plannedCount, $availableHourlySlots, $availableDailySlots);
        
        // バースト許可の適用
        if ($adjustedCount < $plannedCount && $plannedCount <= $burstAllowance) {
            $remainingBurst = min($burstAllowance, $plannedCount - $adjustedCount);
            $adjustedCount += $remainingBurst;
        }
        
        // 詳細ログ
        error_log("API制限調整: 予定{$plannedCount} → 調整後{$adjustedCount} (時間枠:{$availableHourlySlots}, 日次枠:{$availableDailySlots})");
        
        return max(0, $adjustedCount);
    }
    
    /**
     * アカウント負荷分散ロジック
     * 
     * @param array $accounts 利用可能アカウント配列
     * @param int $totalItems 総出品件数
     * @return array アカウント別割り当て
     */
    public function distributeLoadAcrossAccounts($accounts, $totalItems) {
        $distribution = [];
        $totalCapacity = 0;
        
        // 各アカウントの利用可能容量を計算
        foreach ($accounts as $account) {
            $capacity = $this->calculateAccountCapacity($account);
            $distribution[] = [
                'account' => $account,
                'capacity' => $capacity,
                'assigned' => 0
            ];
            $totalCapacity += $capacity;
        }
        
        if ($totalCapacity == 0) {
            throw new Exception('利用可能なアカウント容量がありません');
        }
        
        // 容量比に基づく配分
        $remainingItems = $totalItems;
        for ($i = 0; $i < count($distribution); $i++) {
            if ($remainingItems <= 0) break;
            
            $ratio = $distribution[$i]['capacity'] / $totalCapacity;
            $assigned = min($remainingItems, intval($totalItems * $ratio));
            
            // 最後のアカウントには残り全てを割り当て
            if ($i == count($distribution) - 1) {
                $assigned = $remainingItems;
            }
            
            $distribution[$i]['assigned'] = $assigned;
            $remainingItems -= $assigned;
        }
        
        return $distribution;
    }
    
    /**
     * 時間帯別出品最適化
     * 
     * @param DateTime $currentTime 現在時刻
     * @param array $config 設定
     * @return float 最適化係数
     */
    public function calculateTimeOptimizationFactor($currentTime, $config) {
        $hour = intval($currentTime->format('H'));
        $dayOfWeek = intval($currentTime->format('N'));
        
        // 時間帯別係数
        $hourFactors = [
            9 => 1.2,   // 朝の活動時間
            10 => 1.3,
            11 => 1.1,
            12 => 0.9,  // ランチタイム
            13 => 0.8,
            14 => 1.0,
            15 => 1.1,
            16 => 1.0,
            17 => 0.9,  // 帰宅時間
            18 => 0.8,
            19 => 1.4,  // 夜間ピーク
            20 => 1.5,  // 最適時間
            21 => 1.3,
            22 => 0.7
        ];
        
        // 曜日別係数
        $dayFactors = [
            1 => 1.2,  // 月曜
            2 => 1.3,  // 火曜
            3 => 1.1,  // 水曜
            4 => 1.2,  // 木曜
            5 => 1.0,  // 金曜
            6 => 0.8,  // 土曜
            7 => 0.6   // 日曜
        ];
        
        $timeFactor = $hourFactors[$hour] ?? 1.0;
        $dayFactor = $dayFactors[$dayOfWeek] ?? 1.0;
        
        // 季節調整
        $seasonFactor = $this->calculateSeasonalFactor($currentTime);
        
        return $timeFactor * $dayFactor * $seasonFactor;
    }
    
    // ==========================================
    // 統計的分布関数の実装
    // ==========================================
    
    /**
     * 正規分布（Box-Muller変換）
     */
    private function normalDistribution($mean, $stdDev, $min, $max) {
        if (self::$cachedNormal === null) {
            // Box-Muller変換で2つの独立な正規分布値を生成
            $u1 = mt_rand(1, mt_getrandmax()) / mt_getrandmax();
            $u2 = mt_rand(1, mt_getrandmax()) / mt_getrandmax();
            
            $z0 = sqrt(-2 * log($u1)) * cos(2 * pi() * $u2);
            self::$cachedNormal = sqrt(-2 * log($u1)) * sin(2 * pi() * $u2);
            
            $value = $mean + $stdDev * $z0;
        } else {
            $value = $mean + $stdDev * self::$cachedNormal;
            self::$cachedNormal = null;
        }
        
        return max($min, min($max, intval(round($value))));
    }
    
    /**
     * 指数分布
     */
    private function exponentialDistribution($lambda, $min, $max) {
        $u = mt_rand(1, mt_getrandmax()) / mt_getrandmax();
        $value = -log($u) / $lambda;
        return max($min, min($max, intval(round($value))));
    }
    
    /**
     * ポアソン分布
     */
    private function poissonDistribution($lambda, $min, $max) {
        $l = exp(-$lambda);
        $k = 0;
        $p = 1;
        
        do {
            $k++;
            $u = mt_rand() / mt_getrandmax();
            $p *= $u;
        } while ($p > $l);
        
        return max($min, min($max, $k - 1));
    }
    
    // ==========================================
    // ヘルパーメソッド
    // ==========================================
    
    /**
     * 前回実行結果に基づく適応的調整
     */
    private function applyAdaptiveAdjustment($baseInterval, $lastResult, $config) {
        $successRate = $lastResult['success_rate'] ?? 1.0;
        $errorRate = 1.0 - $successRate;
        
        // 成功率に基づく調整
        if ($successRate < 0.6) {
            // 成功率が低い場合：大幅に間隔を延ばす
            $adjustmentFactor = 2.0 + ($errorRate * 2.0);
        } elseif ($successRate < 0.8) {
            // 成功率が中程度の場合：間隔を延ばす
            $adjustmentFactor = 1.3 + ($errorRate * 0.7);
        } elseif ($successRate > 0.95) {
            // 成功率が高い場合：間隔を短縮
            $adjustmentFactor = 0.7 - (($successRate - 0.95) * 2);
        } else {
            // 標準的な成功率：わずかな調整
            $adjustmentFactor = 1.0 + ((0.9 - $successRate) * 0.5);
        }
        
        // APIエラー頻度による追加調整
        $apiErrors = $lastResult['api_errors'] ?? 0;
        if ($apiErrors > 3) {
            $adjustmentFactor *= (1.0 + ($apiErrors * 0.2));
        }
        
        return $baseInterval * $adjustmentFactor;
    }
    
    /**
     * 時間帯に基づく調整
     */
    private function applyTimeBasedAdjustment($baseInterval, $config) {
        $currentHour = intval(date('H'));
        
        // 深夜・早朝は間隔を延ばす
        if ($currentHour >= 23 || $currentHour <= 6) {
            return $baseInterval * 1.5;
        }
        
        // ピーク時間は間隔を短縮
        if ($currentHour >= 19 && $currentHour <= 21) {
            return $baseInterval * 0.8;
        }
        
        return $baseInterval;
    }
    
    /**
     * 重み付きの時間選択
     */
    private function selectWeightedHour($availableHours, $dayWeight) {
        // 曜日重みに基づく選択確率の調整
        $weights = [];
        foreach ($availableHours as $hour) {
            // 時間帯別の基本重み
            $baseWeight = 1.0;
            if ($hour >= 19 && $hour <= 21) {
                $baseWeight = 2.0; // 夜間ピーク
            } elseif ($hour >= 9 && $hour <= 11) {
                $baseWeight = 1.5; // 朝の活動時間
            }
            
            $weights[$hour] = $baseWeight * $dayWeight;
        }
        
        return $this->weightedRandomSelect($weights);
    }
    
    /**
     * 重み付きランダム選択
     */
    private function weightedRandomSelect($weights) {
        $totalWeight = array_sum($weights);
        $random = mt_rand() / mt_getrandmax() * $totalWeight;
        
        $cumulative = 0;
        foreach ($weights as $key => $weight) {
            $cumulative += $weight;
            if ($random <= $cumulative) {
                return $key;
            }
        }
        
        return array_key_first($weights);
    }
    
    /**
     * 重み付きの分生成
     */
    private function generateWeightedMinute() {
        // 00, 15, 30, 45分により高い重みを付与
        $weights = array_fill(0, 60, 1.0);
        $weights[0] = 2.0;
        $weights[15] = 1.8;
        $weights[30] = 1.8;
        $weights[45] = 1.8;
        
        // 5の倍数にも軽い重み
        for ($i = 5; $i < 60; $i += 5) {
            if (!in_array($i, [0, 15, 30, 45])) {
                $weights[$i] = 1.3;
            }
        }
        
        return $this->weightedRandomSelect($weights);
    }
    
    /**
     * 時間分散の計算
     */
    private function calculateTimeVariance($dayWeight, $config) {
        $maxVariance = $config['time_variance']['max_minutes'] ?? 30;
        $varianceRange = intval($maxVariance * $dayWeight);
        
        return mt_rand(-$varianceRange, $varianceRange);
    }
    
    /**
     * アカウント容量計算
     */
    private function calculateAccountCapacity($account) {
        $rateLimits = $account['rate_limits'];
        $maxHourly = $rateLimits['max_listings_per_hour'] ?? 100;
        $currentHourly = $rateLimits['current_hourly_count'] ?? 0;
        $safetyMargin = $rateLimits['safety_margin'] ?? 0.8;
        
        return max(0, intval(($maxHourly * $safetyMargin) - $currentHourly));
    }
    
    /**
     * 季節調整係数
     */
    private function calculateSeasonalFactor($dateTime) {
        $month = intval($dateTime->format('n'));
        
        // 月別季節係数
        $seasonalFactors = [
            1 => 0.8,   // 1月：正月
            2 => 1.0,   // 2月：通常
            3 => 1.2,   // 3月：新年度準備
            4 => 1.3,   // 4月：新年度
            5 => 1.1,   // 5月：GW影響
            6 => 1.0,   // 6月：通常
            7 => 0.9,   // 7月：夏休み前
            8 => 0.8,   // 8月：夏休み
            9 => 1.2,   // 9月：新学期
            10 => 1.1,  // 10月：秋
            11 => 1.0,  // 11月：通常
            12 => 1.4   // 12月：年末商戦
        ];
        
        return $seasonalFactors[$month] ?? 1.0;
    }
    
    /**
     * データベース接続
     */
    private function getDbConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (PDOException $e) {
            error_log("ランダム化エンジン - データベース接続エラー: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }
    }
}
?>
