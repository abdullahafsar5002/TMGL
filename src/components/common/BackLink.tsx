import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackLinkProps {
  /** Where to go when there is no in-app history to return to. */
  fallbackTo?: string;
  label?: string;
  className?: string;
}

export function BackLink({ fallbackTo = '/', label = 'Back', className = '' }: BackLinkProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-tmgl-charcoal-600 transition-colors hover:text-tmgl-gold-700 ${className}`.trim()}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
