import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

type BannerVariant = 'success' | 'error' | 'warning' | 'info';

interface BannerProps {
  variant: BannerVariant;
  title: string;
  message: string;
  className?: string;
}

const variantStyles: Record<BannerVariant, { bg: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50 border-green-200',
    icon: <CheckCircle className="h-5 w-5 text-green-500" />
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: <XCircle className="h-5 w-5 text-red-500" />
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: <AlertCircle className="h-5 w-5 text-yellow-500" />
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: <Info className="h-5 w-5 text-blue-500" />
  }
};

export function Banner({ variant, title, message, className }: BannerProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      'rounded-lg border p-4',
      styles.bg,
      className
    )}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}