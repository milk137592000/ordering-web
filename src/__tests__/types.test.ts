import {
  AppPhase,
  MenuItem,
  MenuCategory,
  Topping,
  Store,
  OrderItem,
  TeamMember,
  MemberOrder,
  SessionData,
  HistoricalOrder
} from '../../types';

describe('Type definitions', () => {
  describe('AppPhase enum', () => {
    it('should have correct phase values', () => {
      expect(AppPhase.RESTAURANT_SELECTION).toBe(0);
      expect(AppPhase.DRINK_SHOP_SELECTION).toBe(1);
      expect(AppPhase.ORDERING).toBe(2);
      expect(AppPhase.SUMMARY).toBe(3);
    });
  });

  describe('MenuItem interface', () => {
    it('should create valid MenuItem object', () => {
      const menuItem: MenuItem = {
        id: 101,
        name: '牛肉麵',
        price: 120
      };

      expect(menuItem.id).toBe(101);
      expect(menuItem.name).toBe('牛肉麵');
      expect(menuItem.price).toBe(120);
    });
  });

  describe('MenuCategory interface', () => {
    it('should create valid MenuCategory object', () => {
      const category: MenuCategory = {
        name: '主餐',
        items: [
          { id: 101, name: '牛肉麵', price: 120 },
          { id: 102, name: '雞肉飯', price: 80 }
        ]
      };

      expect(category.name).toBe('主餐');
      expect(category.items).toHaveLength(2);
      expect(category.items[0].name).toBe('牛肉麵');
    });
  });

  describe('Topping interface', () => {
    it('should create valid Topping object', () => {
      const topping: Topping = {
        name: '珍珠',
        price: 10
      };

      expect(topping.name).toBe('珍珠');
      expect(topping.price).toBe(10);
    });
  });

  describe('Store interface', () => {
    it('should create valid restaurant Store object', () => {
      const store: Store = {
        id: 1,
        name: '測試餐廳',
        type: 'restaurant',
        menu: [
          {
            name: '主餐',
            items: [{ id: 101, name: '牛肉麵', price: 120 }]
          }
        ],
        toppings: []
      };

      expect(store.id).toBe(1);
      expect(store.name).toBe('測試餐廳');
      expect(store.type).toBe('restaurant');
      expect(store.menu).toHaveLength(1);
      expect(store.toppings).toHaveLength(0);
    });

    it('should create valid drink shop Store object', () => {
      const store: Store = {
        id: 2,
        name: '測試飲料店',
        type: 'drink_shop',
        menu: [
          {
            name: '茶類',
            items: [{ id: 201, name: '珍珠奶茶', price: 50 }]
          }
        ],
        toppings: [
          { name: '珍珠', price: 10 }
        ]
      };

      expect(store.type).toBe('drink_shop');
      expect(store.toppings).toHaveLength(1);
      expect(store.toppings![0].name).toBe('珍珠');
    });
  });

  describe('OrderItem interface', () => {
    it('should create valid restaurant OrderItem', () => {
      const orderItem: OrderItem = {
        id: 101,
        name: '牛肉麵',
        price: 120,
        instanceId: 'item-123',
        storeType: 'restaurant'
      };

      expect(orderItem.instanceId).toBe('item-123');
      expect(orderItem.storeType).toBe('restaurant');
      expect(orderItem.sweetness).toBeUndefined();
      expect(orderItem.ice).toBeUndefined();
      expect(orderItem.toppings).toBeUndefined();
    });

    it('should create valid drink OrderItem with customizations', () => {
      const orderItem: OrderItem = {
        id: 201,
        name: '珍珠奶茶',
        price: 50,
        instanceId: 'item-456',
        storeType: 'drink_shop',
        sweetness: 7,
        ice: 5,
        toppings: ['珍珠', '椰果'],
        customRequest: '少冰'
      };

      expect(orderItem.storeType).toBe('drink_shop');
      expect(orderItem.sweetness).toBe(7);
      expect(orderItem.ice).toBe(5);
      expect(orderItem.toppings).toEqual(['珍珠', '椰果']);
      expect(orderItem.customRequest).toBe('少冰');
    });
  });

  describe('TeamMember interface', () => {
    it('should create valid TeamMember object', () => {
      const member: TeamMember = {
        id: 'member-1',
        name: '張三'
      };

      expect(member.id).toBe('member-1');
      expect(member.name).toBe('張三');
    });
  });

  describe('MemberOrder interface', () => {
    it('should create valid MemberOrder object', () => {
      const memberOrder: MemberOrder = {
        memberId: 'member-1',
        items: [
          {
            id: 101,
            name: '牛肉麵',
            price: 120,
            instanceId: 'item-123',
            storeType: 'restaurant'
          }
        ]
      };

      expect(memberOrder.memberId).toBe('member-1');
      expect(memberOrder.items).toHaveLength(1);
      expect(memberOrder.items[0].name).toBe('牛肉麵');
    });
  });

  describe('SessionData interface', () => {
    it('should create valid SessionData object', () => {
      const sessionData: SessionData = {
        phase: AppPhase.ORDERING,
        teamMembers: [{ id: 'member-1', name: '張三' }],
        orders: [{ memberId: 'member-1', items: [] }],
        selectedRestaurantId: 1,
        selectedDrinkShopId: 2,
        deadline: '2022-01-01T12:00:00.000Z',
        isDeadlineReached: false,
        orderId: 'order-123',
        orderDate: '2022-01-01T00:00:00.000Z',
        createdAt: '2022-01-01T00:00:00.000Z'
      };

      expect(sessionData.phase).toBe(AppPhase.ORDERING);
      expect(sessionData.teamMembers).toHaveLength(1);
      expect(sessionData.orders).toHaveLength(1);
      expect(sessionData.selectedRestaurantId).toBe(1);
      expect(sessionData.selectedDrinkShopId).toBe(2);
      expect(sessionData.deadline).toBe('2022-01-01T12:00:00.000Z');
      expect(sessionData.isDeadlineReached).toBe(false);
      expect(sessionData.orderId).toBe('order-123');
    });
  });

  describe('HistoricalOrder interface', () => {
    it('should create valid HistoricalOrder object', () => {
      const historicalOrder: HistoricalOrder = {
        orderId: 'order-123',
        orderDate: '2022-01-01T00:00:00.000Z',
        createdAt: '2022-01-01T00:00:00.000Z',
        completedAt: '2022-01-01T01:00:00.000Z',
        teamMembers: [{ id: 'member-1', name: '張三' }],
        orders: [{ memberId: 'member-1', items: [] }],
        selectedRestaurantId: 1,
        selectedDrinkShopId: 2,
        totalAmount: 200,
        restaurantName: '測試餐廳',
        drinkShopName: '測試飲料店'
      };

      expect(historicalOrder.orderId).toBe('order-123');
      expect(historicalOrder.completedAt).toBe('2022-01-01T01:00:00.000Z');
      expect(historicalOrder.totalAmount).toBe(200);
      expect(historicalOrder.restaurantName).toBe('測試餐廳');
      expect(historicalOrder.drinkShopName).toBe('測試飲料店');
    });
  });
});
