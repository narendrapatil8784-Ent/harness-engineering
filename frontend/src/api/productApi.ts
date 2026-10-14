import api from './axiosInstance';
import { Product } from '../types';

export async function getProducts(brand?: string, size?: string): Promise<Product[]> {
  const params: Record<string, string> = {};
  if (brand) params.brand = brand;
  if (size) params.size = size;
  const { data } = await api.get<Product[]>('/products', { params });
  return data;
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

export async function createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
  const { data } = await api.post<Product>('/products', productData);
  return data;
}

export async function updateProduct(id: string, productData: Omit<Product, 'id'>): Promise<Product> {
  const { data } = await api.put<Product>(`/products/${id}`, productData);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}
