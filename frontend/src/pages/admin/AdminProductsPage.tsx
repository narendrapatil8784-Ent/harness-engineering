import { useState, useEffect, FormEvent } from 'react';
import { Product } from '../../types';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../api/productApi';

interface ProductForm {
  name: string;
  brand: string;
  description: string;
  price: string;
  imageUrl: string;
  sizesCsv: string;
  stockQty: string;
}

const emptyForm: ProductForm = { name: '', brand: '', description: '', price: '', imageUrl: '', sizesCsv: '', stockQty: '0' };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    setLoading(true);
    getProducts()
      .then(setProducts)
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => { setForm(emptyForm); setEditId(null); setShowForm(false); setError(''); };

  const handleEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name, brand: p.brand, description: p.description || '',
      price: String(p.price), imageUrl: p.imageUrl || '',
      sizesCsv: p.sizesCsv || '', stockQty: String(p.stockQty),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      setSuccess(`"${name}" deleted.`);
      load();
    } catch {
      setError('Failed to delete product.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name, brand: form.brand, description: form.description,
      price: parseFloat(form.price), imageUrl: form.imageUrl,
      sizesCsv: form.sizesCsv, stockQty: parseInt(form.stockQty),
    } as Omit<Product, 'id'>;

    try {
      if (editId) {
        await updateProduct(editId, payload);
        setSuccess('Product updated.');
      } else {
        await createProduct(payload);
        setSuccess('Product created.');
      }
      resetForm();
      load();
    } catch {
      setError('Save failed. Check all fields.');
    }
  };

  const field = (key: keyof ProductForm, label: string, type = 'text') => (
    <label style={styles.label}>
      {label}
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={['name', 'brand', 'price'].includes(key)}
        style={styles.input}
      />
    </label>
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Manage Products</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={styles.addBtn}>+ Add Product</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.successMsg}>{success}</div>}

      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.subheading}>{editId ? 'Edit Product' : 'New Product'}</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            {field('name', 'Name')}
            {field('brand', 'Brand')}
            {field('description', 'Description')}
            {field('price', 'Price', 'number')}
            {field('imageUrl', 'Image URL')}
            {field('sizesCsv', 'Sizes (CSV, e.g. 7,8,9,10)')}
            {field('stockQty', 'Stock Qty', 'number')}
            <div style={styles.formActions}>
              <button type="submit" style={styles.saveBtn}>{editId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Brand</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Stock</th>
              <th style={styles.th}>Sizes</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}>{p.name}</td>
                <td style={styles.td}>{p.brand}</td>
                <td style={styles.td}>${p.price.toFixed(2)}</td>
                <td style={styles.td}>{p.stockQty}</td>
                <td style={styles.td}>{p.sizesCsv}</td>
                <td style={styles.td}>
                  <button onClick={() => handleEdit(p)} style={styles.editBtn}>Edit</button>
                  <button onClick={() => handleDelete(p.id, p.name)} style={styles.deleteBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  heading: { color: '#1a1a2e', margin: 0 },
  addBtn: { background: '#1a1a2e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' },
  error: { background: '#fee', color: '#c33', padding: '10px', borderRadius: '4px', marginBottom: '16px' },
  successMsg: { background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '16px' },
  formCard: { background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', padding: '24px', marginBottom: '24px' },
  subheading: { margin: '0 0 16px', color: '#1a1a2e' },
  form: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  label: { display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.85rem', color: '#555' },
  input: { padding: '8px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.95rem' },
  formActions: { gridColumn: '1 / -1', display: 'flex', gap: '12px' },
  saveBtn: { background: '#e94560', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { background: '#eee', color: '#333', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #eee', color: '#555', fontSize: '0.85rem' },
  td: { padding: '10px 8px', borderBottom: '1px solid #eee', fontSize: '0.9rem' },
  tr: { background: '#fff' },
  editBtn: { background: '#1a1a2e', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.85rem' },
  deleteBtn: { background: 'none', border: '1px solid #e94560', color: '#e94560', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
};
