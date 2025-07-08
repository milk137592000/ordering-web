import '@testing-library/jest-dom';

// Mock Firebase services
const mockFirebaseServices = {
  db: {},
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((docRef, callback) => {
    // Simulate successful snapshot
    callback({
      exists: () => true,
      data: () => ({
        phase: 0,
        teamMembers: [],
        orders: [],
        selectedRestaurantId: null,
        selectedDrinkShopId: null,
        deadline: null,
        isDeadlineReached: false,
        orderId: 'test-order-id',
        orderDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    });
    // Return unsubscribe function
    return () => {};
  }),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ orderIds: [] })
  }))
};

// Mock window.firebaseServices
Object.defineProperty(window, 'firebaseServices', {
  value: mockFirebaseServices,
  writable: true
});

// Mock fetch for loading markdown files
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve(`
# 測試餐廳
## 主餐
- 牛肉麵 $120
- 雞肉飯 $80

# 測試飲料店
## 茶類
- 珍珠奶茶 $50
- 紅茶 $30
## 加料
- 珍珠 $10
- 椰果 $10
    `)
  })
);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Mock Date.now for consistent testing
const mockDateNow = 1640995200000; // 2022-01-01 00:00:00 UTC
Date.now = jest.fn(() => mockDateNow);

// Mock Math.random for consistent testing
Math.random = jest.fn(() => 0.5);
