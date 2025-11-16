// ローカルストレージとSupabaseの統合ストレージ（自動同期）

import { DevInstruction } from './types';
import { instructionStorage as localStorage } from './storage';
import { supabaseInstructionStorage as supabaseStorage } from './supabase-storage';

let isSyncing = false;

export const syncedInstructionStorage = {
  // 全指示書を取得（Supabaseを優先し、失敗時はローカルストレージ）
  async getAll(): Promise<DevInstruction[]> {
    try {
      // Supabaseから取得を試行
      const supabaseData = await supabaseStorage.getAll();
      
      if (supabaseData.length > 0) {
        // Supabaseのデータをローカルストレージにも保存
        localStorage.save(supabaseData);
        console.log('✅ Loaded from Supabase:', supabaseData.length, 'items');
        return supabaseData;
      }
      
      // Supabaseにデータがない場合はローカルストレージから取得
      const localData = localStorage.getAll();
      console.log('📦 Loaded from Local Storage:', localData.length, 'items');
      
      // ローカルにデータがあればSupabaseにも同期
      if (localData.length > 0) {
        this.syncToSupabase(localData);
      }
      
      return localData;
    } catch (error) {
      console.error('❌ Error loading data:', error);
      // エラー時はローカルストレージから取得
      return localStorage.getAll();
    }
  },

  // 指示書を追加（両方に保存）
  async add(instruction: Omit<DevInstruction, 'id' | 'createdAt' | 'updatedAt'>): Promise<DevInstruction> {
    // まずローカルストレージに追加
    const newInstruction = localStorage.add(instruction);
    
    // Supabaseにも保存（非同期）
    this.syncToSupabase([newInstruction]);
    
    return newInstruction;
  },

  // 指示書を更新（両方に保存）
  async update(id: string, updates: Partial<DevInstruction>): Promise<void> {
    // ローカルストレージを更新
    localStorage.update(id, updates);
    
    // 更新後のデータを取得
    const updated = localStorage.getById(id);
    
    if (updated) {
      // Supabaseにも保存（非同期）
      this.syncToSupabase([updated]);
    }
  },

  // 指示書を削除（両方から削除）
  async delete(id: string): Promise<void> {
    // ローカルストレージから削除
    localStorage.delete(id);
    
    // Supabaseからも削除（非同期）
    supabaseStorage.delete(id).catch(error => {
      console.error('❌ Supabase delete error:', error);
    });
  },

  // IDで指示書を取得
  getById(id: string): DevInstruction | undefined {
    return localStorage.getById(id);
  },

  // Supabaseに同期（バックグラウンド）
  async syncToSupabase(instructions: DevInstruction[]): Promise<void> {
    if (isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    isSyncing = true;
    
    try {
      const success = await supabaseStorage.saveAll(instructions);
      if (success) {
        console.log('✅ Synced to Supabase:', instructions.length, 'items');
      } else {
        console.warn('⚠️ Supabase sync failed, data saved locally');
      }
    } catch (error) {
      console.error('❌ Supabase sync error:', error);
    } finally {
      isSyncing = false;
    }
  },

  // 手動で全データを同期
  async syncAll(): Promise<boolean> {
    try {
      const localData = localStorage.getAll();
      const success = await supabaseStorage.saveAll(localData);
      
      if (success) {
        console.log('✅ Full sync completed:', localData.length, 'items');
        return true;
      }
      
      console.warn('⚠️ Full sync failed');
      return false;
    } catch (error) {
      console.error('❌ Full sync error:', error);
      return false;
    }
  },

  // Supabaseからローカルストレージに同期（ダウンロード）
  async syncFromSupabase(): Promise<boolean> {
    try {
      const supabaseData = await supabaseStorage.getAll();
      localStorage.save(supabaseData);
      console.log('⬇️ Downloaded from Supabase:', supabaseData.length, 'items');
      return true;
    } catch (error) {
      console.error('❌ Download from Supabase error:', error);
      return false;
    }
  },
};
