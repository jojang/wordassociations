'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  darkMode: boolean;
  onClose: () => void;
}

type View = 'login' | 'signup';

export default function AuthModal({ darkMode, onClose }: AuthModalProps) {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (view !== 'signup' || username.trim().length < 2) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', username.trim())
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, view]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';
  const inputClass = `w-full px-4 py-2 rounded-lg border text-sm outline-none ${
    darkMode
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
      : 'bg-gray-50 border-gray-200 text-black placeholder-gray-400'
  }`;

  const switchView = (v: View) => {
    setView(v);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setLoginUsername('');
  };

  const handleEmailAuth = async () => {
    setError('');

    if (view === 'signup') {
      if (!username.trim()) { setError('Username is required'); return; }
      if (usernameStatus === 'taken') { setError('Username is already taken'); return; }
      if (usernameStatus === 'checking') { setError('Still checking username availability'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    }

    setLoading(true);
    try {
      if (view === 'login') {
        const { data: resolvedEmail } = await supabase.rpc('get_email_by_username', { p_username: loginUsername });
        if (!resolvedEmail) throw new Error('Username not found');
        const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase
            .from('profiles')
            .upsert({ id: data.user.id, display_name: username.trim() });
        }
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${bg} rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        {/* Tabs */}
        <div className={`relative flex rounded-full p-1 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {/* Sliding pill */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-in-out ${darkMode ? 'bg-white' : 'bg-black'}`}
            style={{ transform: view === 'signup' ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }}
          />
          <button
            onClick={() => switchView('login')}
            className={`relative flex-1 py-1.5 rounded-full text-xs tracking-widest transition-colors duration-300 ${view === 'login' ? (darkMode ? 'text-black' : 'text-white') : 'text-gray-400'}`}
            style={{ fontFamily: 'NeueHelvetica' }}
          >
            SIGN IN
          </button>
          <button
            onClick={() => switchView('signup')}
            className={`relative flex-1 py-1.5 rounded-full text-xs tracking-widest transition-colors duration-300 ${view === 'signup' ? (darkMode ? 'text-black' : 'text-white') : 'text-gray-400'}`}
            style={{ fontFamily: 'NeueHelvetica' }}
          >
            SIGN UP
          </button>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className={`w-full py-2 rounded-full border text-sm tracking-widest mb-4 transition-all hover:scale-105 active:scale-95 ${
            darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
          }`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          CONTINUE WITH GOOGLE
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-1 h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <span className="text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>OR</span>
          <div className={`flex-1 h-px ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-4">
          {view === 'login' ? (
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className={inputClass}
              style={{ fontFamily: 'NeueHelvetica' }}
            />
          ) : (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              style={{ fontFamily: 'NeueHelvetica' }}
            />
          )}
          {view === 'signup' && (
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                style={{ fontFamily: 'NeueHelvetica' }}
              />
              {usernameStatus !== 'idle' && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                  usernameStatus === 'available' ? 'text-green-500' :
                  usernameStatus === 'taken' ? 'text-red-500' : 'text-gray-400'
                }`} style={{ fontFamily: 'NeueHelvetica' }}>
                  {usernameStatus === 'checking' ? '...' : usernameStatus === 'available' ? '✓' : '✗'}
                </span>
              )}
            </div>
          )}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
              className={inputClass}
              style={{ fontFamily: 'NeueHelvetica' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {view === 'signup' && (
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                className={inputClass}
                style={{ fontFamily: 'NeueHelvetica' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-xs mb-3" style={{ fontFamily: 'NeueHelvetica' }}>{error}</p>
        )}

        <button
          onClick={handleEmailAuth}
          disabled={loading}
          className={`w-full py-2 rounded-full text-sm tracking-widest mb-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
            darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-700'
          }`}
          style={{ fontFamily: 'NeueHelvetica' }}
        >
          {loading ? '...' : view === 'login' ? 'SIGN IN' : 'SIGN UP'}
        </button>

        <div className="flex justify-center text-xs text-gray-400" style={{ fontFamily: 'NeueHelvetica' }}>
          <button onClick={onClose} className="hover:opacity-60 transition-opacity">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
