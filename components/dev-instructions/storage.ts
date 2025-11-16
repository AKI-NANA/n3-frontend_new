// 開発指示書のローカルストレージ管理

import { DevInstruction } from './types';

const STORAGE_KEY = 'dev_instructions';

export const instructionStorage = {
  // 全指示書を取得
  getAll(): DevInstruction[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const instructions = JSON.parse(data);
    // 既存データの互換性のため、codeSnippetsがpriorityがない場合は追加
    return instructions.map((inst: any) => ({
      ...inst,
      priority: inst.priority || '中',
      codeSnippets: inst.codeSnippets || [],
    }));
  },

  // 指示書を保存
  save(instructions: DevInstruction[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instructions));
  },

  // 新規指示書を追加
  add(instruction: Omit<DevInstruction, 'id' | 'createdAt' | 'updatedAt'>): DevInstruction {
    const instructions = this.getAll();
    const newInstruction: DevInstruction = {
      ...instruction,
      id: Date.now().toString(),
      priority: instruction.priority || '中',
      codeSnippets: instruction.codeSnippets || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    instructions.push(newInstruction);
    this.save(instructions);
    return newInstruction;
  },

  // 指示書を更新
  update(id: string, updates: Partial<DevInstruction>): void {
    const instructions = this.getAll();
    const index = instructions.findIndex(inst => inst.id === id);
    if (index !== -1) {
      instructions[index] = {
        ...instructions[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.save(instructions);
    }
  },

  // 指示書を削除
  delete(id: string): void {
    const instructions = this.getAll();
    const filtered = instructions.filter(inst => inst.id !== id);
    this.save(filtered);
  },

  // IDで指示書を取得
  getById(id: string): DevInstruction | undefined {
    return this.getAll().find(inst => inst.id === id);
  },
};
