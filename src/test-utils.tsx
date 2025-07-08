import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppPhase, TeamMember, Store, MemberOrder, OrderItem, SessionData, HistoricalOrder } from '../types';

// Mock data generators
export const createMockTeamMember = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 'member-1',
  name: '測試成員',
  ...overrides,
});

export const createMockStore = (overrides: Partial<Store> = {}): Store => ({
  id: 1,
  name: '測試餐廳',
  type: 'restaurant',
  menu: [
    {
      name: '主餐',
      items: [
        { id: 101, name: '牛肉麵', price: 120 },
        { id: 102, name: '雞肉飯', price: 80 },
      ]
    }
  ],
  toppings: [],
  ...overrides,
});

export const createMockDrinkShop = (overrides: Partial<Store> = {}): Store => ({
  id: 2,
  name: '測試飲料店',
  type: 'drink_shop',
  menu: [
    {
      name: '茶類',
      items: [
        { id: 201, name: '珍珠奶茶', price: 50 },
        { id: 202, name: '紅茶', price: 30 },
      ]
    }
  ],
  toppings: [
    { name: '珍珠', price: 10 },
    { name: '椰果', price: 10 },
  ],
  ...overrides,
});

export const createMockOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 101,
  name: '牛肉麵',
  price: 120,
  instanceId: 'item-1640995200000-0.5',
  storeType: 'restaurant',
  ...overrides,
});

export const createMockMemberOrder = (overrides: Partial<MemberOrder> = {}): MemberOrder => ({
  memberId: 'member-1',
  items: [createMockOrderItem()],
  ...overrides,
});

export const createMockSessionData = (overrides: Partial<SessionData> = {}): SessionData => ({
  phase: AppPhase.RESTAURANT_SELECTION,
  teamMembers: [createMockTeamMember()],
  orders: [createMockMemberOrder()],
  selectedRestaurantId: null,
  selectedDrinkShopId: null,
  deadline: null,
  isDeadlineReached: false,
  orderId: 'test-order-id',
  orderDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createMockHistoricalOrder = (overrides: Partial<HistoricalOrder> = {}): HistoricalOrder => ({
  orderId: 'historical-order-1',
  orderDate: '2022-01-01T00:00:00.000Z',
  createdAt: '2022-01-01T00:00:00.000Z',
  completedAt: '2022-01-01T01:00:00.000Z',
  teamMembers: [createMockTeamMember()],
  orders: [createMockMemberOrder()],
  selectedRestaurantId: 1,
  selectedDrinkShopId: 2,
  totalAmount: 120,
  restaurantName: '測試餐廳',
  drinkShopName: '測試飲料店',
  ...overrides,
});

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add any custom options here
}

export const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => {
  return render(ui, {
    ...options,
  });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Test utilities for Firebase mocking
export const mockFirebaseSuccess = () => {
  const mockServices = window.firebaseServices;
  mockServices.onSnapshot.mockImplementation((docRef, callback) => {
    callback({
      exists: () => true,
      data: () => createMockSessionData()
    });
    return () => {};
  });
  mockServices.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ orderIds: ['order-1', 'order-2'] })
  });
};

export const mockFirebaseError = () => {
  const mockServices = window.firebaseServices;
  mockServices.onSnapshot.mockImplementation((docRef, callback, errorCallback) => {
    errorCallback(new Error('Firebase connection failed'));
    return () => {};
  });
  mockServices.getDoc.mockRejectedValue(new Error('Firebase read failed'));
};

export const mockFirebaseEmpty = () => {
  const mockServices = window.firebaseServices;
  mockServices.onSnapshot.mockImplementation((docRef, callback) => {
    callback({
      exists: () => false,
      data: () => null
    });
    return () => {};
  });
  mockServices.getDoc.mockResolvedValue({
    exists: () => false,
    data: () => null
  });
};
