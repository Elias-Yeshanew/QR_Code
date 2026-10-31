import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  Check, 
  Eye, 
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { useAdminAuth } from '../db/useAdminAuth';
import { db } from '../db/inMemoryDb';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { login } = useAdminAuth();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const verified = await login(pin);
      if (verified) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setPin('');
          onSuccess();
          onClose();
        }, 600);
      } else {
        setError('Incorrect Admin Password / PIN. Please try again.');
      }
    } catch {
      setError('Connection error verifying PIN. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };


  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Admin Authentication Modal"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-[#0f172a] border border-blue-500/30 p-6 sm:p-7 shadow-2xl text-gray-100 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close Admin Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            Admin Access
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Only the card owner/admin can edit this business card and links.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Admin unlocked successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
              <span>Admin PIN / Password</span>
              <span className="text-[10px] text-gray-400 font-normal">
                {db.verifyAdminPin('admin123') ? 'Default: admin123' : 'Custom password active'}
              </span>
            </label>

            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type={showPin ? 'text' : 'password'}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm text-white placeholder-gray-500 outline-none transition-all font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="p-1.5 text-gray-400 hover:text-white absolute right-2.5 transition-colors cursor-pointer"
                title={showPin ? 'Hide password' : 'Show password'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSuccess || isVerifying}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying PIN...' : isSuccess ? 'Unlocked!' : 'Unlock Admin Mode'}</span>
          </button>

        </form>
      </div>
    </div>
  );
};
