import { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import {
  signUp,
  signIn,
  confirmSignUp,
  resendConfirmationCode,
} from '../services/auth';
import { useAppStore } from '../store';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

type AuthView = 'login' | 'signup' | 'verify';

export function AuthModal({ isOpen, onClose, isDark }: AuthModalProps) {
  // const { t } = useTranslation();
  const { setUser } = useAppStore();

  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await signIn(email, password);
      setUser({
        userId: user.userId,
        displayName: user.displayName,
        isGuest: false,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signUp(email, password, displayName);
      setPendingEmail(email);
      setPendingUsername(result.user.getUsername());
      setView('verify');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp(pendingEmail, verificationCode, pendingUsername);
      // Auto-login after verification
      const user = await signIn(pendingEmail, password);
      setUser({
        userId: user.userId,
        displayName: user.displayName,
        isGuest: false,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);

    try {
      await resendConfirmationCode(pendingEmail);
      setError('Verification code sent!');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl transform animate-scaleIn ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          ✕
        </button>

        {/* Login View */}
        {view === 'login' && (
          <div>
            <h2
              className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Welcome Back!
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                  required
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setView('signup')}
                className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
              >
                Don't have an account? Sign up
              </button>
            </div>
          </div>
        )}

        {/* Signup View */}
        {view === 'signup' && (
          <div>
            <h2
              className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Create Account
            </h2>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                  required
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                  required
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                  minLength={8}
                  required
                />
                <p
                  className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Min 8 characters, uppercase, lowercase, and number
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setView('login')}
                className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}

        {/* Verification View */}
        {view === 'verify' && (
          <div>
            <h2
              className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Verify Email
            </h2>

            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              We sent a verification code to <strong>{pendingEmail}</strong>
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-center text-2xl tracking-widest ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                  required
                />
              </div>

              {error && (
                <div
                  className={`p-3 rounded-xl border text-sm ${
                    error.includes('sent')
                      ? 'bg-green-500/10 border-green-500/20 text-green-500'
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={handleResendCode}
                disabled={loading}
                className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline disabled:opacity-50`}
              >
                Resend code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
