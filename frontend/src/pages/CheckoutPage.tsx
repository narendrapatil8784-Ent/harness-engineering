import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createOrder } from '../api/orderApi';
import { AxiosError } from 'axios';

type PaymentMode = 'CASH_ON_DELIVERY' | 'MOCK_UPI';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH_ON_DELIVERY');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (items.length === 0) {
    return (
      <div style={styles.page}>
        <p>Your cart is empty. <a href="/" style={{ color: '#e94560' }}>Shop now</a></p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const shippingAddress = `${fullName}, ${address}, ${city}, ${state} - ${pin}`;

    try {
      const order = await createOrder({
        items: items.map(i => ({ productId: i.product.id, size: i.size, quantity: i.quantity })),
        shippingAddress,
        paymentMode,
      });
      clearCart();
      navigate(`/order-confirmation/${order.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message: string }>;
      setError(ax.response?.data?.message || 'Order placement failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Checkout</h1>
      <div style={styles.layout}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={styles.subheading}>Shipping Address</h2>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>
            Full Name
            <input value={fullName} onChange={e => setFullName(e.target.value)} required style={styles.input} />
          </label>
          <label style={styles.label}>
            Address Line 1
            <input value={address} onChange={e => setAddress(e.target.value)} required style={styles.input} />
          </label>
          <div style={styles.row}>
            <label style={{ ...styles.label, flex: 1 }}>
              City
              <input value={city} onChange={e => setCity(e.target.value)} required style={styles.input} />
            </label>
            <label style={{ ...styles.label, flex: 1 }}>
              State
              <input value={state} onChange={e => setState(e.target.value)} required style={styles.input} />
            </label>
            <label style={{ ...styles.label, width: '120px' }}>
              PIN Code
              <input value={pin} onChange={e => setPin(e.target.value)} required style={styles.input} />
            </label>
          </div>

          <h2 style={styles.subheading}>Payment Method</h2>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input type="radio" value="CASH_ON_DELIVERY" checked={paymentMode === 'CASH_ON_DELIVERY'} onChange={() => setPaymentMode('CASH_ON_DELIVERY')} />
              Cash on Delivery
            </label>
            <label style={styles.radioLabel}>
              <input type="radio" value="MOCK_UPI" checked={paymentMode === 'MOCK_UPI'} onChange={() => setPaymentMode('MOCK_UPI')} />
              Mock UPI (always succeeds)
            </label>
          </div>

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Placing order...' : `Place Order – $${total.toFixed(2)}`}
          </button>
        </form>

        <div style={styles.summary}>
          <h2 style={styles.subheading}>Order Summary</h2>
          {items.map(item => (
            <div key={`${item.product.id}-${item.size}`} style={styles.summaryItem}>
              <span>{item.product.name} (US {item.size}) × {item.quantity}</span>
              <span>${(item.product.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={styles.summaryTotal}>
            <strong>Total</strong>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '24px 16px' },
  heading: { color: '#1a1a2e', marginBottom: '24px' },
  subheading: { color: '#1a1a2e', fontSize: '1.1rem', marginBottom: '16px' },
  layout: { display: 'flex', gap: '32px', flexWrap: 'wrap' },
  form: { flex: 2, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '14px' },
  error: { background: '#fee', color: '#c33', padding: '10px', borderRadius: '4px', fontSize: '0.9rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.9rem', color: '#555' },
  input: { padding: '10px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' },
  row: { display: 'flex', gap: '12px' },
  radioGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', cursor: 'pointer' },
  btn: { background: '#e94560', color: '#fff', border: 'none', padding: '14px', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, marginTop: '8px' },
  summary: { flex: 1, minWidth: '220px', background: '#f9f9f9', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', alignSelf: 'flex-start' },
  summaryItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#555' },
  summaryTotal: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '10px', color: '#1a1a2e' },
};
