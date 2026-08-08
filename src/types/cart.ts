export interface CartItem {
  id: string;
  sku: string;
  quantity: number;
  size?: string;
  variant?: string;
  name?: string;
  price?: number;
  imageUrl?: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}
