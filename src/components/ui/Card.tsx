import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300',
      className
    )}>
      {children}
    </div>
  );
}