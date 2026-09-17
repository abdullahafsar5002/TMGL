import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label={message}>
      <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
      <span className="ml-2 text-sm text-tmgl-charcoal-500">{message}</span>
    </div>
  );
}
