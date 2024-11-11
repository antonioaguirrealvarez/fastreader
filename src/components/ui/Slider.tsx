import React from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  darkMode?: boolean;
  trackClassName?: string;
  barClassName?: string;
}

export function Slider({ 
  value, 
  onChange, 
  darkMode,
  trackClassName = darkMode ? 'bg-gray-700' : 'bg-gray-200',
  barClassName = darkMode ? 'bg-blue-600 group-hover:bg-blue-500' : 'bg-blue-600 group-hover:bg-blue-700',
}: SliderProps) {
  return (
    <div className="relative w-full h-1 rounded-full overflow-hidden group cursor-pointer">
      <div className={`absolute inset-0 ${trackClassName}`} />
      <div
        className={`absolute inset-y-0 left-0 transition-colors ${barClassName}`}
        style={{ width: `${value}%` }}
      />
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
  );
}