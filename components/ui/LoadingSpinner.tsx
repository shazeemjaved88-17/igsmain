// components/ui/LoadingSpinner.tsx
// Reusable loading spinner and skeleton components
'use client';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`${sizes[size]} rounded-full animate-spin`}
        style={{
          borderColor: 'var(--border)',
          borderTopColor: 'var(--primary)',
        }}
      />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
          style={{
            borderWidth: '3px',
            borderStyle: 'solid',
            borderColor: 'var(--border)',
            borderTopColor: 'var(--primary)',
          }}
        />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
      <div className="skeleton" style={{ width: '30%', height: '1rem' }} />
      <div className="skeleton" style={{ width: '20%', height: '1rem' }} />
      <div className="skeleton" style={{ width: '25%', height: '1rem' }} />
      <div className="skeleton" style={{ width: '15%', height: '1rem' }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-container">
      <div className="p-4" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-4">
          <div className="skeleton" style={{ width: '30%', height: '0.875rem' }} />
          <div className="skeleton" style={{ width: '20%', height: '0.875rem' }} />
          <div className="skeleton" style={{ width: '25%', height: '0.875rem' }} />
          <div className="skeleton" style={{ width: '15%', height: '0.875rem' }} />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-6">
          <div className="skeleton mb-3" style={{ width: '60%', height: '0.75rem' }} />
          <div className="skeleton mb-2" style={{ width: '40%', height: '1.5rem' }} />
          <div className="skeleton" style={{ width: '80%', height: '0.625rem' }} />
        </div>
      ))}
    </div>
  );
}
