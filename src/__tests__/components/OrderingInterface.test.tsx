import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrderingInterface from '../../../components/OrderingInterface';
import { TeamMember, Store, MemberOrder } from '../../../types';

// Mock data
const mockTeamMembers: TeamMember[] = [
  { id: 'member-1', name: '張三' },
  { id: 'member-2', name: '李四' }
];

const mockRestaurant: Store = {
  id: 1,
  name: '測試餐廳',
  type: 'restaurant',
  menu: [
    {
      name: '主餐',
      items: [
        { id: 101, name: '牛肉麵', price: 120 },
        { id: 102, name: '雞肉飯', price: 80 }
      ]
    }
  ]
};

const mockDrinkShop: Store = {
  id: 2,
  name: '測試飲料店',
  type: 'drink_shop',
  menu: [
    {
      name: '茶類',
      items: [
        { id: 201, name: '珍珠奶茶', price: 50 },
        { id: 202, name: '紅茶', price: 30 }
      ]
    }
  ],
  toppings: [
    { name: '珍珠', price: 10 },
    { name: '椰果', price: 10 }
  ]
};

const mockOrders: MemberOrder[] = [
  {
    memberId: 'member-1',
    items: [
      {
        id: 101,
        name: '牛肉麵',
        price: 120,
        instanceId: 'item-1',
        storeType: 'restaurant'
      },
      {
        id: 101,
        name: '牛肉麵',
        price: 120,
        instanceId: 'item-2',
        storeType: 'restaurant'
      },
      {
        id: 201,
        name: '珍珠奶茶',
        price: 50,
        instanceId: 'item-3',
        storeType: 'drink_shop'
      }
    ]
  },
  {
    memberId: 'member-2',
    items: [
      {
        id: 102,
        name: '雞肉飯',
        price: 80,
        instanceId: 'item-4',
        storeType: 'restaurant'
      }
    ]
  }
];

const mockMemberNameMap = new Map([
  ['member-1', '張三'],
  ['member-2', '李四']
]);

const mockProps = {
  teamMembers: mockTeamMembers,
  restaurant: mockRestaurant,
  drinkShop: mockDrinkShop,
  orders: mockOrders,
  onAddItem: jest.fn(),
  onRemoveItem: jest.fn(),
  onFinish: jest.fn(),
  onBack: jest.fn(),
  memberNameMap: mockMemberNameMap,
  onAddTemporaryMember: jest.fn(),
  deadline: null,
  isDeadlineReached: false,
  onSetDeadline: jest.fn()
};

describe('OrderingInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display item quantities correctly', () => {
    render(<OrderingInterface {...mockProps} />);

    // 牛肉麵應該顯示 "已選 2" (張三點了2份)
    expect(screen.getByText('已選 2')).toBeInTheDocument();

    // 雞肉飯和珍珠奶茶應該各顯示 "已選 1"
    expect(screen.getAllByText('已選 1')).toHaveLength(2); // 雞肉飯和珍珠奶茶各1份

    // 紅茶沒有被點，不應該顯示數量
    expect(screen.queryByText('紅茶')).toBeInTheDocument();
    // 但紅茶旁邊不應該有數量顯示
    const redTeaElement = screen.getByText('紅茶').closest('[data-testid="menu-item"]');
    expect(redTeaElement).not.toHaveTextContent('已選');
  });

  it('should not display quantity when no items are ordered', () => {
    const emptyOrders: MemberOrder[] = [
      { memberId: 'member-1', items: [] },
      { memberId: 'member-2', items: [] }
    ];

    render(<OrderingInterface {...mockProps} orders={emptyOrders} />);

    // 沒有任何品項應該顯示數量
    expect(screen.queryByText(/已選/)).not.toBeInTheDocument();
  });

  it('should display add and remove buttons correctly', () => {
    render(<OrderingInterface {...mockProps} />);

    // 應該有新增按鈕（+）
    const addButtons = screen.getAllByTitle('新增一個');
    expect(addButtons.length).toBeGreaterThan(0);
    addButtons.forEach(button => {
      expect(button).toHaveTextContent('+');
    });

    // 應該有減少按鈕（−）
    const removeButtons = screen.getAllByTitle('移除一個');
    expect(removeButtons).toHaveLength(3); // 牛肉麵(2個)、雞肉飯(1個)、珍珠奶茶(1個) = 3個減少按鈕

    // 檢查按鈕內容
    removeButtons.forEach(button => {
      expect(button).toHaveTextContent('−');
    });
  });

  it('should call onRemoveItem when remove button is clicked', () => {
    render(<OrderingInterface {...mockProps} />);

    // 點擊第一個減少按鈕
    const removeButtons = screen.getAllByTitle('移除一個');
    fireEvent.click(removeButtons[0]);

    // 應該調用 onRemoveItem
    expect(mockProps.onRemoveItem).toHaveBeenCalledTimes(1);
    // 應該移除某個品項實例（具體哪個取決於算法，但應該被調用）
    expect(mockProps.onRemoveItem).toHaveBeenCalled();
  });
});
