export interface Item {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  category: string;
  price: number;
  unit: string;
  supplier?: string;
  location?: string;
  notes?: string;
  last_updated: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  item_id?: string;
  action: 'added' | 'updated' | 'deleted' | 'quantity_adjusted';
  description: string;
  changes?: Record<string, any>;
  timestamp: string;
  created_at: string;
}