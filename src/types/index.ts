export type ProductCategory =
  | 'batteries'
  | 'chargers'
  | 'power-supplies'
  | 'adapters'
  | 'bms-boards';

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  image: string;
  images: string[];
  price: string;
  availability: string;
  specs: string[];
  description: string;
  whatsappText: string;
  stockStatus: string;
  safetyNote: string;
  featured?: boolean;
  /** Units on hand, set from the admin panel. Undefined means not tracked. */
  stockQty?: number;
}

/** Admin-editable fields stored outside the generated catalog. */
export interface ProductOverride {
  price?: number;
  stock?: number;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  color: string;
  tags: string[];
}

export interface BatteryCalculatorInput {
  voltage: number;
  loadCurrent: number;
  backupTime: number;
  chemistry: string;
}

export interface BatteryCalculatorResult {
  requiredCapacityAh: number;
  explanation: string;
  tips: string[];
}
