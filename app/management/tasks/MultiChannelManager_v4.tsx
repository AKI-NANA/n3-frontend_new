'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ----------------------------------------------
// I. Task Data Structureの拡張 (型定義)
// ----------------------------------------------
interface ImageMock {
  id: string;
  name: string;
  url: string; // モックURL
}

interface CodeSnippet {
  language: string;
  code: string;
}

interface TodoItem {
  text: string;
  completed: boolean;
}

interface TaskItem {
  id?: string;
  title: string;
  description: string;
  rate: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  // 💡 拡張フィールド
  dueDate: string; // YYYY-MM-DD
  urls: string[];
  images: ImageMock[];
  codeSnippets: CodeSnippet[];
  todos: TodoItem[];
}

// ----------------------------------------------
// III. Googleカレンダー同期モックロジック
// ----------------------------------------------
const mockGoogleCalendarSync = (taskTitle: string, dueDate: string) => {
  console.log(`[Google Calendar Mock] Task "${taskTitle}" scheduled for ${dueDate}.`);
  // 💡 ここに統合的な通知システム（ローカル通知など）を組み込むことも可能
  alert(`カレンダー同期モック: ${taskTitle} を ${dueDate} にスケジューリングしました。`);
};

// ----------------------------------------------
// タスク管理のメインコンポーネント
// ----------------------------------------------
const MultiChannelManagerV4: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // editingItemの初期状態（拡張フィールドを含む）
  const initialEditingItem: TaskItem = {
    title: '',
    description: '',
    rate: 0,
    status: 'pending',
    // 拡張フィールドの初期化
    dueDate: '',
    urls: [],
    images: [],
    codeSnippets: [{ language: 'JavaScript', code: '' }], // 初期スニペットを一つ用意
    todos: [],
  };
  const [editingItem, setEditingItem] = useState<TaskItem>(initialEditingItem);

  // 関連URL入力用の未パーステキスト
  const [urlsInput, setUrlsInput] = useState('');

  // ユーザー認証とタスクの読み込み
  useEffect(() => {
    const fetchUserAndTasks = async () => {
      try {
        // ユーザー認証情報を取得
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }

        // タスクを読み込み
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('タスクの読み込みエラー:', error);
        } else {
          // データベースから読み込んだタスクを変換
          const loadedTasks = (data || []).map((task: any) => ({
            id: task.id,
            title: task.title || '',
            description: task.description || '',
            rate: task.rate || 0,
            status: task.status || 'pending',
            created_at: task.created_at,
            updated_at: task.updated_at,
            user_id: task.user_id,
            dueDate: task.due_date || '',
            urls: task.urls || [],
            images: task.images || [],
            codeSnippets: task.code_snippets || [],
            todos: task.todos || [],
          }));
          setTasks(loadedTasks);
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTasks();
  }, []);

  // タスク保存処理
  const handleSaveTask = useCallback(async () => {
    if (!editingItem.title) {
      alert('タスクタイトルを入力してください');
      return;
    }

    setSaving(true);

    try {
      // 2. URLのパースロジック
      const parsedUrls = urlsInput
        .split(/[\n,]/) // 改行またはカンマで分割
        .map((url) => url.trim())
        .filter((url) => url.length > 0 && (url.startsWith('http') || url.startsWith('www'))); // URLっぽいものに限定

      const finalItem = {
        ...editingItem,
        urls: parsedUrls,
      };

      // Supabaseに保存するデータ形式に変換
      const taskData = {
        title: finalItem.title,
        description: finalItem.description,
        rate: finalItem.rate,
        status: finalItem.status || 'pending',
        due_date: finalItem.dueDate || null,
        urls: finalItem.urls,
        images: finalItem.images,
        code_snippets: finalItem.codeSnippets,
        todos: finalItem.todos,
        user_id: userId,
      };

      if (finalItem.id) {
        // 既存タスクの更新
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', finalItem.id)
          .select()
          .single();

        if (error) {
          console.error('タスク更新エラー:', error);
          alert('タスクの更新に失敗しました');
          return;
        }

        // ローカル状態を更新
        setTasks((prev) => prev.map((t) => (t.id === finalItem.id ? { ...finalItem, ...data } : t)));
      } else {
        // 新規タスクの作成
        const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();

        if (error) {
          console.error('タスク作成エラー:', error);
          alert('タスクの作成に失敗しました');
          return;
        }

        // ローカル状態を更新
        setTasks((prev) => [{ ...finalItem, id: data.id }, ...prev]);
      }

      // 3-1. カレンダー同期モックロジックの呼び出し
      if (finalItem.dueDate && finalItem.title) {
        mockGoogleCalendarSync(finalItem.title, finalItem.dueDate);
      }

      // モーダルを閉じてフォームをリセット
      setIsModalOpen(false);
      setEditingItem(initialEditingItem);
      setUrlsInput('');
    } catch (error) {
      console.error('保存処理エラー:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  }, [editingItem, urlsInput, userId, initialEditingItem]);

  // タスク編集
  const handleEditTask = (task: TaskItem) => {
    setEditingItem(task);
    setUrlsInput(task.urls.join(', '));
    setIsModalOpen(true);
  };

  // タスク削除
  const handleDeleteTask = async (taskId: string | undefined) => {
    if (!taskId) return;
    if (!confirm('このタスクを削除しますか？')) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) {
        console.error('タスク削除エラー:', error);
        alert('タスクの削除に失敗しました');
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('削除処理エラー:', error);
      alert('削除中にエラーが発生しました');
    }
  };

  // ----------------------------------------------
  // II. タスク編集/作成モーダルの改修 (UI/ロジック)
  // ----------------------------------------------

  // 2-3. 画像保存（モックアップローダー）ロジック
  const handleImageAttach = () => {
    const mockImage: ImageMock = {
      id: crypto.randomUUID(),
      name: `Image_${new Date().toISOString().substring(0, 10)}_${editingItem.images.length + 1}.jpg`,
      url: `/mock/image/${crypto.randomUUID()}`,
    };
    setEditingItem((prev) => ({ ...prev, images: [...prev.images, mockImage] }));
  };

  // 画像削除
  const handleImageRemove = (imageId: string) => {
    setEditingItem((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
    }));
  };

  // 2-5. ToDoリスト機能 ロジック
  const handleAddTodo = () => {
    setEditingItem((prev) => ({
      ...prev,
      todos: [...prev.todos, { text: '', completed: false }],
    }));
  };

  // ToDo削除
  const handleRemoveTodo = (index: number) => {
    setEditingItem((prev) => ({
      ...prev,
      todos: prev.todos.filter((_, i) => i !== index),
    }));
  };

  // コードスニペット削除
  const handleRemoveSnippet = (index: number) => {
    setEditingItem((prev) => ({
      ...prev,
      codeSnippets: prev.codeSnippets.filter((_, i) => i !== index),
    }));
  };

  // モーダルUIのレンダリング
  const TaskEditModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-2xl font-bold mb-4">
              {editingItem.id ? 'タスク編集' : '新規タスク作成'}
            </h3>

            {/* 基本フィールド */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タスクタイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="タスクタイトルを入力"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* rateフィールド */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">単価 (円)</label>
                <input
                  type="number"
                  placeholder="単価を入力"
                  value={editingItem.rate}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 2-1. 締切日 (dueDate) 入力フィールド */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">締切日</label>
                <input
                  type="date"
                  value={editingItem.dueDate}
                  onChange={(e) => setEditingItem((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* descriptionフィールド */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">詳細説明</label>
                <textarea
                  placeholder="タスクの詳細を入力"
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 2-2. 関連URL登録 (複数対応) */}
              <div>
                <h4 className="text-lg font-semibold mb-2">関連URL</h4>
                <textarea
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  placeholder="https://example.com, https://app.com (カンマまたは改行区切り)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <small className="text-gray-500">
                  保存時にパースされます:{' '}
                  {urlsInput.split(/[\n,]/).filter((u) => u.trim().length > 0).length} 件のURLを検出
                </small>
              </div>

              {/* 2-3. 画像保存（モックアップローダー） */}
              <div>
                <h4 className="text-lg font-semibold mb-2">画像添付 (モック)</h4>
                <button
                  type="button"
                  onClick={handleImageAttach}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 mb-2"
                >
                  + 画像を添付
                </button>
                {editingItem.images.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {editingItem.images.map((img) => (
                      <li
                        key={img.id}
                        className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                      >
                        <span className="text-sm">{img.name} (モック)</span>
                        <button
                          type="button"
                          onClick={() => handleImageRemove(img.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 2-4. コードスニペット保存 */}
              <div>
                <h4 className="text-lg font-semibold mb-2">コードスニペット</h4>
                <div className="space-y-3">
                  {editingItem.codeSnippets.map((snippet, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <select
                          value={snippet.language}
                          onChange={(e) => {
                            const newSnippets = [...editingItem.codeSnippets];
                            newSnippets[index].language = e.target.value;
                            setEditingItem((prev) => ({ ...prev, codeSnippets: newSnippets }));
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {['JavaScript', 'Python', 'SQL', 'Markdown', 'TypeScript', 'Other'].map(
                            (lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            )
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveSnippet(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
                      <textarea
                        value={snippet.code}
                        onChange={(e) => {
                          const newSnippets = [...editingItem.codeSnippets];
                          newSnippets[index].code = e.target.value;
                          setEditingItem((prev) => ({ ...prev, codeSnippets: newSnippets }));
                        }}
                        placeholder={`Write your ${snippet.language} code here...`}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem((prev) => ({
                      ...prev,
                      codeSnippets: [...prev.codeSnippets, { language: 'JavaScript', code: '' }],
                    }))
                  }
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  + スニペット追加
                </button>
              </div>

              {/* 2-5. ToDoリスト機能 */}
              <div>
                <h4 className="text-lg font-semibold mb-2">ToDoリスト</h4>
                {editingItem.todos.length > 0 && (
                  <ul className="space-y-2 mb-2">
                    {editingItem.todos.map((todo, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={(e) => {
                            const newTodos = [...editingItem.todos];
                            newTodos[index].completed = e.target.checked;
                            setEditingItem((prev) => ({ ...prev, todos: newTodos }));
                          }}
                          className="w-4 h-4"
                        />
                        <input
                          type="text"
                          value={todo.text}
                          onChange={(e) => {
                            const newTodos = [...editingItem.todos];
                            newTodos[index].text = e.target.value;
                            setEditingItem((prev) => ({ ...prev, todos: newTodos }));
                          }}
                          placeholder="ToDo項目を入力"
                          className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            todo.completed ? 'line-through text-gray-400' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTodo(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={handleAddTodo}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                >
                  + ToDo項目を追加
                </button>
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(initialEditingItem);
                  setUrlsInput('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveTask}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存して閉じる'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">MultiChannelManager V4 🚀</h1>
          <button
            onClick={() => {
              setEditingItem(initialEditingItem);
              setUrlsInput('');
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
          >
            + 新規タスク作成
          </button>
        </div>

        {/* タスクリスト */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p className="text-lg">タスクがありません</p>
              <p className="text-sm mt-2">「新規タスク作成」ボタンからタスクを追加してください</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-800 flex-1">{task.title}</h2>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : task.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {task.status || 'pending'}
                  </span>
                </div>

                {task.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                )}

                <div className="space-y-2 text-sm mb-4">
                  {task.dueDate && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">締切:</span>
                      <span className="text-gray-600">{task.dueDate}</span>
                    </div>
                  )}
                  {task.rate > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">単価:</span>
                      <span className="text-gray-600">¥{task.rate.toLocaleString()}</span>
                    </div>
                  )}
                  {task.urls.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">URL:</span>
                      <span className="text-gray-600">{task.urls.length}件</span>
                    </div>
                  )}
                  {task.images.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">画像:</span>
                      <span className="text-gray-600">{task.images.length}件</span>
                    </div>
                  )}
                  {task.codeSnippets.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">コード:</span>
                      <span className="text-gray-600">{task.codeSnippets.length}件</span>
                    </div>
                  )}
                  {task.todos.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">ToDo:</span>
                      <span className="text-gray-600">
                        {task.todos.filter((t) => t.completed).length} / {task.todos.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <TaskEditModal />
      </div>
    </div>
  );
};

export default MultiChannelManagerV4;
