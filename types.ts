
export enum AppPhase {
  RESTAURANT_SELECTION,
  DRINK_SHOP_SELECTION,
  ORDERING,
  SUMMARY,
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface Topping {
  name: string;
  price: number;
}

export interface Store {
  id: number;
  name: string;
  type: 'restaurant' | 'drink_shop';
  menu: MenuCategory[];
  toppings?: Topping[];
}

export interface OrderItem extends MenuItem {
  instanceId: string; // To uniquely identify each item in the order
  storeType: 'restaurant' | 'drink_shop';
  sweetness?: number; // 0-10
  ice?: number; // 0-10
  toppings?: string[];
  customRequest?: string;
}


export interface TeamMember {
  id: string;
  name: string;
}

export interface MemberOrder {
  memberId: string;
  items: OrderItem[];
}

// Represents the entire shared state of an ordering session, stored in Firestore.
export interface SessionData {
  phase: AppPhase;
  teamMembers: TeamMember[];
  orders: MemberOrder[];
  selectedRestaurantId: number | null;
  selectedDrinkShopId: number | null;
  deadline: string | null; // ISO 8601 string format for Firestore compatibility
  isDeadlineReached: boolean;
  orderId: string; // Unique identifier for this order session
  orderDate: string; // ISO 8601 string format for the order date
  createdAt: string; // ISO 8601 string format for when the session was created
}

// Represents a completed order for historical purposes
export interface HistoricalOrder {
  orderId: string;
  orderDate: string;
  createdAt: string;
  completedAt: string;
  teamMembers: TeamMember[];
  orders: MemberOrder[];
  selectedRestaurantId: number | null;
  selectedDrinkShopId: number | null;
  totalAmount: number;
  restaurantName?: string;
  drinkShopName?: string;
}
