import React from 'react';

interface BannerProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  className?: string;
  onClose?: () => void;
}

export function Banner({ variant, title, className = '', onClose }: BannerProps) {
  return (
    <div className={`rounded-lg p-4 ${getVariantStyles(variant)} ${className}`}>
      <div className="flex items-center justify-between">
        <p className="font-medium">{title}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-current opacity-70 hover:opacity-100"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function getVariantStyles(variant: BannerProps['variant']) {
  switch (variant) {
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'info':
      return 'bg-blue-100 text-blue-800';
  }
}