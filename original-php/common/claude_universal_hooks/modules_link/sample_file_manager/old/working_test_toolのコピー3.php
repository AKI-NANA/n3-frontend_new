import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import {
  User,
  Project,
  Task,
  File,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  X,
  Menu,
  Home,
  Users,
  Folder,
  ClipboardList,
  Code,
  LogOut,
  LogIn,
  UserPlus
} from 'lucide-react'; // Icons

// --- Zustand Stores ---

// Toast Notification Store
const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, duration);
  },
}));

// Modal Store
const useModalStore = create((set) => ({
  isOpen: false,
  content: null,
  title: '',
  openModal: (content, title = '') => set({ isOpen: true, content, title }),
  closeModal: () => set({ isOpen: false, content: null, title: '' }),
}));

// Auth Store
const useAuthStore = create((set) => ({
  isLoggedIn: false,
  user: null,
  login: (userData) => set({ isLoggedIn: true, user: userData }),
  logout: () => set({ isLoggedIn: false, user: null }),
}));

// Data Store (Mock API Calls)
const useDataStore = create((set, get) => ({
  users: [],
  projects: [],
  tasks: [],
  files: [],
  loading: false,
  error: null,

  // Generic API call simulation
  simulateApiCall: async (action, data = null) => {
    set({ loading: true, error: null });
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          let result;
          switch (action) {
            case 'fetchUsers':
              result = [
                { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'admin', createdAt: new Date() },
                { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'user', createdAt: new Date() },
              ];
              set({ users: result });
              break;
            case 'createUser':
              result = { ...data, id: `u${Date.now()}`, createdAt: new Date() };
              set((state) => ({ users: [...state.users, result] }));
              break;
            case 'updateUser':
              set((state) => ({
                users: state.users.map((u) => (u.id === data.id ? { ...u, ...data } : u)),
              }));
              result = data;
              break;
            case 'deleteUser':
              set((state) => ({ users: state.users.filter((u) => u.id !== data) }));
              result = { success: true };
              break;

            case 'fetchProjects':
              result = [
                { id: 'p1', title: 'CAIDS Optimization', status: 'active', priority: 'high', assignedTo: ['Alice'], deadline: new Date(2025, 11, 31), progress: 75 },
                { id: 'p2', title: 'New Feature Rollout', status: 'completed', priority: 'medium', assignedTo: ['Bob'], deadline: new Date(2025, 6, 15), progress: 100 },
              ];
              set({ projects: result });
              break;
            case 'createProject':
              result = { ...data, id: `p${Date.now()}`, createdAt: new Date(), progress: 0 };
              set((state) => ({ projects: [...state.projects, result] }));
              break;
            case 'updateProject':
              set((state) => ({
                projects: state.projects.map((p) => (p.id === data.id ? { ...p, ...data } : p)),
              }));
              result = data;
              break;
            case 'deleteProject':
              set((state) => ({ projects: state.projects.filter((p) => p.id !== data) }));
              result = { success: true };
              break;

            case 'fetchTasks':
              result = [
                { id: 't1', title: 'Implement Modal UI', projectId: 'p1', status: 'completed', assignedTo: 'Alice', createdAt: new Date() },
                { id: 't2', title: 'Design API Endpoints', projectId: 'p1', status: 'active', assignedTo: 'Bob', createdAt: new Date() },
              ];
              set({ tasks: result });
              break;
            case 'createTask':
              result = { ...data, id: `t${Date.now()}`, createdAt: new Date() };
              set((state) => ({ tasks: [...state.tasks, result] }));
              break;
            case 'updateTask':
              set((state) => ({
                tasks: state.tasks.map((t) => (t.id === data.id ? { ...t, ...data } : t)),
              }));
              result = data;
              break;
            case 'deleteTask':
              set((state) => ({ tasks: state.tasks.filter((t) => t.id !== data) }));
              result = { success: true };
              break;

            case 'fetchFiles':
              result = [
                { id: 'f1', name: 'proposal.pdf', size: '1.2MB', type: 'pdf', uploadedAt: new Date() },
                { id: 'f2', name: 'report.docx', size: '500KB', type: 'docx', uploadedAt: new Date() },
              ];
              set({ files: result });
              break;
            case 'uploadFile':
              result = { ...data, id: `f${Date.now()}`, uploadedAt: new Date() };
              set((state) => ({ files: [...state.files, result] }));
              break;
            case 'deleteFile':
              set((state) => ({ files: state.files.filter((f) => f.id !== data) }));
              result = { success: true };
              break;

            default:
              throw new Error('Unknown API action');
          }
          set({ loading: false });
          resolve(result);
        } catch (err) {
          set({ loading: false, error: err.message });
          useToastStore.getState().addToast(`API Error: ${err.message}`, 'error');
          resolve(null); // Resolve with null on error for consistent promise resolution
        }
      }, 500); // Simulate network delay
    });
  },
}));

