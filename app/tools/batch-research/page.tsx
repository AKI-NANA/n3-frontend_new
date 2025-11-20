"use client";

/**
 * app/tools/batch-research/page.tsx
 *
 * 大規模データ一括取得バッチ設定画面
 * eBay Finding APIのレート制限を回避しつつ、特定のセラーが販売した
 * 直近の全Soldデータを日付で細かく分割して大量にストック・取得する
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BatchJob {
  job_id: string;
  job_name: string;
  status: string;
  progress_percentage: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  created_at: string;
}

export default function BatchResearchPage() {
  const router = useRouter();

  // フォーム状態
  const [jobName, setJobName] = useState("");
  const [description, setDescription] = useState("");
  const [sellerIds, setSellerIds] = useState("");
  const [keywords, setKeywords] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [splitUnit, setSplitUnit] = useState<"day" | "week">("week");
  const [executionFrequency, setExecutionFrequency] = useState<
    "once" | "daily" | "weekly" | "monthly"
  >("once");

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // 推定情報
  const [estimatedTasks, setEstimatedTasks] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState("");

  // ジョブ一覧を取得
  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const response = await fetch("/api/batch-research/jobs?limit=10");
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("ジョブ一覧取得エラー:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // 推定タスク数を計算
  useEffect(() => {
    if (sellerIds && dateStart && dateEnd) {
      const sellerCount = sellerIds.split(",").filter((s) => s.trim()).length;
      const keywordCount = keywords
        ? keywords.split(",").filter((k) => k.trim()).length
        : 1;

      const start = new Date(dateStart);
      const end = new Date(dateEnd);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      let dateRangeCount = 0;
      if (splitUnit === "day") {
        dateRangeCount = diffDays;
      } else {
        dateRangeCount = Math.ceil(diffDays / 7);
      }

      const totalTasks = sellerCount * keywordCount * dateRangeCount;
      setEstimatedTasks(totalTasks);

      // 推定時間（1タスク約7秒: API 2秒 + 遅延 5秒）
      const estimatedSeconds = totalTasks * 7;
      setEstimatedTime(formatTime(estimatedSeconds));
    }
  }, [sellerIds, keywords, dateStart, dateEnd, splitUnit]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600)
      return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    if (seconds < 86400)
      return `${Math.floor(seconds / 3600)}時間${Math.floor((seconds % 3600) / 60)}分`;
    return `${Math.floor(seconds / 86400)}日${Math.floor((seconds % 86400) / 3600)}時間`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const sellerIdArray = sellerIds
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      const keywordArray = keywords
        ? keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k)
        : undefined;

      const response = await fetch("/api/batch-research/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_name: jobName,
          description,
          target_seller_ids: sellerIdArray,
          keywords: keywordArray,
          date_start: dateStart,
          date_end: dateEnd,
          split_unit: splitUnit,
          execution_frequency: executionFrequency,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          `ジョブを作成しました！ジョブID: ${data.job_id}\n総タスク数: ${data.summary.total_tasks}\n推定完了時間: ${data.summary.estimated_time}`
        );
        // フォームをリセット
        setJobName("");
        setDescription("");
        setSellerIds("");
        setKeywords("");
        setDateStart("");
        setDateEnd("");
        // ジョブ一覧を更新
        fetchJobs();
      } else {
        setError(data.error || "ジョブの作成に失敗しました");
      }
    } catch (error: any) {
      setError("エラーが発生しました: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gray-200 text-gray-800",
      running: "bg-blue-500 text-white",
      completed: "bg-green-500 text-white",
      failed: "bg-red-500 text-white",
      paused: "bg-yellow-500 text-white",
    };
    return styles[status] || "bg-gray-200 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          大規模データ一括取得バッチ
        </h1>
        <p className="text-gray-600 mb-8">
          特定のセラーが販売した全Soldデータを日付分割して取得
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 設定フォーム */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">
                新規バッチジョブ作成
              </h2>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 whitespace-pre-line">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ジョブ名 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ジョブ名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="例: 日本人セラー Q3 2025 リサーチ"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* 説明 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    説明（任意）
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="このジョブの目的や詳細を入力..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* ターゲットセラーID */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ターゲットセラーID{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={sellerIds}
                    onChange={(e) => setSellerIds(e.target.value)}
                    placeholder="カンマ区切りで入力: jpn_seller_001, jpn_seller_002"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    複数のセラーIDをカンマ区切りで入力してください
                  </p>
                </div>

                {/* キーワード */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    キーワード（任意）
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="カンマ区切り: Figure, Anime （空欄でセラーの全商品）"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    空欄の場合、セラーの全商品が対象となります
                  </p>
                </div>

                {/* 期間 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      開始日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      終了日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* 分割単位 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    日付分割単位
                  </label>
                  <select
                    value={splitUnit}
                    onChange={(e) =>
                      setSplitUnit(e.target.value as "day" | "week")
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="week">1週間単位（推奨）</option>
                    <option value="day">1日単位（細かく分割）</option>
                  </select>
                </div>

                {/* 実行頻度 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    実行頻度
                  </label>
                  <select
                    value={executionFrequency}
                    onChange={(e) =>
                      setExecutionFrequency(
                        e.target.value as
                          | "once"
                          | "daily"
                          | "weekly"
                          | "monthly"
                      )
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="once">1回のみ</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "作成中..." : "バッチジョブを作成"}
                </button>
              </form>
            </div>
          </div>

          {/* サイドバー：推定情報 */}
          <div className="space-y-6">
            {/* 推定情報 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">推定情報</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">推定タスク数:</span>
                  <span className="font-bold">{estimatedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">推定完了時間:</span>
                  <span className="font-bold">{estimatedTime || "-"}</span>
                </div>
              </div>
            </div>

            {/* ジョブ一覧 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">最近のジョブ</h3>
                <button
                  onClick={fetchJobs}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                  disabled={isLoadingJobs}
                >
                  {isLoadingJobs ? "更新中..." : "更新"}
                </button>
              </div>
              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    ジョブがありません
                  </p>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.job_id}
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/tools/batch-research/${job.job_id}`)
                      }
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm truncate">
                          {job.job_name}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${getStatusBadge(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${job.progress_percentage}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {job.tasks_completed} / {job.total_tasks} タスク完了
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 使い方ガイド */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3">使い方</h3>
              <ol className="text-sm space-y-2 list-decimal list-inside text-gray-700">
                <li>調査したいセラーIDを入力</li>
                <li>取得期間を指定（最大1年推奨）</li>
                <li>日付分割単位を選択</li>
                <li>ジョブを作成</li>
                <li>VPSのCronが自動実行</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
