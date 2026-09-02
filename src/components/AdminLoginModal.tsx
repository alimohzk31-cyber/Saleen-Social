import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminLoginModal({ onClose, onSuccess }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '199444') {
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm border rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden animate-in fade-in zoom-in duration-200 relative bg-[var(--surface-elevated)] border-[var(--border)]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
        >
          <X className="w-5 h-5" />
        </button>
        
        <form onSubmit={handleSubmit} className="p-6 pt-12">
          <div className="space-y-2 text-center">
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className={`w-full border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--focus-ring)] transition-all font-bold ${error ? 'border-red-500' : 'border-[var(--input-border)]'} bg-[var(--input-bg)] text-[var(--text-primary)]`}
              placeholder="••••••"
              maxLength={6}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm font-bold">{t('incorrect_pin')}</p>}
          </div>
          
          <button
            type="submit"
            className="w-full app-btn-accent font-bold py-3 rounded-xl mt-6 shadow-[0_0_15px_var(--glow)]"
          >
            {t('login')}
          </button>
        </form>
      </div>
    </div>
  );
}