// --- Reusable Components ---

// Toast Notifications
const Toast = () => {
  const { toasts } = useToastStore();

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const colorMap = {
    success: 'bg-green-100 border-green-400 text-green-800',
    error: 'bg-red-100 border-red-400 text-red-800',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    info: 'bg-blue-100 border-blue-400 text-blue-800',
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-2 p-4 rounded-lg shadow-lg border ${colorMap[toast.type]}`}
            role="alert"
          >
            {iconMap[toast.type]}
            <span>{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Modal Component
const Modal = () => {
  const { isOpen, content, title, closeModal } = useModalStore();
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeModal]);

  const handleBackdropClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      closeModal();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative transform transition-all duration-300 ease-out"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="modal-title" className="text-xl font-semibold text-gray-800">{title}</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="text-gray-700">
              {content}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Pages ---

// Dashboard Page
const DashboardPage = () => {
  const { addToast } = useToastStore();
  useEffect(() => {
    addToast('ダッシュボードへようこそ！', 'info');
  }, [addToast]);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">ダッシュボード</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">ユーザー概要</h3>
          <p className="text-gray-600">登録ユーザー数: 2名</p>
          <p className="text-gray-600">管理者数: 1名</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">プロジェクト進捗</h3>
          <p className="text-gray-600">進行中プロジェクト: 1件</p>
          <p className="text-gray-600">完了済みプロジェクト: 1件</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">タスク状況</h3>
          <p className="text-gray-600">未完了タスク: 1件</p>
          <p className="text-gray-600">完了済みタスク: 1件</p>
        </div>
      </div>
    </div>
  );
};

// User Management Page
const UsersPage = () => {
  const { users, loading, error, simulateApiCall } = useDataStore();
  const { openModal, closeModal } = useModalStore();
  const { addToast } = useToastStore();
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    simulateApiCall('fetchUsers');
  }, [simulateApiCall]);

  const handleCreateOrUpdateUser = async (userData) => {
    if (editingUser) {
      await simulateApiCall('updateUser', { ...editingUser, ...userData });
      addToast('ユーザーが更新されました', 'success');
    } else {
      await simulateApiCall('createUser', userData);
      addToast('ユーザーが作成されました', 'success');
    }
    closeModal();
    setEditingUser(null);
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('本当にこのユーザーを削除しますか？')) { // Using window.confirm for simplicity, custom modal for production
      await simulateApiCall('deleteUser', id);
      addToast('ユーザーが削除されました', 'success');
    }
  };

  const openUserModal = (user = null) => {
    setEditingUser(user);
    openModal(
      <UserForm onSubmit={handleCreateOrUpdateUser} initialData={user} />,
      user ? 'ユーザーを編集' : '新しいユーザーを作成'
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-600">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">エラー: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">ユーザー管理</h2>
      <button
        onClick={() => openUserModal()}
        className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 transition duration-200"
      >
        <Plus className="w-5 h-5" /> 新しいユーザーを作成
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メール</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役割</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openUserModal(user)}
                    className="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded-full hover:bg-blue-100 transition duration-150"
                    aria-label={`Edit ${user.name}`}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition duration-150"
                    aria-label={`Delete ${user.name}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UserForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    role: initialData.role || 'user',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' }); // Clear error on change
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.name) newErrors.name = '名前は必須です。';
    if (!formData.email) {
      newErrors.email = 'メールアドレスは必須です。';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください。';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">名前</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">役割</label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="user">ユーザー</option>
          <option value="admin">管理者</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
      >
        {initialData.id ? '更新' : '作成'}
      </button>
    </form>
  );
};

