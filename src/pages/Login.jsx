import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';
import { Car, Mail, Lock, User, Zap, Shield, BarChart3 } from 'lucide-react';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab]       = useState('login');
  const [role, setRole]     = useState('organizer');
  const [loading, setLoading] = useState(false);
  const [form, setForm]     = useState({ email: '', password: '', fullName: '' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('Welcome back!');
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error('Please enter your name'); return; }
    setLoading(true);
    const { error, requiresEmailConfirmation } = await signUp(form.email, form.password, form.fullName, role);
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (requiresEmailConfirmation) {
      toast.success('Check your email to confirm your account, then sign in.');
    } else {
      toast.success('Account created! You can now sign in.');
    }
    setTab('login');
    setLoading(false);
  };

  const features = [
    { icon: <Zap size={14} />,      text: 'Instant guest travel coordination' },
    { icon: <Shield size={14} />,   text: 'Role-based access for organizers & agents' },
    { icon: <BarChart3 size={14} />, text: 'Real-time booking status & exports' },
  ];

  return (
    <div className="auth-page">
      {/* ── Left decorative panel ── */}
      <div className="auth-panel-left">
        <div className="auth-left-badge">
          <Car size={13} />
          Event Travel Management
        </div>

        <h1 className="auth-left-heading">
          Coordinate travel,<br />
          <span className="gradient-text">effortlessly.</span>
        </h1>

        <p className="auth-left-sub">
          One platform for organizers to manage guest arrivals and travel agents to assign
          drivers — all in real time.
        </p>

        <div className="auth-features">
          {features.map((f, i) => (
            <div className="auth-feature-item" key={i}>
              <div className="auth-feature-dot" />
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ color: 'var(--primary-light)' }}>{f.icon}</span>
                {f.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-panel-right">
        <div className="auth-form-container">

          {/* Logo */}
          <div className="auth-logo-row">
            <div className="auth-logo-icon">
              <Car size={22} color="#fff" />
            </div>
            <div>
              <div className="auth-logo-name">EventTravel</div>
              <div className="auth-logo-tagline">Management System</div>
            </div>
          </div>

          {/* Title */}
          <div className="auth-form-title">
            {tab === 'login' ? 'Welcome back' : 'Create account'}
          </div>
          <div className="auth-form-sub">
            {tab === 'login'
              ? 'Sign in to access your dashboard'
              : 'Join to start managing event travel'}
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>
              Sign In
            </button>
            <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>
              Register
            </button>
          </div>

          {/* ── Sign In Form ── */}
          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="input-wrap">
                  <Mail size={15} className="input-icon" />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <Lock size={15} className="input-icon" />
                  <input
                    className="form-input"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="btn btn-primary btn-auth" type="submit" disabled={loading}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

          ) : (
            /* ── Register Form ── */
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrap">
                  <User size={15} className="input-icon" />
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Your full name"
                    value={form.fullName}
                    onChange={e => set('fullName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="input-wrap">
                  <Mail size={15} className="input-icon" />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <Lock size={15} className="input-icon" />
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">I am a…</label>
                <div className="role-select-grid">
                  <div
                    className={`role-option${role === 'organizer' ? ' selected' : ''}`}
                    onClick={() => setRole('organizer')}
                  >
                    <div className="role-icon">🎯</div>
                    <div className="role-name">Organizer</div>
                    <div className="role-desc">Manage events & guests</div>
                  </div>
                  <div
                    className={`role-option${role === 'agent' ? ' selected' : ''}`}
                    onClick={() => setRole('agent')}
                  >
                    <div className="role-icon">🚗</div>
                    <div className="role-name">Travel Agent</div>
                    <div className="role-desc">Assign drivers</div>
                  </div>
                </div>
              </div>

              <button className="btn btn-primary btn-auth" type="submit" disabled={loading}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Creating account…
                  </span>
                ) : 'Create Account'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 24 }}>
            {tab === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', font: 'inherit', fontSize: '0.75rem', fontWeight: 600 }}
            >
              {tab === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
