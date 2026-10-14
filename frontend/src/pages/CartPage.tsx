import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProductImage } from '../utils/productImages';

export default function CartPage() {
  const { items, updateQuantity, removeItem, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div style={styles.page}>
        <h1 style={styles.heading}>Your Cart</h1>
        <p style={{ color: '#666' }}>Your cart is empty. <a href="/" style={{ color: '#e94560' }}>Continue shopping</a></p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Your Cart</h1>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Product</th>
            <th style={styles.th}>Size</th>
            <th style={styles.th}>Price</th>
            <th style={styles.th}>Qty</th>
            <th style={styles.th}>Subtotal</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={`${item.product.id}-${item.size}`} style={styles.row}>
              <td style={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={getProductImage(item.product.name, item.product.imageUrl)}
                    alt={item.product.name}
                    style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                    <div style={{ color: '#888', fontSize: '0.8rem' }}>{item.product.brand}</div>
                  </div>
                </div>
              </td>
              <td style={styles.td}>US {item.size}</td>
              <td style={styles.td}>${item.product.price.toFixed(2)}</td>
              <td style={styles.td}>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => updateQuantity(item.product.id, item.size, parseInt(e.target.value))}
                  style={styles.qtyInput}
                />
              </td>
              <td style={styles.td}>${(item.product.price * item.quantity).toFixed(2)}</td>
              <td style={styles.td}>
                <button
                  onClick={() => removeItem(item.product.id, item.size)}
                  style={styles.removeBtn}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.summary}>
        <div style={styles.total}>Total: <strong>${total.toFixed(2)}</strong></div>
        <button onClick={handleCheckout} style={styles.checkoutBtn}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '24px 16px' },
  heading: { color: '#1a1a2e', marginBottom: '20px' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '24px' },
  th: { textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #eee', color: '#555', fontSize: '0.85rem' },
  td: { padding: '12px 8px', borderBottom: '1px solid #eee', verticalAlign: 'middle' },
  row: { background: '#fff' },
  qtyInput: { width: '60px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' },
  removeBtn: { background: 'none', border: '1px solid #e94560', color: '#e94560', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
  summary: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px' },
  total: { fontSize: '1.2rem', color: '#1a1a2e' },
  checkoutBtn: { background: '#e94560', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 },
};
