import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { getProduct } from '../api/productApi';
import { useCart } from '../context/CartContext';
import { getProductImage } from '../utils/productImages';

const brandColors: Record<string, string> = {
  Nike: '#f5a623',
  Adidas: '#4a90d9',
  'New Balance': '#7ed321',
  Vans: '#e94560',
};

function ImagePlaceholder({ brand, name }: { brand: string; name: string }) {
  const bg = brandColors[brand] || '#cccccc';
  return (
    <div style={{ ...styles.image, background: `linear-gradient(135deg, ${bg}cc, ${bg}66)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', maxWidth: '500px' }}>
      <div style={{ fontSize: '4rem' }}>👟</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', textAlign: 'center', padding: '0 16px' }}>{name}</div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then(p => {
        setProduct(p);
        const sizes = p.sizesCsv.split(',');
        if (sizes.length > 0) setSelectedSize(sizes[0]);
      })
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!product || !selectedSize) return;
    addItem(product, selectedSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return <div style={styles.page}>Loading...</div>;
  if (error || !product) return <div style={styles.page}><p style={{ color: 'red' }}>{error}</p></div>;

  const sizes = product.sizesCsv.split(',').map(s => s.trim());

  return (
    <div style={styles.page}>
      <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>
      <div style={styles.container}>
        {getProductImage(product.name, product.imageUrl) ? (
          <img
            src={getProductImage(product.name, product.imageUrl)}
            alt={product.name}
            style={styles.image}
          />
        ) : (
          <ImagePlaceholder brand={product.brand} name={product.name} />
        )}
        <div style={styles.details}>
          <p style={styles.brand}>{product.brand}</p>
          <h1 style={styles.name}>{product.name}</h1>
          <p style={styles.price}>${product.price.toFixed(2)}</p>
          <p style={styles.description}>{product.description}</p>

          <div style={styles.stockInfo}>
            {product.stockQty > 0
              ? <span style={{ color: 'green' }}>{product.stockQty} in stock</span>
              : <span style={{ color: 'red' }}>Out of stock</span>}
          </div>

          <label style={styles.label}>
            Select Size:
            <select
              value={selectedSize}
              onChange={e => setSelectedSize(e.target.value)}
              style={styles.select}
            >
              {sizes.map(s => <option key={s} value={s}>US {s}</option>)}
            </select>
          </label>

          <button
            onClick={handleAddToCart}
            disabled={product.stockQty === 0}
            style={{
              ...styles.btn,
              background: added ? '#28a745' : product.stockQty === 0 ? '#ccc' : '#e94560',
              cursor: product.stockQty === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {added ? 'Added to Cart!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '24px 16px' },
  back: { background: 'none', border: 'none', cursor: 'pointer', color: '#e94560', fontSize: '1rem', marginBottom: '16px', padding: 0 },
  container: { display: 'flex', gap: '32px', flexWrap: 'wrap' },
  image: { width: '100%', maxWidth: '500px', aspectRatio: '4 / 5', borderRadius: '8px', objectFit: 'cover', display: 'block' },
  details: { flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '12px' },
  brand: { color: '#888', fontSize: '0.85rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' },
  name: { margin: 0, color: '#1a1a2e', fontSize: '1.6rem' },
  price: { margin: 0, color: '#e94560', fontSize: '1.4rem', fontWeight: 700 },
  description: { color: '#555', lineHeight: 1.6, margin: 0 },
  stockInfo: { fontSize: '0.9rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#555' },
  select: { padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' },
  btn: { color: '#fff', border: 'none', padding: '14px', borderRadius: '4px', fontSize: '1rem', marginTop: '8px', transition: 'background 0.2s' },
};
