// HTMLテンプレートエディタの型定義

export interface MultiLangTemplate {
  template_id: string
  name: string
  category: string
  languages: {
    [key: string]: {
      html_content: string
      updated_at: string
    }
  }
  created_at: string
  updated_at?: string
  language_count?: number
  version?: string
}

export interface StatusMessage {
  message: string
  type: 'info' | 'success' | 'error'
}

export interface Language {
  code: string
  name: string
  flag: string
  ebay: string
}

export interface Category {
  value: string
  label: string
}

export interface Variable {
  tag: string
  label: string
}
