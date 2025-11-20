"use client";

/**
 * app/tools/batch-research/[jobId]/page.tsx
 *
 * バッチジョブ詳細・進捗表示画面
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Job {
  job_id: string;
  job_name: string;
  description: string;
  status: string;
  progress_percentage: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_processing: number;
  tasks_failed: number;
  total_items_saved: number;
  created_at: string;
  started_at: string;
  completed_at: string;
  estimated_completion_at: string;
}

interface Task {
  search_id: string;
  target_seller_id: string;
  keyword: string;
  date_start: string;
  date_end: string;
  status: string;
  items_retrieved: number;
  total_items_found: number;
  current_page: number;
  total_pages: number;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/batch-research/jobs/${jobId}`);
      const data = await response.json();

      if (data.success) {
        setJob(data.job);
        setTasks(data.tasks);
      } else {
        setError(data.error || "ジョブの取得に失敗しました");
      }
    } catch (error: any) {
      setError("エラーが発生しました: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  // 自動更新（runningステータスの場合のみ）
  useEffect(() => {
    if (autoRefresh && job?.status === "running") {
      const interval = setInterval(() => {
        fetchJobDetails();
      }, 10000); // 10秒ごと

      return () => clearInterval(interval);
    }
  }, [autoRefresh, job?.status]);

  const handlePauseResume = async (action: "pause" | "resume") => {
    try {
      const response = await fetch(`/api/batch-research/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (data.success) {
        fetchJobDetails();
      } else {
        alert(data.error);
      }
    } catch (error: any) {
      alert("エラー: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このジョブを削除してもよろしいですか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/batch-research/jobs/${jobId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        router.push("/tools/batch-research");
      } else {
        alert(data.error);
      }
    } catch (error: any) {
      alert("エラー: " + error.message);
    }
  };

  const exportResults = async (format: "csv" | "json") => {
    try {
      const response = await fetch("/api/batch-research/results/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, format }),
      });

      if (format === "csv") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `batch_research_${jobId}.csv`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `batch_research_${jobId}.json`;
        a.click();
      }
    } catch (error: any) {
      alert("エクスポートエラー: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gray-200 text-gray-800",
      processing: "bg-blue-500 text-white animate-pulse",
      running: "bg-blue-600 text-white",
      completed: "bg-green-500 text-white",
      failed: "bg-red-500 text-white",
      paused: "bg-yellow-500 text-white",
    };
    return styles[status] || "bg-gray-200 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "ジョブが見つかりません"}</p>
          <button
            onClick={() => router.push("/tools/batch-research")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            ジョブ一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/tools/batch-research")}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← ジョブ一覧に戻る
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{job.job_name}</h1>
              {job.description && (
                <p className="text-gray-600">{job.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                自動更新
              </label>
              <button
                onClick={fetchJobDetails}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                更新
              </button>
            </div>
          </div>
        </div>

        {/* ステータスカード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">ステータス</div>
            <div
              className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusBadge(job.status)}`}
            >
              {job.status}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">進捗率</div>
            <div className="text-2xl font-bold">
              {job.progress_percentage.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">完了タスク</div>
            <div className="text-2xl font-bold">
              {job.tasks_completed} / {job.total_tasks}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">取得アイテム数</div>
            <div className="text-2xl font-bold">
              {job.total_items_saved.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">全体進捗</h2>
            <div className="text-sm text-gray-600">
              {job.tasks_completed} / {job.total_tasks} タスク完了
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${job.progress_percentage}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">保留中:</span>{" "}
              <span className="font-medium">{job.tasks_pending}</span>
            </div>
            <div>
              <span className="text-gray-600">処理中:</span>{" "}
              <span className="font-medium">{job.tasks_processing}</span>
            </div>
            <div>
              <span className="text-gray-600">完了:</span>{" "}
              <span className="font-medium text-green-600">
                {job.tasks_completed}
              </span>
            </div>
            <div>
              <span className="text-gray-600">失敗:</span>{" "}
              <span className="font-medium text-red-600">
                {job.tasks_failed}
              </span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">アクション</h2>
          <div className="flex gap-3">
            {job.status === "running" && (
              <button
                onClick={() => handlePauseResume("pause")}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                一時停止
              </button>
            )}
            {job.status === "paused" && (
              <button
                onClick={() => handlePauseResume("resume")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                再開
              </button>
            )}
            <button
              onClick={() => exportResults("csv")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              CSV出力
            </button>
            <button
              onClick={() => exportResults("json")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              JSON出力
            </button>
            {job.status !== "running" && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                削除
              </button>
            )}
          </div>
        </div>

        {/* タスク一覧 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            タスク一覧 ({tasks.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">セラーID</th>
                  <th className="px-4 py-2 text-left">キーワード</th>
                  <th className="px-4 py-2 text-left">期間</th>
                  <th className="px-4 py-2 text-left">ステータス</th>
                  <th className="px-4 py-2 text-right">取得数</th>
                  <th className="px-4 py-2 text-right">総数</th>
                  <th className="px-4 py-2 text-right">ページ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tasks.map((task) => (
                  <tr key={task.search_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{task.target_seller_id}</td>
                    <td className="px-4 py-2">
                      {task.keyword || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {task.date_start} ~ {task.date_end}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadge(task.status)}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {task.items_retrieved}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {task.total_items_found || "-"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {task.total_pages
                        ? `${task.current_page}/${task.total_pages}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
