import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { OrderResponse } from '../types';
import { getOrder } from '../api/orderApi';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .catch(() => setError('Could not load order details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={styles.page}>Loading order...</div>;
  if (error || !order) return <div style={styles.page}><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.checkmark}>✓</div>
      <h1 style={styles.heading}>Order Confirmed!</h1>
      <p style={styles.subtext}>Thank you for your purchase.</p>

      <div style={styles.card}>
        <div style={styles.row}>
          <span style={styles.label}>Order ID</span>
          <span style={styles.value}>{order.id}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Status</span>
          <span style={{ ...styles.value, ...styles.badge }}>{order.status}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Payment</span>
          <span style={styles.value}>{order.paymentMode.replace('_', ' ')}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Shipping To</span>
          <span style={styles.value}>{order.shippingAddress}</span>
        </div>

        <h2 style={styles.itemsHeading}>Items</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Product</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{item.productName}</td>
                <td style={styles.td}>US {item.size}</td>
                <td style={styles.td}>{item.quantity}</td>
                <td style={styles.td}>${item.unitPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.total}>
          Total: <strong>${order.totalAmount.toFixed(2)}</strong>
        </div>
      </div>

      <Link to="/" style={styles.link}>Continue Shopping</Link>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '700px', margin: '0 auto', padding: '40px 16px', textAlign: 'center' },
  checkmark: { fontSize: '4rem', color: '#28a745', marginBottom: '12px' },
  heading: { color: '#1a1a2e', marginBottom: '8px' },
  subtext: { color: '#666', marginBottom: '32px' },
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', textAlign: 'left', marginBottom: '24px' },
  row: { display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' },
  label: { color: '#888', fontSize: '0.85rem', width: '120px', flexShrink: 0 },
  value: { color: '#1a1a2e', fontSize: '0.95rem' },
  badge: { background: '#d4edda', color: '#155724', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem' },
  itemsHeading: { color: '#1a1a2e', fontSize: '1rem', margin: '20px 0 12px' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '16px' },
  th: { textAlign: 'left', padding: '8px', borderBottom: '2px solid #eee', color: '#555', fontSize: '0.85rem' },
  td: { padding: '8px', borderBottom: '1px solid #eee', fontSize: '0.9rem', color: '#333' },
  total: { textAlign: 'right', fontSize: '1.1rem', color: '#1a1a2e', paddingTop: '12px' },
  link: { color: '#e94560', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' },
};