// Project Management Page
const ProjectsPage = () => {
  const { projects, loading, error, simulateApiCall } = useDataStore();
  const { openModal, closeModal } = useModalStore();
  const { addToast } = useToastStore();
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    simulateApiCall('fetchProjects');
  }, [simulateApiCall]);

  const handleCreateOrUpdateProject = async (projectData) => {
    if (editingProject) {
      await simulateApiCall('updateProject', { ...editingProject, ...projectData });
      addToast('プロジェクトが更新されました', 'success');
    } else {
      await simulateApiCall('createProject', projectData);
      addToast('プロジェクトが作成されました', 'success');
    }
    closeModal();
    setEditingProject(null);
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('本当にこのプロジェクトを削除しますか？')) {
      await simulateApiCall('deleteProject', id);
      addToast('プロジェクトが削除されました', 'success');
    }
  };

  const openProjectModal = (project = null) => {
    setEditingProject(project);
    openModal(
      <ProjectForm onSubmit={handleCreateOrUpdateProject} initialData={project} />,
      project ? 'プロジェクトを編集' : '新しいプロジェクトを作成'
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-600">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">エラー: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">プロジェクト管理</h2>
      <button
        onClick={() => openProjectModal()}
        className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 transition duration-200"
      >
        <Plus className="w-5 h-5" /> 新しいプロジェクトを作成
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">優先度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">進捗</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.priority}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="w-24 bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs">{project.progress}%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openProjectModal(project)}
                    className="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded-full hover:bg-blue-100 transition duration-150"
                    aria-label={`Edit ${project.title}`}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition duration-150"
                    aria-label={`Delete ${project.title}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProjectForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    status: initialData.status || 'active',
    priority: initialData.priority || 'medium',
    assignedTo: initialData.assignedTo || [],
    deadline: initialData.deadline ? initialData.deadline.toISOString().split('T')[0] : '', // Format for input type="date"
    progress: initialData.progress || 0,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleAssignedToChange = (e) => {
    const { options } = e.target;
    const value = Array.from(options).filter(option => option.selected).map(option => option.value);
    setFormData({ ...formData, assignedTo: value });
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.title) newErrors.title = 'タイトルは必須です。';
    if (!formData.deadline) newErrors.deadline = '期限は必須です。';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">タイトル</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
          aria-invalid={errors.title ? "true" : "false"}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {errors.title && <p id="title-error" className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">ステータス</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="active">アクティブ</option>
          <option value="completed">完了</option>
          <option value="archived">アーカイブ済み</option>
        </select>
      </div>
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">優先度</label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </div>
      <div>
        <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">担当者 (複数選択可)</label>
        <select
          id="assignedTo"
          name="assignedTo"
          multiple
          value={formData.assignedTo}
          onChange={handleAssignedToChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 h-24"
        >
          {/* Mock users for assignment */}
          <option value="Alice">Alice</option>
          <option value="Bob">Bob</option>
          <option value="Charlie">Charlie</option>
        </select>
      </div>
      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">期限</label>
        <input
          type="date"
          id="deadline"
          name="deadline"
          value={formData.deadline}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.deadline ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
          aria-invalid={errors.deadline ? "true" : "false"}
          aria-describedby={errors.deadline ? "deadline-error" : undefined}
        />
        {errors.deadline && <p id="deadline-error" className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
      </div>
      <div>
        <label htmlFor="progress" className="block text-sm font-medium text-gray-700">進捗 (%)</label>
        <input
          type="range"
          id="progress"
          name="progress"
          min="0"
          max="100"
          value={formData.progress}
          onChange={handleChange}
          className="mt-1 block w-full"
        />
        <span className="text-sm text-gray-600">{formData.progress}%</span>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
      >
        {initialData.id ? '更新' : '作成'}
      </button>
    </form>
  );
};

// Task Management Page
const TasksPage = () => {
  const { tasks, projects, loading, error, simulateApiCall } = useDataStore();
  const { openModal, closeModal } = useModalStore();
  const { addToast } = useToastStore();
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    simulateApiCall('fetchTasks');
    simulateApiCall('fetchProjects'); // To get project titles for dropdown
  }, [simulateApiCall]);

  const handleCreateOrUpdateTask = async (taskData) => {
    if (editingTask) {
      await simulateApiCall('updateTask', { ...editingTask, ...taskData });
      addToast('タスクが更新されました', 'success');
    } else {
      await simulateApiCall('createTask', taskData);
      addToast('タスクが作成されました', 'success');
    }
    closeModal();
    setEditingTask(null);
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('本当にこのタスクを削除しますか？')) {
      await simulateApiCall('deleteTask', id);
      addToast('タスクが削除されました', 'success');
    }
  };

  const openTaskModal = (task = null) => {
    setEditingTask(task);
    openModal(
      <TaskForm onSubmit={handleCreateOrUpdateTask} initialData={task} projects={projects} />,
      task ? 'タスクを編集' : '新しいタスクを作成'
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-600">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">エラー: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">タスク管理</h2>
      <button
        onClick={() => openTaskModal()}
        className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 transition duration-200"
      >
        <Plus className="w-5 h-5" /> 新しいタスクを作成
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイトル</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">プロジェクト</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {projects.find(p => p.id === task.projectId)?.title || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.assignedTo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openTaskModal(task)}
                    className="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded-full hover:bg-blue-100 transition duration-150"
                    aria-label={`Edit ${task.title}`}
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition duration-150"
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TaskForm = ({ onSubmit, initialData = {}, projects = [] }) => {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    projectId: initialData.projectId || (projects.length > 0 ? projects[0].id : ''),
    status: initialData.status || 'active',
    assignedTo: initialData.assignedTo || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.title) newErrors.title = 'タイトルは必須です。';
    if (!formData.projectId) newErrors.projectId = 'プロジェクトは必須です。';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700">タイトル</label>
        <input
          type="text"
          id="taskTitle"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
          aria-invalid={errors.title ? "true" : "false"}
          aria-describedby={errors.title ? "taskTitle-error" : undefined}
        />
        {errors.title && <p id="taskTitle-error" className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">プロジェクト</label>
        <select
          id="projectId"
          name="projectId"
          value={formData.projectId}
          onChange={handleChange}
          className={`mt-1 block w-full border ${errors.projectId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
          aria-invalid={errors.projectId ? "true" : "false"}
          aria-describedby={errors.projectId ? "projectId-error" : undefined}
        >
          <option value="">プロジェクトを選択...</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.title}</option>
          ))}
        </select>
        {errors.projectId && <p id="projectId-error" className="text-red-500 text-xs mt-1">{errors.projectId}</p>}
      </div>
      <div>
        <label htmlFor="taskStatus" className="block text-sm font-medium text-gray-700">ステータス</label>
        <select
          id="taskStatus"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="active">アクティブ</option>
          <option value="completed">完了</option>
          <option value="pending">保留中</option>
        </select>
      </div>
      <div>
        <label htmlFor="assignedToTask" className="block text-sm font-medium text-gray-700">担当者</label>
        <input
          type="text"
          id="assignedToTask"
          name="assignedTo"
          value={formData.assignedTo}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
      >
        {initialData.id ? '更新' : '作成'}
      </button>
    </form>
  );
};

