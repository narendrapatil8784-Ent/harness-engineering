import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { getProductImage } from '../utils/productImages';

interface Props {
  product: Product;
}

const brandColors: Record<string, string> = {
  Nike: '#f5a623',
  Adidas: '#4a90d9',
  'New Balance': '#7ed321',
  Vans: '#e94560',
};

function ImagePlaceholder({ brand, name }: { brand: string; name: string }) {
  const bg = brandColors[brand] || '#cccccc';
  return (
    <div style={{ ...styles.image, background: `linear-gradient(135deg, ${bg}cc, ${bg}66)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <div style={{ fontSize: '2.5rem' }}>👟</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', padding: '0 8px' }}>{name}</div>
    </div>
  );
}

export default function ProductCard({ product }: Props) {
  const navigate = useNavigate();
  const imageSrc = getProductImage(product.name, product.imageUrl);

  return (
    <div style={styles.card}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={product.name}
          style={styles.image}
        />
      ) : (
        <ImagePlaceholder brand={product.brand} name={product.name} />
      )}
      <div style={styles.body}>
        <p style={styles.brand}>{product.brand}</p>
        <h3 style={styles.name}>{product.name}</h3>
        <p style={styles.price}>${product.price.toFixed(2)}</p>
        <p style={styles.stock}>
          {product.stockQty > 0 ? `${product.stockQty} in stock` : 'Out of stock'}
        </p>
        <button
          style={styles.btn}
          onClick={() => navigate(`/products/${product.id}`)}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.2s',
  },
  image: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    display: 'block',
  },
  body: {
    padding: '16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  brand: {
    color: '#888',
    fontSize: '0.8rem',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  name: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a1a2e',
  },
  price: {
    margin: 0,
    fontWeight: 700,
    color: '#e94560',
    fontSize: '1.1rem',
  },
  stock: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#888',
  },
  btn: {
    marginTop: 'auto',
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    width: '100%',
  },
};
