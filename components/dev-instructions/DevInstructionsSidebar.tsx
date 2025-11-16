'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DevInstruction, InstructionStatus, ToolCategory, Priority, CategoryIcons, SortOption, CodeSnippet } from './types';
import { syncedInstructionStorage } from './synced-storage';
import { supabaseInstructionStorage } from './supabase-storage';
import { 
  ChevronDown, ChevronRight, Plus, Edit, Trash2, 
  Image as ImageIcon, FileText, Folder, Save, X, Upload, ZoomIn,
  AlertCircle, ArrowUp, ArrowDown, Minus, Code, Copy, Check, Cloud, CloudOff, RefreshCw, HardDrive, Database
} from 'lucide-react';

export function DevInstructionsSidebar() {
  const [instructions, setInstructions] = useState<DevInstruction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'instructions' | 'files'>('instructions');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<DevInstruction | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [supabaseIds, setSupabaseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const data = await syncedInstructionStorage.getAll();
      setInstructions(data);
      
      // Supabaseに保存されているIDを取得
      await checkSupabaseSync();
      
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Load error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Supabaseに保存されているIDリストを取得
  const checkSupabaseSync = async () => {
    try {
      const supabaseData = await supabaseInstructionStorage.getAll();
      const ids = new Set(supabaseData.map(item => item.id));
      setSupabaseIds(ids);
      console.log('📊 Supabase sync status:', ids.size, 'items');
    } catch (error) {
      console.error('❌ Failed to check Supabase sync:', error);
      setSupabaseIds(new Set());
    }
  };

  // selectedIdが変わったら編集モードを解除（別の指示書を選択した場合のみ）
  useEffect(() => {
    if (selectedId && isEditing && editData && editData.id !== selectedId) {
      setIsEditing(false);
      setEditData(null);
    }
  }, [selectedId]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleAddNew = async () => {
    try {
      console.log('🆕 Creating new instruction...');
      
      // 指示書タブに切り替え
      setActiveTab('instructions');
      
      const newInstruction = await syncedInstructionStorage.add({
        title: '新規指示書',
        category: 'その他',
        status: '未着手',
        priority: '中',
        description: '',
        memo: '',
        images: [],
        codeSnippets: [],
        relatedFiles: [],
      });
      
      console.log('✅ New instruction created:', newInstruction.id);
      
      await loadInstructions();
      setSelectedId(newInstruction.id);
      setExpandedIds(new Set([...expandedIds, newInstruction.id]));
      
      console.log('✅ New instruction added to list');
    } catch (error) {
      console.error('❌ Error creating new instruction:', error);
      alert('指示書の作成に失敗しました。コンソールを確認してください。');
    }
  };

  const handleDelete = async (id: string) => {
    const instruction = instructions.find(i => i.id === id);
    const title = instruction?.title || 'この指示書';
    
    if (confirm(`「${title}」を削除しますか？\n\nローカルストレージとSupabaseデータベースの両方から削除されます。`)) {
      console.log('🗑️ Deleting instruction:', id, title);
      
      await syncedInstructionStorage.delete(id);
      await loadInstructions();
      
      if (selectedId === id) {
        setSelectedId(null);
      }
      
      console.log('✅ Deleted from both local and Supabase');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<DevInstruction>) => {
    // ローカルの状態を即座に更新
    setInstructions(prevInstructions => 
      prevInstructions.map(inst => 
        inst.id === id ? { ...inst, ...updates, updatedAt: new Date().toISOString() } : inst
      )
    );
    
    // バックグラウンドで同期
    await syncedInstructionStorage.update(id, updates);
    
    // 編集中のeditDataも更新
    if (isEditing && editData && editData.id === id) {
      setEditData({ ...editData, ...updates });
    }
  };

  // 自動保存（デバウンス付き）
  const handleAutoSave = (id: string, updates: Partial<DevInstruction>) => {
    // 前回のタイマーをキャンセル
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // 1秒後に保存
    const timeout = setTimeout(() => {
      handleUpdate(id, updates);
    }, 1000);

    setAutoSaveTimeout(timeout);
  };

  const handleSave = () => {
    if (editData && selectedId) {
      handleUpdate(selectedId, editData);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const startEdit = () => {
    const instruction = instructions.find(i => i.id === selectedId);
    if (instruction) {
      setEditData({ ...instruction });
      setIsEditing(true);
    }
  };

  const getSortedInstructions = () => {
    const sorted = [...instructions];
    
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { '最高': 0, '高': 1, '中': 2, '低': 3 };
        return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      case 'createdAt':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'updatedAt':
        return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case 'status':
      default:
        const statusOrder = { '開発中': 0, '未着手': 1, '使用済み': 2, '保留': 3, '完了': 4 };
        return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }
  };

  const groupByStatus = () => {
    const groups: Record<InstructionStatus, DevInstruction[]> = {
      '未着手': [],
      '開発中': [],
      '使用済み': [],
      '完了': [],
      '保留': [],
    };
    getSortedInstructions().forEach(inst => {
      groups[inst.status].push(inst);
    });
    return groups;
  };

  const getStatusColor = (status: InstructionStatus) => {
    switch (status) {
      case '未着手': return 'bg-gray-100 text-gray-700';
      case '開発中': return 'bg-blue-100 text-blue-700';
      case '使用済み': return 'bg-green-100 text-green-700';
      case '完了': return 'bg-purple-100 text-purple-700';
      case '保留': return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case '最高': return 'text-red-600';
      case '高': return 'text-orange-600';
      case '中': return 'text-blue-600';
      case '低': return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case '最高': return <AlertCircle size={14} className="text-red-600" />;
      case '高': return <ArrowUp size={14} className="text-orange-600" />;
      case '中': return <Minus size={14} className="text-blue-600" />;
      case '低': return <ArrowDown size={14} className="text-gray-600" />;
    }
  };

  const selectedInstruction = React.useMemo(() => {
    const instruction = selectedId ? instructions.find(i => i.id === selectedId) : null;
    console.log('🔍 Selected Instruction:', {
      selectedId,
      found: !!instruction,
      title: instruction?.title,
      totalInstructions: instructions.length
    });
    return instruction;
  }, [selectedId, instructions]);

  // デバッグ用
  useEffect(() => {
    if (selectedId) {
      console.log('📌 Selection changed:', {
        selectedId,
        hasInstruction: !!selectedInstruction,
        instructionsCount: instructions.length
      });
    }
  }, [selectedId, selectedInstruction, instructions]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 画像拡大モーダル */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-6xl max-h-full">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={enlargedImage}
              alt="Enlarged"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* サイドバー */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">開発指示書管理</h2>
            <div className="flex items-center gap-2">
              {/* 同期ステータス */}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-1 text-white text-xs">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>同期中...</span>
                </div>
              )}
              {syncStatus === 'success' && (
                <div className="flex items-center gap-1 text-green-200 text-xs">
                  <Cloud size={14} />
                  <span>保存済</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-200 text-xs">
                  <CloudOff size={14} />
                  <span>同期失敗</span>
                </div>
              )}
              {/* 手動同期ボタン */}
              <button
                onClick={loadInstructions}
                disabled={isSyncing}
                className="p-1 hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
                title="再読み込み"
              >
                <RefreshCw size={16} className={`text-white ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab('instructions')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                activeTab === 'instructions'
                  ? 'bg-white text-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              指示書一覧
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                activeTab === 'files'
                  ? 'bg-white text-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              ファイル管理
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'instructions' ? (
            <div className="p-3">
              <button
                onClick={handleAddNew}
                disabled={isSyncing}
                className="w-full mb-3 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                新規指示書
              </button>

              {/* ソートオプション */}
              <div className="mb-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="status">ステータス順</option>
                  <option value="priority">優先順位順</option>
                  <option value="updatedAt">更新日時順</option>
                  <option value="createdAt">作成日時順</option>
                </select>
              </div>

              {sortBy === 'status' ? (
              Object.entries(groupByStatus()).map(([status, items]) => (
              items.length > 0 && (
              <div key={status} className="mb-4">
              <div className={`px-2 py-1 text-xs font-semibold rounded mb-2 ${getStatusColor(status as InstructionStatus)}`}>
              {status} ({items.length})
              </div>
              {items.map(inst => (
              <InstructionListItem
              key={inst.id}
              instruction={inst}
              isSelected={selectedId === inst.id}
              isExpanded={expandedIds.has(inst.id)}
              onSelect={() => {
                setSelectedId(inst.id);
                setActiveTab('instructions');
              }}
                onToggleExpand={() => toggleExpand(inst.id)}
                          getPriorityIcon={getPriorityIcon}
                          isInSupabase={supabaseIds.has(inst.id)}
                        />
                ))}
                </div>
                )
                ))
              ) : (
              <div className="mb-4">
              {getSortedInstructions().map(inst => (
              <InstructionListItem
              key={inst.id}
              instruction={inst}
              isSelected={selectedId === inst.id}
              isExpanded={expandedIds.has(inst.id)}
              onSelect={() => {
                setSelectedId(inst.id);
                setActiveTab('instructions');
              }}
                onToggleExpand={() => toggleExpand(inst.id)}
                          getPriorityIcon={getPriorityIcon}
                  isInSupabase={supabaseIds.has(inst.id)}
                  />
                  ))}
                </div>
              )}

              {instructions.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  指示書がありません
                  <br />
                  新規作成してください
                </div>
              )}
            </div>
          ) : (
            <FileExplorer />
          )}
        </div>
      </div>

      {/* 詳細パネル */}
      <div className="flex-1 overflow-y-auto bg-white">
        {selectedInstruction ? (
          <>
            {/* タブ警告 */}
            {activeTab === 'files' && (
              <div className="bg-yellow-50 border-b border-yellow-200 p-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  ファイルタブが選択されていますが、選択された指示書を表示しています。
                </span>
                <button
                  onClick={() => setActiveTab('instructions')}
                  className="ml-auto px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                >
                  指示書タブに戻る
                </button>
              </div>
            )}
            <InstructionDetail
              instruction={isEditing && editData ? editData : selectedInstruction}
              isEditing={isEditing}
              onUpdate={handleUpdate}
              onAutoSave={handleAutoSave}
              onDelete={() => handleDelete(selectedInstruction.id)}
              onStartEdit={startEdit}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              onEditDataChange={setEditData}
              onEnlargeImage={setEnlargedImage}
              syncStatus={syncStatus}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p>指示書を選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 指示書リストアイテムコンポーネント
function InstructionListItem({
  instruction,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  getPriorityIcon,
  isInSupabase,
}: {
  instruction: DevInstruction;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  getPriorityIcon: (priority: Priority) => React.ReactNode;
  isInSupabase: boolean;
}) {
  const categoryIcon = CategoryIcons[instruction.category];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👆 Item clicked:', {
      id: instruction.id,
      title: instruction.title,
      currentSelectedId: isSelected ? 'already selected' : 'not selected'
    });
    console.log('📦 Calling onSelect...');
    onSelect();
    console.log('✅ onSelect called');
  };

  return (
    <div className="mb-2">
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-blue-50 border-l-4 border-blue-500' 
            : 'hover:bg-gray-50'
        }`}
        onClick={handleClick}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0.5 hover:bg-gray-200 rounded"
        >
          {isExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{categoryIcon}</span>
            <div className="text-sm font-medium text-gray-900 truncate flex-1">
              {instruction.title}
            </div>
            {getPriorityIcon(instruction.priority)}
            {/* 保存状態インジケーター */}
            <div className="flex items-center gap-1">
              {/* ローカルストレージ（常に保存済み） */}
              <div title="ローカルストレージに保存済み">
                <HardDrive size={12} className="text-green-600" />
              </div>
              {/* Supabase */}
              {isInSupabase ? (
                <div title="Supabaseに保存済み">
                  <Database size={12} className="text-blue-600" />
                </div>
              ) : (
                <div title="Supabaseに未保存（同期待ち）">
                  <Database size={12} className="text-gray-300" />
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {instruction.category}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="ml-6 mt-1 p-2 bg-gray-50 rounded text-xs border-l-2 border-gray-200">
          <div className="text-gray-600 line-clamp-3">
            {instruction.description || '説明なし'}
          </div>
          {instruction.images.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-gray-500">
              <ImageIcon size={12} />
              <span>{instruction.images.length}枚の画像</span>
            </div>
          )}
          {instruction.relatedFiles.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-gray-500">
              <FileText size={12} />
              <span>{instruction.relatedFiles.length}個のファイル</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 指示書詳細コンポーネント
function InstructionDetail({
  instruction,
  isEditing,
  onUpdate,
  onAutoSave,
  onDelete,
  onStartEdit,
  onSave,
  onCancel,
  onEditDataChange,
  onEnlargeImage,
  syncStatus,
}: {
  instruction: DevInstruction;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<DevInstruction>) => void;
  onAutoSave: (id: string, updates: Partial<DevInstruction>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditDataChange: (data: DevInstruction) => void;
  onEnlargeImage: (url: string) => void;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    });
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const newImage = {
        id: Date.now().toString(),
        filename: file.name,
        base64Data,
        description: '',
        uploadedAt: new Date().toISOString(),
      };
      
      const updatedImages = [...instruction.images, newImage];
      
      if (isEditing && onEditDataChange) {
        onEditDataChange({ ...instruction, images: updatedImages });
      } else {
        onUpdate(instruction.id, { images: updatedImages });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    });
    
    e.target.value = '';
  };

  const handleDeleteImage = (imageId: string) => {
    const updatedImages = instruction.images.filter(img => img.id !== imageId);
    
    if (isEditing && onEditDataChange) {
      onEditDataChange({ ...instruction, images: updatedImages });
    } else {
      onUpdate(instruction.id, { images: updatedImages });
    }
  };

  const categoryIcon = CategoryIcons[instruction.category];

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-3xl">{categoryIcon}</span>
          {isEditing ? (
            <input
              type="text"
              value={instruction.title}
              onChange={(e) => onEditDataChange({ ...instruction, title: e.target.value })}
              className="text-2xl font-bold border-b-2 border-blue-500 focus:outline-none flex-1"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{instruction.title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 保存ステータス */}
          <div className="mr-2">
            {syncStatus === 'syncing' && (
              <div className="flex items-center gap-1 text-blue-600 text-sm">
                <RefreshCw size={14} className="animate-spin" />
                <span>保存中...</span>
              </div>
            )}
            {syncStatus === 'success' && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Check size={14} />
                <span>保存済み</span>
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle size={14} />
                <span>保存失敗</span>
              </div>
            )}
          </div>
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Save size={16} />
                保存
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 flex items-center gap-2 transition-colors"
              >
                <X size={16} />
                キャンセル
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onUpdate(instruction.id, instruction)}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-2 transition-colors"
                title="今すぐ保存"
              >
                <Save size={16} />
                保存
              </button>
              <button
                onClick={onStartEdit}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="編集"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={onDelete}
                className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
                title="削除"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ステータス、優先順位、カテゴリ */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select
            value={instruction.status}
            onChange={(e) => {
              if (isEditing) {
                onEditDataChange({ ...instruction, status: e.target.value as InstructionStatus });
              } else {
                onUpdate(instruction.id, { status: e.target.value as InstructionStatus });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="未着手">未着手</option>
            <option value="開発中">開発中</option>
            <option value="使用済み">使用済み</option>
            <option value="完了">完了</option>
            <option value="保留">保留</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">優先順位</label>
          <select
            value={instruction.priority}
            onChange={(e) => {
              if (isEditing) {
                onEditDataChange({ ...instruction, priority: e.target.value as Priority });
              } else {
                onUpdate(instruction.id, { priority: e.target.value as Priority });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="最高">🔴 最高</option>
            <option value="高">🟠 高</option>
            <option value="中">🔵 中</option>
            <option value="低">⚪ 低</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
          <select
            value={instruction.category}
            onChange={(e) => onEditDataChange({ ...instruction, category: e.target.value as ToolCategory })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={!isEditing}
          >
            {Object.entries(CategoryIcons).map(([category, icon]) => (
              <option key={category} value={category}>
                {icon} {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 指示書内容 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">指示書内容</label>
        {isEditing ? (
          <textarea
            value={instruction.description}
            onChange={(e) => onEditDataChange({ ...instruction, description: e.target.value })}
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="開発指示書の内容を記入..."
          />
        ) : (
          <>
            <textarea
              value={instruction.description}
              onChange={(e) => {
                const newValue = e.target.value;
                onAutoSave(instruction.id, { description: newValue });
              }}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="開発指示書の内容を記入..."
            />
            <p className="text-xs text-gray-500 mt-1">✨ 入力後1秒で自動保存されます</p>
          </>
        )}
      </div>

      {/* 進行状況メモ */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">進行状況メモ</label>
        {isEditing ? (
          <textarea
            value={instruction.memo}
            onChange={(e) => onEditDataChange({ ...instruction, memo: e.target.value })}
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="進行状況や気づいたことをメモ..."
          />
        ) : (
          <>
            <textarea
              value={instruction.memo}
              onChange={(e) => {
                const newValue = e.target.value;
                onAutoSave(instruction.id, { memo: newValue });
              }}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="進行状況や気づいたことをメモ..."
            />
            <p className="text-xs text-gray-500 mt-1">✨ 入力後1秒で自動保存されます</p>
          </>
        )}
      </div>

      {/* 画像管理 - ドラッグ&ドロップ対応 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">画像・スクリーンショット</label>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mb-3 p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <Upload size={32} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              ファイルをドラッグ&ドロップ または クリックして選択
            </p>
            <p className="text-xs text-gray-500 mt-1">
              複数の画像を一度にアップロード可能
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="grid grid-cols-3 gap-3">
          {instruction.images.map((img) => (
            <div key={img.id} className="relative group border border-gray-200 rounded overflow-hidden">
              <img
                src={img.base64Data}
                alt={img.filename}
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => onEnlargeImage(img.base64Data)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2">
                <button
                  onClick={() => onEnlargeImage(img.base64Data)}
                  className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-blue-600 text-white text-sm rounded transition-opacity"
                >
                  <ZoomIn size={16} className="inline" />
                </button>
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-red-600 text-white text-sm rounded transition-opacity"
                >
                  削除
                </button>
              </div>
              <div className="p-2 bg-gray-50 text-xs text-gray-600 truncate">
                {img.filename}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* コードスニペット管理 */}
      <CodeSnippetManager
        snippets={instruction.codeSnippets || []}
        isEditing={isEditing}
        onUpdate={(snippets) => {
          if (isEditing && onEditDataChange) {
            onEditDataChange({ ...instruction, codeSnippets: snippets });
          } else {
            onUpdate(instruction.id, { codeSnippets: snippets });
          }
        }}
      />

      {/* タイムスタンプ */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        <div className="flex justify-between">
          <span>作成: {new Date(instruction.createdAt).toLocaleString('ja-JP')}</span>
          <span>更新: {new Date(instruction.updatedAt).toLocaleString('ja-JP')}</span>
        </div>
      </div>
    </div>
  );
}

// ファイルエクスプローラーコンポーネント
function FileExplorer() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Folder size={18} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900">ローカルファイル</h3>
      </div>
      <div className="text-sm text-gray-600">
        <p className="mb-2 font-mono text-xs bg-gray-100 p-2 rounded">/Users/aritahiroaki/n3-frontend_new/</p>
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-500">ファイルツリー表示機能は次回実装予定</p>
        </div>
      </div>
    </div>
  );
}

// コードスニペット管理コンポーネント
function CodeSnippetManager({
  snippets = [],
  isEditing,
  onUpdate,
}: {
  snippets?: CodeSnippet[];
  isEditing: boolean;
  onUpdate: (snippets: CodeSnippet[]) => void;
}) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSnippet, setNewSnippet] = useState<Partial<CodeSnippet>>({
    language: 'typescript',
    filename: '',
    code: '',
    description: '',
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const languages = [
    'typescript', 'javascript', 'python', 'php', 'css', 'html', 
    'json', 'sql', 'bash', 'markdown', 'other'
  ];

  const handleAddSnippet = () => {
    if (!newSnippet.filename || !newSnippet.code) {
      alert('ファイル名とコードを入力してください');
      return;
    }

    const snippet: CodeSnippet = {
      id: Date.now().toString(),
      language: newSnippet.language || 'typescript',
      filename: newSnippet.filename,
      code: newSnippet.code,
      description: newSnippet.description || '',
      createdAt: new Date().toISOString(),
    };

    onUpdate([...snippets, snippet]);
    setIsAddingNew(false);
    setNewSnippet({
      language: 'typescript',
      filename: '',
      code: '',
      description: '',
    });
  };

  const handleDeleteSnippet = (id: string) => {
    if (confirm('このコードスニペットを削除しますか？')) {
      onUpdate(snippets.filter(s => s.id !== id));
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      typescript: 'bg-blue-100 text-blue-700',
      javascript: 'bg-yellow-100 text-yellow-700',
      python: 'bg-green-100 text-green-700',
      php: 'bg-purple-100 text-purple-700',
      css: 'bg-pink-100 text-pink-700',
      html: 'bg-orange-100 text-orange-700',
      json: 'bg-gray-100 text-gray-700',
      sql: 'bg-indigo-100 text-indigo-700',
      bash: 'bg-teal-100 text-teal-700',
      markdown: 'bg-cyan-100 text-cyan-700',
    };
    return colors[language] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">
          コードスニペット ({snippets.length})
        </label>
        {!isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1 transition-colors"
          >
            <Plus size={14} />
            追加
          </button>
        )}
      </div>

      {/* 新規追加フォーム */}
      {isAddingNew && (
        <div className="mb-3 p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">言語</label>
              <select
                value={newSnippet.language}
                onChange={(e) => setNewSnippet({ ...newSnippet, language: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ファイル名 *</label>
              <input
                type="text"
                value={newSnippet.filename}
                onChange={(e) => setNewSnippet({ ...newSnippet, filename: e.target.value })}
                placeholder="example.ts"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
            <input
              type="text"
              value={newSnippet.description}
              onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
              placeholder="このコードの説明..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">コード *</label>
            <textarea
              value={newSnippet.code}
              onChange={(e) => setNewSnippet({ ...newSnippet, code: e.target.value })}
              placeholder="コードを貼り付け..."
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 font-mono text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddSnippet}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => {
                setIsAddingNew(false);
                setNewSnippet({ language: 'typescript', filename: '', code: '', description: '' });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* スニペット一覧 */}
      <div className="space-y-2">
        {snippets.map((snippet) => {
          const isExpanded = expandedIds.has(snippet.id);
          return (
            <div key={snippet.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleExpand(snippet.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <button className="p-0.5">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <Code size={16} className="text-gray-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{snippet.filename}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${getLanguageColor(snippet.language)}`}>
                        {snippet.language}
                      </span>
                    </div>
                    {snippet.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{snippet.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(snippet.id, snippet.code);
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title="コピー"
                  >
                    {copiedId === snippet.id ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} className="text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSnippet(snippet.id);
                    }}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    title="削除"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="p-3 bg-gray-900">
                  <pre className="text-sm text-gray-100 font-mono overflow-x-auto">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {snippets.length === 0 && !isAddingNew && (
        <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          コードスニペットがありません
          <br />
          「追加」ボタンでコードを保存
        </div>
      )}
    </div>
  );
}
