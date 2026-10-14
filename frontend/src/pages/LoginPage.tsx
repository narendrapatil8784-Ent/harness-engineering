import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AxiosError } from 'axios';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<{ message: string }>;
      setError(ax.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Login</h1>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={styles.input} />
          </label>
          <label style={styles.label}>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={styles.input} />
          </label>
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={styles.footer}>
          Don't have an account? <Link to="/register" style={{ color: '#e94560' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '24px' },
  card: { background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
  heading: { color: '#1a1a2e', marginBottom: '24px', textAlign: 'center' },
  error: { background: '#fee', color: '#c33', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#555' },
  input: { padding: '10px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' },
  btn: { background: '#e94560', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, marginTop: '8px' },
  footer: { textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '0.9rem' },
};
