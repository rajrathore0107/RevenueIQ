import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await loginUser(form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>RevenueIQ</div>
        <p style={s.sub}>Sign in to your account</p>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={s.form}>
          <input style={s.input} type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} required />
          <input style={s.input} type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} required />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={s.switch}>Don't have an account? <Link to="/register" style={s.link}>Register</Link></p>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' },
  card: { background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '420px' },
  logo: { fontSize: '28px', fontWeight: '700', color: '#6366f1', fontFamily: 'Space Grotesk', marginBottom: '8px', textAlign: 'center' },
  sub: { color: '#64748b', fontSize: '14px', textAlign: 'center', marginBottom: '32px' },
  error: { background: '#3d1a1a', border: '1px solid #f87171', color: '#f87171', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  input: { background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '12px 16px', color: '#e2e8f0', fontSize: '14px', outline: 'none' },
  btn: { background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '15px', fontWeight: '600' },
  switch: { textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748b' },
  link: { color: '#6366f1', fontWeight: '500' },
};