import { useState, useEffect } from 'react';
import { Product } from '../types';
import { getProducts } from '../api/productApi';
import ProductCard from '../components/ProductCard';

const BRANDS = ['', 'Nike', 'Adidas', 'New Balance', 'Vans'];
const SIZES = ['', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getProducts(brand || undefined, size || undefined)
      .then(setProducts)
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, [brand, size]);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Sneaker Catalog</h1>

      <div style={styles.filters}>
        <label style={styles.label}>
          Brand:
          <select value={brand} onChange={e => setBrand(e.target.value)} style={styles.select}>
            {BRANDS.map(b => <option key={b} value={b}>{b || 'All'}</option>)}
          </select>
        </label>
        <label style={styles.label}>
          Size:
          <select value={size} onChange={e => setSize(e.target.value)} style={styles.select}>
            {SIZES.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </label>
      </div>

      {loading && <p>Loading products...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p>No products found for the selected filters.</p>
      )}

      <div style={styles.grid}>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' },
  heading: { color: '#1a1a2e', marginBottom: '20px' },
  filters: { display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: '#555' },
  select: { padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.95rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
};
