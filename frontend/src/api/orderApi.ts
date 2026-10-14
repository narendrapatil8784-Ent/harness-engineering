import api from './axiosInstance';
import { OrderResponse } from '../types';

interface OrderItemPayload {
  productId: string;
  size: string;
  quantity: number;
}

interface OrderPayload {
  items: OrderItemPayload[];
  shippingAddress: string;
  paymentMode: 'CASH_ON_DELIVERY' | 'MOCK_UPI';
}

export async function createOrder(payload: OrderPayload): Promise<OrderResponse> {
  const { data } = await api.post<OrderResponse>('/orders', payload);
  return data;
}

export async function getMyOrders(): Promise<OrderResponse[]> {
  const { data } = await api.get<OrderResponse[]>('/orders/mine');
  return data;
}

export async function getOrder(id: string): Promise<OrderResponse> {
  const { data } = await api.get<OrderResponse>(`/orders/${id}`);
  return data;
}