// File Management Page
const FilesPage = () => {
  const { files, loading, error, simulateApiCall } = useDataStore();
  const { addToast } = useToastStore();
  const fileInputRef = useRef(null);

  useEffect(() => {
    simulateApiCall('fetchFiles');
  }, [simulateApiCall]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Simulate file upload
      await simulateApiCall('uploadFile', {
        name: file.name,
        size: `${(file.size / 1024).toFixed(2)}KB`, // Convert bytes to KB
        type: file.type.split('/')[1] || 'unknown',
      });
      addToast('ファイルがアップロードされました', 'success');
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear input
    }
  };

  const handleFileDownload = (file) => {
    addToast(`"${file.name}" をダウンロード中...`, 'info');
    // Simulate download by opening a blob URL or a dummy link
    const dummyBlob = new Blob(['This is dummy content for ', file.name], { type: 'text/plain' });
    const url = URL.createObjectURL(dummyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`"${file.name}" がダウンロードされました`, 'success');
  };

  const handleDeleteFile = async (id, name) => {
    if (window.confirm(`本当にファイル "${name}" を削除しますか？`)) {
      await simulateApiCall('deleteFile', id);
      addToast(`ファイル "${name}" が削除されました`, 'success');
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-600">読み込み中...</div>;
  if (error) return <div className="p-6 text-center text-red-600">エラー: {error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">ファイル管理</h2>
      <div className="mb-6 flex items-center gap-4">
        <label htmlFor="file-upload" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 cursor-pointer transition duration-200">
          <Upload className="w-5 h-5" /> ファイルをアップロード
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          ref={fileInputRef}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ファイル名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サイズ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アップロード日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{file.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.size}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(file.uploadedAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleFileDownload(file)}
                    className="text-green-600 hover:text-green-900 mr-3 p-1 rounded-full hover:bg-green-100 transition duration-150"
                    aria-label={`Download ${file.name}`}
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id, file.name)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition duration-150"
                    aria-label={`Delete ${file.name}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Hooks Test System Page
const HooksTestPage = () => {
  const { addToast } = useToastStore();
  const [testResults, setTestResults] = useState([]);
  const [customHookCode, setCustomHookCode] = useState('');
  const [customHookResult, setCustomHookResult] = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const essentialHooks = [
    '🔸 ⚠️ エラー処理_h',
    '🔸 ⏳ 読込管理_h',
    '🔸 💬 応答表示_h',
    '🔸 ✅ 状態管理_h',
    '🔸 🔄 データ同期_h',
    '🔸 🔗 API連携_h',
    '🔸 🔒 認証制御_h',
    '🔸 ⚙️ 設定管理_h',
    '🔸 📊 ロギング_h',
    '🔸 📁 ファイル操作_h',
    '🔸 🔔 通知システム_h',
    '🔸 🎨 UIコンポーネント_h',
    '🔸 📈 パフォーマンス監視_h',
  ];

  const simulateHookExecution = async (hookName) => {
    setLoadingTest(true);
    addToast(`"${hookName}" のテストを開始します...`, 'info');
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate
        const result = {
          hook: hookName,
          status: success ? '成功' : '失敗',
          message: success ? '正常に動作しました。' : 'エラーが発生しました。詳細はログを確認してください。',
          timestamp: new Date().toLocaleString(),
        };
        addToast(`"${hookName}" のテストが ${result.status} しました。`, result.status === '成功' ? 'success' : 'error');
        setLoadingTest(false);
        resolve(result);
      }, 1500); // Simulate test duration
    });
  };

  const handleTestEssentialHooks = async () => {
    setTestResults([]);
    for (const hook of essentialHooks) {
      const result = await simulateHookExecution(hook);
      setTestResults((prev) => [...prev, result]);
    }
  };

  const handleTestUniversalHooks = async () => {
    setTestResults([]);
    addToast('190種類の汎用Hooksのテストを開始します。これは時間がかかる場合があります...', 'warning');
    // Simulate testing 190 hooks
    for (let i = 1; i <= 5; i++) { // Simulate testing a few for demo
      const hookName = `汎用Hooks_${i}`;
      const result = await simulateHookExecution(hookName);
      setTestResults((prev) => [...prev, result]);
    }
    addToast('汎用Hooksのテストが完了しました。', 'success');
  };

  const handleTestCustomHook = async () => {
    if (!customHookCode.trim()) {
      addToast('カスタムHooksのコードを入力してください。', 'error');
      return;
    }
    setLoadingTest(true);
    addToast('カスタムHooksのテストを開始します...', 'info');
    try {
      // In a real app, this would send code to backend for execution in a sandbox
      // For demo, we'll just simulate success/failure
      const success = Math.random() > 0.3; // 70% success rate
      const result = {
        status: success ? '成功' : '失敗',
        output: success ? 'カスタムHooksが正常に実行されました。' : 'カスタムHooksの実行中にエラーが発生しました。',
        error: success ? null : 'TypeError: Cannot read property of undefined',
        timestamp: new Date().toLocaleString(),
      };
      setCustomHookResult(result);
      addToast(`カスタムHooksのテストが ${result.status} しました。`, result.status === '成功' ? 'success' : 'error');
    } catch (e) {
      setCustomHookResult({
        status: '失敗',
        output: `コードの解析中にエラーが発生しました: ${e.message}`,
        error: e.message,
        timestamp: new Date().toLocaleString(),
      });
      addToast('カスタムHooksのテスト中にエラーが発生しました。', 'error');
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Hooksテストシステム</h2>

      {loadingTest && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-800 rounded-lg flex items-center gap-2">
          <Info className="w-5 h-5 animate-pulse" />
          <span>テスト実行中...しばらくお待ちください。</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 必須Hooksテスト */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">13個の必須Hooks動作テスト</h3>
          <p className="text-gray-600 mb-4">CAIDSシステムの中核をなす必須Hooksの動作を確認します。</p>
          <button
            onClick={handleTestEssentialHooks}
            disabled={loadingTest}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Code className="w-5 h-5" /> 必須Hooksテストを実行
          </button>
        </div>

        {/* 汎用Hooksテスト */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">190種類の汎用Hooksテスト</h3>
          <p className="text-gray-600 mb-4">幅広い用途に対応する汎用Hooksの動作を確認します。</p>
          <button
            onClick={handleTestUniversalHooks}
            disabled={loadingTest}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Code className="w-5 h-5" /> 汎用Hooksテストを実行
          </button>
        </div>
      </div>

      {/* カスタムHooksテスト */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">専用Hooks動的生成・テスト</h3>
        <p className="text-gray-600 mb-4">独自のHooksコードを入力して、その動作をテストします。</p>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm resize-y font-mono text-sm mb-4 focus:ring-blue-500 focus:border-blue-500"
          rows="10"
          placeholder={`// 例: カスタムHooksコード
function useCustomHook(value) {
  const [state, setState] = useState(value);
  useEffect(() => {
    console.log('Hook initialized with:', state);
  }, []);
  return state;
}`}
          value={customHookCode}
          onChange={(e) => setCustomHookCode(e.target.value)}
          aria-label="Custom Hook Code"
        ></textarea>
        <button
          onClick={handleTestCustomHook}
          disabled={loadingTest}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Code className="w-5 h-5" /> カスタムHooksテストを実行
        </button>

        {customHookResult && (
          <div className={`mt-4 p-4 rounded-lg ${customHookResult.status === '成功' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800'}`}>
            <h4 className="font-semibold mb-2">カスタムHooksテスト結果: {customHookResult.status}</h4>
            <p className="text-sm">出力: {customHookResult.output}</p>
            {customHookResult.error && <p className="text-sm text-red-600">エラー: {customHookResult.error}</p>}
            <p className="text-xs text-gray-600 mt-1">テスト日時: {customHookResult.timestamp}</p>
          </div>
        )}
      </div>

      {/* テスト結果表示 */}
      {testResults.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">テスト結果</h3>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${result.status === '成功' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
              >
                <p className="font-semibold text-gray-800">{result.hook}</p>
                <p className={`text-sm ${result.status === '成功' ? 'text-green-700' : 'text-red-700'}`}>
                  ステータス: {result.status}
                </p>
                <p className="text-sm text-gray-600">メッセージ: {result.message}</p>
                <p className="text-xs text-gray-500">日時: {result.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Login/Register Page
const AuthPage = ({ type, onAuthSuccess }) => {
  const { addToast } = useToastStore();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: type === 'register' ? '' : undefined, // Name only for register
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = 'メールアドレスは必須です。';
    if (!formData.password) newErrors.password = 'パスワードは必須です。';
    if (type === 'register' && !formData.name) newErrors.name = '名前は必須です。';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (formData.email === 'test@example.com' && formData.password === 'password123') {
        login({ email: formData.email, name: type === 'register' ? formData.name : 'Test User' });
        addToast(`${type === 'login' ? 'ログイン' : '登録'}に成功しました！`, 'success');
        onAuthSuccess();
      } else if (type === 'register' && formData.email === 'new@example.com') {
        login({ email: formData.email, name: formData.name });
        addToast('新規登録に成功しました！', 'success');
        onAuthSuccess();
      }
      else {
        throw new Error('無効な資格情報です。');
      }
    } catch (err) {
      addToast(`エラー: ${err.message}`, 'error');
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {type === 'login' ? 'ログイン' : '新規登録'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'register' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">名前</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`mt-1 block w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
                disabled={loading}
              />
              {errors.name && <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 block w-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={loading}
            />
            {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">パスワード</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`mt-1 block w-full border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500`}
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "password-error" : undefined}
              disabled={loading}
            />
            {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          {errors.general && <p className="text-red-500 text-sm text-center">{errors.general}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading && <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>}
            {type === 'login' ? 'ログイン' : '登録'}
          </button>
        </form>
        <div className="mt-6 text-center">
          {type === 'login' ? (
            <p className="text-sm text-gray-600">
              アカウントをお持ちではありませんか？{' '}
              <button onClick={() => window.history.pushState({}, '', '/register')} className="text-blue-600 hover:underline focus:outline-none">
                新規登録
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              すでにアカウントをお持ちですか？{' '}
              <button onClick={() => window.history.pushState({}, '', '/login')} className="text-blue-600 hover:underline focus:outline-none">
                ログイン
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


// --- Main App Component ---
function App() {
  const { isLoggedIn, user, logout } = useAuthStore();
  const { addToast } = useToastStore();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Simple client-side routing
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1);
      setCurrentPage(path || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    handlePopState(); // Set initial page
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (page) => {
    window.history.pushState({}, '', `/${page === 'dashboard' ? '' : page}`);
    setCurrentPage(page);
    setIsSidebarOpen(false); // Close sidebar on navigation
  };

  const handleLogout = () => {
    logout();
    addToast('ログアウトしました。', 'info');
    navigate('login');
  };

  const renderPage = () => {
    if (!isLoggedIn) {
      // Show login/register page based on path
      if (currentPage === 'register') {
        return <AuthPage type="register" onAuthSuccess={() => navigate('dashboard')} />;
      }
      return <AuthPage type="login" onAuthSuccess={() => navigate('dashboard')} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'users':
        return <UsersPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'tasks':
        return <TasksPage />;
      case 'files':
        return <FilesPage />;
      case 'hooks-test':
        return <HooksTestPage />;
      default:
        return <DashboardPage />; // Fallback
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-inter">
      {/* Sidebar */}
      {isLoggedIn && (
        <>
          <aside className={`fixed inset-y-0 left-0 w-64 bg-gray-800 text-white p-4 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-blue-400">CAIDS</h1>
              <button
                className="md:hidden text-gray-400 hover:text-white focus:outline-none"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav>
              <ul>
                <li className="mb-2">
                  <button
                    onClick={() => navigate('dashboard')}
                    className={`flex items-center w-full py-2 px-3 rounded-lg text-left transition duration-150 ${currentPage === 'dashboard' ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}
                  >
                    <Home className="w-5 h-5 mr-3" /> ダッシュボード
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => navigate('users')}
                    className={`flex items-center w-full py-2 px-3 rounded-lg text-left transition duration-150 ${currentPage === 'users' ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}
                  >
                    <Users className="w-5 h-5 mr-3" /> ユーザー管理
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => navigate('projects')}
                    className={`flex items-center w-full py-2 px-3 rounded-lg text-left transition duration-150 ${currentPage === 'projects' ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}
                  >
                    <Folder className="w-5 h-5 mr-3" /> プロジェクト管理
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => navigate('tasks')}
                    className={`flex items-center w-full py-2 px-3 rounded-lg text-left transition duration-150 ${currentPage === 'tasks' ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}
                  >
                    <ClipboardList className="w-5 h-5 mr-3" /> タスク管理
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => navigate('files')}
                    className={`flex items-center w-full py-2 px-3 rounded-lg text-left transition duration-150 ${currentPage === 'files' ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}
                  >
                    <File className="w-5 h-5 mr-3" /> ファイル管理
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => navigate('hooks-test')}
                    className={`flex items-center w-full py-2 px-3 rounded-lg text-left transition duration-150 ${currentPage === 'hooks-test' ? 'bg-gray-700 text-blue-300' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}
                  >
                    <Code className="w-5 h-5 mr-3" /> Hooksテスト
                  </button>
                </li>
              </ul>
            </nav>
            <div className="absolute bottom-4 left-4 right-4">
              {user && (
                <div className="text-sm text-gray-400 mb-2">
                  Logged in as: <span className="font-semibold text-white">{user.name || user.email}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center justify-center gap-2 transition duration-200"
              >
                <LogOut className="w-5 h-5" /> ログアウト
              </button>
            </div>
          </aside>
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
          )}
        </>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${isLoggedIn ? 'md:ml-64' : ''}`}>
        {isLoggedIn && (
          <header className="bg-white shadow-sm p-4 flex items-center justify-between md:justify-end sticky top-0 z-20">
            <button
              className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">こんにちは、{user?.name || user?.email || 'ゲスト'}さん！</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 hidden md:flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" /> ログアウト
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto">
          {renderPage()}
        </div>

        <footer className="bg-gray-800 text-white p-4 text-center text-sm">
          &copy; 2025 CAIDS System. All rights reserved.
        </footer>
      </main>

      {/* Global Components */}
      <Toast />
      <Modal />
    </div>
  );
}

export default App;
