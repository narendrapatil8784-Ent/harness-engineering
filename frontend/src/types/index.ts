export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  imageUrl: string;
  sizesCsv: string;
  stockQty: number;
}

export interface User {
  email: string;
  isAdmin: boolean;
  token: string;
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

export interface OrderItemResponse {
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderResponse {
  id: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  paymentMode: string;
  createdAt: string;
  items: OrderItemResponse[];
}
