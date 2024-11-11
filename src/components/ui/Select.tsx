import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  darkMode?: boolean;
}

export function Select({ value, onValueChange, options, darkMode }: SelectProps) {
  const darkModeClasses = darkMode ? {
    select: 'bg-gray-800 border-gray-700 text-gray-100',
    focus: 'focus:ring-blue-500 focus:border-blue-500',
    icon: 'text-gray-400',
  } : {
    select: 'bg-white border-gray-200 text-gray-900',
    focus: 'focus:ring-blue-500 focus:border-transparent',
    icon: 'text-gray-400',
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`appearance-none border rounded-md py-1 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 transition-colors ${darkModeClasses.select} ${darkModeClasses.focus}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 ${darkModeClasses.icon} pointer-events-none`} />
    </div>
  );
}