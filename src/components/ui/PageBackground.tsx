import React from 'react';

interface PageBackgroundProps {
  children: React.ReactNode;
}

export function PageBackground({ children }: PageBackgroundProps) {
  return (
    <div className="min-h-screen bg-[#faf8f5]" style={{
      backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.07) 1px, transparent 0)`,
      backgroundSize: '24px 24px'
    }}>
      {children}
    </div>
  );
} 