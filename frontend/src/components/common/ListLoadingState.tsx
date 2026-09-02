import React from 'react';
import { Loader2 } from 'lucide-react';

interface ListLoadingStateProps {
  rows?: number;
  message?: string;
}

export const ListLoadingState: React.FC<ListLoadingStateProps> = ({
  rows = 5,
  message = 'Loading records...'
}) => {
  return (
    <div style={{ width: '100%', margin: '16px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '24px 0',
          color: '#2563eb',
          fontSize: '13.5px',
          fontWeight: 700
        }}
      >
        <Loader2 size={20} className="spinner" />
        <span>{message}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            style={{
              height: '48px',
              backgroundColor: 'var(--bg-main, #f1f5f9)',
              borderRadius: '10px',
              animation: 'pulse 1.5s infinite ease-in-out',
              opacity: 0.6
            }}
          />
        ))}
      </div>
    </div>
  );
};
