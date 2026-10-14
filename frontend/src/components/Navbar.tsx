import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>MyStreeT</Link>

      <div style={styles.links}>
        <Link to="/" style={styles.link}>Home</Link>

        <Link to="/cart" style={styles.link}>
          Cart {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
        </Link>

        {user?.isAdmin && (
          <Link to="/admin/products" style={styles.link}>Manage Products</Link>
        )}

        {user ? (
          <>
            <span style={styles.email}>{user.email}</span>
            <button onClick={handleLogout} style={styles.btn}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.link}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#1a1a2e',
    color: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    color: '#e94560',
    fontWeight: 700,
    fontSize: '1.4rem',
    textDecoration: 'none',
    letterSpacing: '1px',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  link: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  badge: {
    background: '#e94560',
    color: '#fff',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '0.75rem',
    marginLeft: '4px',
  },
  email: {
    color: '#aaa',
    fontSize: '0.85rem',
  },
  btn: {
    background: '#e94560',
    color: '#fff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};
