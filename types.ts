
export enum AppPhase {
  IDENTITY_SELECTION,
  SETUP, // 管理員設定截止時間和店家
  ADMIN_ORDERING, // 管理員為團隊點餐
  RESTAURANT_SELECTION, // 選擇餐廳
  DRINK_SHOP_SELECTION, // 選擇飲料店
  ORDERING, // 點餐階段
  RESTAURANT_ORDERING,
  DRINK_ORDERING,
  MEMBER_ORDERING, // 非管理員統一點餐介面
  PERSONAL_SUMMARY,
  SUMMARY, // 訂單總覽
  ADMIN_MANAGEMENT,
}

export enum UserRole {
  ADMIN = 'admin', // 第一個點餐的人，可以設定截止時間和收單
  MEMBER = 'member', // 一般成員，只能點自己的餐
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
  customizations?: string; // 客製化描述文字
  // 新增字段以支持管理員點餐界面
  type?: 'restaurant' | 'drink';
  quantity?: number;
  storeId?: number;
  storeName?: string;
}


export interface TeamMember {
  id: string;
  name: string;
}

export interface MemberOrder {
  memberId: string;
  items: OrderItem[];
}

// 個人用戶狀態
export interface UserSession {
  userId: string;
  userName: string;
  role: UserRole;
  currentPhase: AppPhase;
  orderId: string | null; // 加入的訂單ID
  personalOrder: OrderItem[]; // 個人訂單
}

// 共享的訂單會話狀態
export interface SessionData {
  orderId: string; // 唯一訂單識別碼
  adminId: string; // 管理員（創建者）ID
  adminName: string; // 管理員名稱
  phase: AppPhase; // 當前階段
  teamMembers: TeamMember[]; // 團隊成員列表
  orders: MemberOrder[]; // 所有成員的訂單
  selectedRestaurantId: number | null;
  selectedDrinkShopId: number | null;
  deadline: string | null; // ISO 8601 string format for Firestore compatibility
  isDeadlineReached: boolean;
  isOrderClosed: boolean; // 管理員是否已經收單
  orderDate: string; // ISO 8601 string format for the order date
  createdAt: string; // ISO 8601 string format for when the session was created
  completedAt?: string; // 訂單完成時間
  // 所有成員的訂單（用於管理員查看）
  memberOrders: { [userId: string]: { userName: string; items: OrderItem[] } };
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
