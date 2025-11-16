'use client';

import type { ItemSpecificField } from '@/app/tools/editing/config/ebayItemSpecificsMapping';

export interface FormFieldProps {
  field: ItemSpecificField;
  value: string;
  isAutoFilled: boolean;
  onChange: (value: string) => void;
}

export function FormField({ field, value, isAutoFilled, onChange }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{
        fontSize: '0.85rem',
        fontWeight: field.required ? 600 : 500,
        color: field.required ? '#dc3545' : '#495057',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.3rem'
      }}>
        {field.label}
        {field.required && <span style={{ color: '#dc3545' }}>*</span>}
        {isAutoFilled && (
          <span style={{ color: '#28a745', fontSize: '0.75rem', fontWeight: 'normal' }}>
            ✓ 自動
          </span>
        )}
      </label>
      
      {field.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.4rem',
            fontSize: '0.85rem',
            border: `1px solid ${field.required && !value ? '#dc3545' : '#ced4da'}`,
            borderRadius: '4px',
            backgroundColor: isAutoFilled ? '#e7f3ff' : 'white'
          }}
        >
          <option value="">選択してください</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={{
            width: '100%',
            padding: '0.4rem',
            fontSize: '0.85rem',
            border: `1px solid ${field.required && !value ? '#dc3545' : '#ced4da'}`,
            borderRadius: '4px',
            backgroundColor: isAutoFilled ? '#e7f3ff' : 'white'
          }}
        />
      )}
      
      {field.description && (
        <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.2rem' }}>
          {field.description}
        </div>
      )}
    </div>
  );
}
