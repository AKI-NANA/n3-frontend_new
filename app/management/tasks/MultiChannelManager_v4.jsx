import React, { useState, useEffect, useCallback } from 'react';

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
    id: string;
    title: string;
    description: string;
    rate: number;
    // 💡 拡張フィールド
    dueDate: string; // YYYY-MM-DD
    urls: string[];
    images: ImageMock[];
    codeSnippets: CodeSnippet[];
    todos: TodoItem[];
    // ... その他の既存フィールド
}

// ----------------------------------------------
// III. Googleカレンダー同期モックロジック (TaskManager)
// ----------------------------------------------
const mockGoogleCalendarSync = (taskTitle: string, dueDate: string) => {
    console.log(`[Google Calendar Mock] Task "${taskTitle}" scheduled for ${dueDate}.`);
    // 💡 ここに統合的な通知システム（ローカル通知など）を組み込むことも可能
    alert(`カレンダー同期モック: ${taskTitle} を ${dueDate} にスケジューリングしました。`);
};

// ----------------------------------------------
// タスク管理のメインコンポーネント
// ----------------------------------------------
const MultiChannelManagerV4 = () => {
    // 既存のタスクリスト（モックデータ）
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // editingItemの初期状態（拡張フィールドを含む）
    const initialEditingItem: TaskItem = {
        id: '',
        title: '',
        description: '',
        rate: 0,
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

    // 既存のタスク保存処理を拡張
    const handleSaveTask = useCallback(() => {
        if (!editingItem.title) return;

        // 2. URLのパースロジック
        const parsedUrls = urlsInput
            .split(/[\n,]/) // 改行またはカンマで分割
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http') || url.startsWith('www'))); // URLっぽいものに限定
        
        const finalItem = {
            ...editingItem,
            urls: parsedUrls,
        };

        // 既存タスクの更新または新規追加ロジック...
        // ... (省略)
        setTasks(prev => {
            const exists = prev.some(t => t.id === finalItem.id);
            if (exists) {
                return prev.map(t => t.id === finalItem.id ? finalItem : t);
            }
            return [...prev, { ...finalItem, id: Date.now().toString() }];
        });
        
        // 3-1. カレンダー同期モックロジックの呼び出し
        if (finalItem.dueDate && finalItem.title) {
            mockGoogleCalendarSync(finalItem.title, finalItem.dueDate);
        }

        setIsModalOpen(false);
        setEditingItem(initialEditingItem);
        setUrlsInput('');

    }, [editingItem, urlsInput]);

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
        setEditingItem(prev => ({ ...prev, images: [...prev.images, mockImage] }));
    };

    // 2-5. ToDoリスト機能 ロジック
    const handleAddTodo = () => {
        setEditingItem(prev => ({ 
            ...prev, 
            todos: [...prev.todos, { text: '', completed: false }] 
        }));
    };

    // モーダルUIのレンダリング (簡略化)
    const TaskEditModal = () => {
        if (!isModalOpen) return null;

        return (
            <div className="modal-backdrop">
                <div className="modal-content">
                    <h3>タスク編集: {editingItem.title || '新規'}</h3>

                    {/* 基本フィールド */}
                    <input 
                        type="text" 
                        placeholder="タスクタイトル" 
                        value={editingItem.title}
                        onChange={e => setEditingItem(prev => ({ ...prev, title: e.target.value }))}
                    />
                    
                    {/* rateフィールド */}
                    <input 
                        type="number" 
                        placeholder="単価 (rate)" 
                        value={editingItem.rate}
                        onChange={e => setEditingItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    />

                    {/* 2-1. 締切日 (dueDate) 入力フィールド */}
                    <label>締切日:</label>
                    <input 
                        type="date" 
                        value={editingItem.dueDate}
                        onChange={e => setEditingItem(prev => ({ ...prev, dueDate: e.target.value }))}
                    />

                    {/* descriptionフィールド */}
                    <textarea 
                        placeholder="詳細説明" 
                        value={editingItem.description}
                        onChange={e => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
                    />

                    {/* 2-2. 関連URL登録 (複数対応) */}
                    <section>
                        <h4>関連URL (カンマ/改行区切り)</h4>
                        <textarea 
                            value={urlsInput}
                            onChange={e => setUrlsInput(e.target.value)}
                            placeholder="https://example.com, https://app.com"
                        />
                        <small>保存時にパースされます: {urlsInput.split(/[\n,]/).filter(u => u.trim().length > 0).length} 件のURLを検出</small>
                    </section>

                    {/* 2-3. 画像保存（モックアップローダー） */}
                    <section>
                        <h4>画像添付 (モック)</h4>
                        <button onClick={handleImageAttach}>+ 画像を添付</button>
                        <ul>
                            {editingItem.images.map(img => (
                                <li key={img.id}>{img.name} (モック)</li>
                            ))}
                        </ul>
                    </section>

                    {/* 2-4. コードスニペット保存 */}
                    <section>
                        <h4>コードスニペット</h4>
                        {editingItem.codeSnippets.map((snippet, index) => (
                            <div key={index} className="code-snippet-item">
                                <select 
                                    value={snippet.language} 
                                    onChange={e => {
                                        const newSnippets = [...editingItem.codeSnippets];
                                        newSnippets[index].language = e.target.value;
                                        setEditingItem(prev => ({ ...prev, codeSnippets: newSnippets }));
                                    }}
                                >
                                    {['JavaScript', 'Python', 'SQL', 'Markdown', 'Other'].map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                                <textarea 
                                    value={snippet.code}
                                    onChange={e => {
                                        const newSnippets = [...editingItem.codeSnippets];
                                        newSnippets[index].code = e.target.value;
                                        setEditingItem(prev => ({ ...prev, codeSnippets: newSnippets }));
                                    }}
                                    placeholder={`Write your ${snippet.language} code here...`}
                                />
                            </div>
                        ))}
                        <button 
                            onClick={() => setEditingItem(prev => ({ 
                                ...prev, 
                                codeSnippets: [...prev.codeSnippets, { language: 'JavaScript', code: '' }] 
                            }))}
                        >
                            + スニペット追加
                        </button>
                    </section>

                    {/* 2-5. ToDoリスト機能 */}
                    <section>
                        <h4>ToDoリスト</h4>
                        <ul>
                            {editingItem.todos.map((todo, index) => (
                                <li key={index}>
                                    <input 
                                        type="checkbox" 
                                        checked={todo.completed}
                                        onChange={e => {
                                            const newTodos = [...editingItem.todos];
                                            newTodos[index].completed = e.target.checked;
                                            setEditingItem(prev => ({ ...prev, todos: newTodos }));
                                        }}
                                    />
                                    <input 
                                        type="text" 
                                        value={todo.text}
                                        onChange={e => {
                                            const newTodos = [...editingItem.todos];
                                            newTodos[index].text = e.target.value;
                                            setEditingItem(prev => ({ ...prev, todos: newTodos }));
                                        }}
                                        placeholder="ToDo item text"
                                        className={todo.completed ? 'completed-text' : ''}
                                    />
                                </li>
                            ))}
                        </ul>
                        <button onClick={handleAddTodo}>+ ToDo項目を追加</button>
                    </section>


                    <button onClick={handleSaveTask}>保存して閉じる</button>
                    <button onClick={() => setIsModalOpen(false)}>キャンセル</button>
                </div>
            </div>
        );
    };

    return (
        <div className="task-manager-v4">
            <h1>MultiChannelManager V4 🚀</h1>
            <button onClick={() => setIsModalOpen(true)}>新規タスク作成</button>
            
            {/* 既存タスクリストの表示 (dueDateも表示可能) */}
            <div className="task-list">
                {tasks.map(task => (
                    <div key={task.id} className="task-item">
                        <h2>{task.title}</h2>
                        <p>締切: {task.dueDate || '未設定'}</p>
                        {/* リッチコンテンツの簡易表示ロジックを追加 */}
                    </div>
                ))}
            </div>

            <TaskEditModal />
        </div>
    );
};

export default MultiChannelManagerV4;