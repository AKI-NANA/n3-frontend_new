// Supabase用の開発指示書ストレージ

import { createClient } from '@supabase/supabase-js';
import { DevInstruction } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabaseクライアントの初期化（環境変数がない場合はnull）
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('⚠️ Supabase not configured. Only local storage will be used.');
}

export const supabaseInstructionStorage = {
  // 全指示書を取得
  async getAll(): Promise<DevInstruction[]> {
    if (!supabase) {
      console.log('📦 Supabase not available, returning empty array');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('dev_instructions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        images: item.images || [],
        codeSnippets: item.code_snippets || [],
        relatedFiles: item.related_files || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      console.error('Supabase getAll error:', error);
      return [];
    }
  },

  // 指示書を保存（新規または更新）
  async save(instruction: DevInstruction): Promise<boolean> {
    try {
      const dbData = {
        id: instruction.id,
        title: instruction.title,
        category: instruction.category,
        status: instruction.status,
        priority: instruction.priority,
        description: instruction.description,
        memo: instruction.memo,
        images: instruction.images,
        code_snippets: instruction.codeSnippets,
        related_files: instruction.relatedFiles,
        created_at: instruction.createdAt,
        updated_at: instruction.updatedAt,
      };

      const { error } = await supabase
        .from('dev_instructions')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase save error:', error);
      return false;
    }
  },

  // 複数の指示書を一括保存
  async saveAll(instructions: DevInstruction[]): Promise<boolean> {
    try {
      const dbData = instructions.map(instruction => ({
        id: instruction.id,
        title: instruction.title,
        category: instruction.category,
        status: instruction.status,
        priority: instruction.priority,
        description: instruction.description,
        memo: instruction.memo,
        images: instruction.images,
        code_snippets: instruction.codeSnippets,
        related_files: instruction.relatedFiles,
        created_at: instruction.createdAt,
        updated_at: instruction.updatedAt,
      }));

      const { error } = await supabase
        .from('dev_instructions')
        .upsert(dbData, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase saveAll error:', error);
      return false;
    }
  },

  // 指示書を削除
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('dev_instructions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
  },

  // IDで指示書を取得
  async getById(id: string): Promise<DevInstruction | null> {
    try {
      const { data, error } = await supabase
        .from('dev_instructions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        images: data.images || [],
        codeSnippets: data.code_snippets || [],
        relatedFiles: data.related_files || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Supabase getById error:', error);
      return null;
    }
  },
};
