import { Sparkles } from 'lucide-react';
import { Switch } from './Switch';

interface ToggleProps {
  defaultEnabled?: boolean;
  onChange?: (enabled: boolean) => void;
  label?: string;
}

export function Toggle({ 
  defaultEnabled = false, 
  onChange,
  label = "Clean with AI"
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <Switch
        checked={defaultEnabled}
        onCheckedChange={onChange}
      />
    </div>
  );
} 