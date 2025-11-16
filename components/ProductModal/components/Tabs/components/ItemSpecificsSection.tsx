'use client';

import { FormField } from './FormField';
import type { CategoryMapping } from '@/app/tools/editing/config/ebayItemSpecificsMapping';

export interface ItemSpecificsSectionProps {
  categoryMapping: CategoryMapping;
  formData: Record<string, string>;
  autoFilledFields: Set<string>;
  onChange: (field: string, value: string) => void;
}

export function ItemSpecificsSection({
  categoryMapping,
  formData,
  autoFilledFields,
  onChange
}: ItemSpecificsSectionProps) {
  
  return (
    <div>
      {/* 必須項目 */}
      {categoryMapping.requiredFields.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            padding: '0.5rem 0.75rem',
            background: '#fff5f5',
            borderLeft: '3px solid #dc3545',
            marginBottom: '1rem'
          }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '0.9rem', 
              fontWeight: 600,
              color: '#dc3545',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-exclamation-circle"></i>
              必須項目
            </h4>
          </div>
          
          {categoryMapping.requiredFields.map(field => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name] || ''}
              isAutoFilled={autoFilledFields.has(field.name)}
              onChange={(value) => onChange(field.name, value)}
            />
          ))}
        </div>
      )}

      {/* 推奨項目 */}
      {categoryMapping.recommendedFields.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            padding: '0.5rem 0.75rem',
            background: '#f0f7ff',
            borderLeft: '3px solid #0064d2',
            marginBottom: '1rem'
          }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '0.9rem', 
              fontWeight: 600,
              color: '#0064d2',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-star"></i>
              推奨項目
            </h4>
          </div>
          
          {categoryMapping.recommendedFields.map(field => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name] || ''}
              isAutoFilled={autoFilledFields.has(field.name)}
              onChange={(value) => onChange(field.name, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
