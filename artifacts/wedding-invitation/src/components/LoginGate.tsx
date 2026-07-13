import { useState, type ReactNode } from 'react';
import {
  api,
  setSession,
  clearSession,
  getSessionToken,
  getSessionUser,
  type SessionUser,
} from '@/lib/api';

const LOGIN_LABELS = {
  en: {
    username: 'Username',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    loginFailed: 'Login failed',
    wrongRole: (roles: string) => `This page is for ${roles} accounts.`,
  },
  ar: {
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول…',
    loginFailed: 'فشل تسجيل الدخول',
    wrongRole: (roles: string) => `هذه الصفحة مخصصة لحسابات ${roles} فقط.`,
  },
};

/**
 * Wraps staff pages (scanner, admin). Shows an elegant login form until a
 * session with one of the allowed roles exists.
 */
export default function LoginGate({
  roles,
  title,
  subtitle,
  lang = 'en',
  children,
}: {
  roles: SessionUser['role'][];
  title: string;
  subtitle: string;
  lang?: 'en' | 'ar';
  children: (user: SessionUser, logout: () => void) => ReactNode;
}) {
  const rtl = lang === 'ar';
  const labels = LOGIN_LABELS[lang];
  const [user, setUser] = useState<SessionUser | null>(() =>
    getSessionToken() ? getSessionUser() : null,
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const logout = () => {
    api.post('/auth/logout').catch(() => undefined);
    clearSession();
    setUser(null);
  };

  // "admin" role always passes role checks server-side; mirror that here.
  const allowed = user && (roles.includes(user.role) || user.role === 'admin');

  if (allowed) return <>{children(user, logout)}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ token: string; user: SessionUser }>(
        '/auth/login',
        { username: username.trim().toLowerCase(), password },
      );
      setSession(res.token, res.user);
      if (!roles.includes(res.user.role) && res.user.role !== 'admin') {
        setError(labels.wrongRole(roles.join('/')));
        clearSession();
        return;
      }
      setUser(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.loginFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full bg-[#F3E4E2] flex items-center justify-center p-6 font-serif"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-[#F9F3F3] border border-[#D48A96]/40 shadow-xl p-8 sm:p-10 relative"
      >
        <div className="absolute inset-2 border-[0.5px] border-[#D48A96]/30 pointer-events-none" />
        <p className="font-script text-4xl text-[#D48A96] text-center mb-1">M &amp; R</p>
        <h1 className="text-center text-lg text-[#45383C] tracking-wide mb-1">{title}</h1>
        <p className="text-center text-xs text-[#45383C]/60 mb-7">{subtitle}</p>

        <label className="block text-[10px] uppercase tracking-[0.2em] text-[#45383C]/60 mb-1.5">
          {labels.username}
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoComplete="username"
          className="w-full mb-4 px-4 py-3 bg-white/60 border border-[#D48A96]/40 text-[#45383C] focus:outline-none focus:border-[#B25A6C] text-sm"
        />
        <label className="block text-[10px] uppercase tracking-[0.2em] text-[#45383C]/60 mb-1.5">
          {labels.password}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full mb-5 px-4 py-3 bg-white/60 border border-[#D48A96]/40 text-[#45383C] focus:outline-none focus:border-[#B25A6C] text-sm"
        />
        {error && (
          <p className="text-sm text-red-700 mb-4 text-center">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? labels.signingIn : labels.signIn}
        </button>
      </form>
    </div>
  );
}
