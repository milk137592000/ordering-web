import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import SummaryDisplay from '../../../components/SummaryDisplay';
import { createMockMemberOrder, createMockOrderItem } from '../../test-utils';

describe('SummaryDisplay', () => {
  const mockMemberNameMap = new Map([
    ['member-1', '張三'],
    ['member-2', '李四'],
  ]);

  const mockOrders = [
    createMockMemberOrder({
      memberId: 'member-1',
      items: [
        createMockOrderItem({ id: 101, name: '牛肉麵', price: 120, storeType: 'restaurant' }),
        createMockOrderItem({ id: 201, name: '珍珠奶茶', price: 50, storeType: 'drink_shop' }),
      ]
    }),
    createMockMemberOrder({
      memberId: 'member-2',
      items: [
        createMockOrderItem({ id: 102, name: '雞肉飯', price: 80, storeType: 'restaurant' }),
      ]
    }),
  ];

  const mockOnStartOver = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render summary display with order details', () => {
    render(
      <SummaryDisplay
        orders={mockOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
        restaurantName="測試餐廳"
        drinkShopName="測試飲料店"
      />
    );

    expect(screen.getByText('訂單總覽')).toBeInTheDocument();
    expect(screen.getByText('test-order-123')).toBeInTheDocument();
    expect(screen.getByText('🍽️ 測試餐廳')).toBeInTheDocument();
    expect(screen.getByText('🥤 測試飲料店')).toBeInTheDocument();
  });

  it('should display member names and their orders', () => {
    render(
      <SummaryDisplay
        orders={mockOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
      />
    );

    expect(screen.getByText('張三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('牛肉麵')).toBeInTheDocument();
    expect(screen.getByText('珍珠奶茶')).toBeInTheDocument();
    expect(screen.getByText('雞肉飯')).toBeInTheDocument();
  });

  it('should calculate and display correct totals', () => {
    render(
      <SummaryDisplay
        orders={mockOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
      />
    );

    // 張三: 牛肉麵 $120 + 珍珠奶茶 $50 = $170
    expect(screen.getByText('總計: $170.00')).toBeInTheDocument();
    
    // 李四: 雞肉飯 $80
    expect(screen.getByText('總計: $80.00')).toBeInTheDocument();
    
    // 總計: $250
    expect(screen.getByText('總金額: $250.00')).toBeInTheDocument();
  });

  it('should separate restaurant and drink items', () => {
    render(
      <SummaryDisplay
        orders={mockOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
      />
    );

    // Should show restaurant subtotal
    expect(screen.getByText('餐點 ($200.00)')).toBeInTheDocument();
    
    // Should show drink subtotal
    expect(screen.getByText('飲料 ($50.00)')).toBeInTheDocument();
  });

  it('should format date and time correctly', () => {
    render(
      <SummaryDisplay
        orders={mockOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T14:30:00.000Z"
        orderId="test-order-123"
      />
    );

    expect(screen.getByText('📅 2022年1月1日 22:30')).toBeInTheDocument();
  });

  it('should call onStartOver when complete button is clicked', () => {
    render(
      <SummaryDisplay
        orders={mockOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
      />
    );

    fireEvent.click(screen.getByText('完成訂單'));
    expect(mockOnStartOver).toHaveBeenCalled();
  });

  it('should call onBack when back button is clicked', () => {
    render(
      <SummaryDisplay
        orders={mockOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
      />
    );

    fireEvent.click(screen.getByText('返回修改'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should handle empty orders', () => {
    render(
      <SummaryDisplay
        orders={[]}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
      />
    );

    expect(screen.getByText('訂單總覽')).toBeInTheDocument();
    expect(screen.getByText('總金額: $0.00')).toBeInTheDocument();
  });

  it('should handle orders with only restaurant items', () => {
    const restaurantOnlyOrders = [
      createMockMemberOrder({
        memberId: 'member-1',
        items: [
          createMockOrderItem({ id: 101, name: '牛肉麵', price: 120, storeType: 'restaurant' }),
        ]
      }),
    ];

    render(
      <SummaryDisplay
        orders={restaurantOnlyOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
        restaurantName="測試餐廳"
      />
    );

    expect(screen.getByText('餐點 ($120.00)')).toBeInTheDocument();
    expect(screen.queryByText('飲料')).not.toBeInTheDocument();
    expect(screen.getByText('🍽️ 測試餐廳')).toBeInTheDocument();
    expect(screen.queryByText('🥤')).not.toBeInTheDocument();
  });

  it('should handle orders with only drink items', () => {
    const drinkOnlyOrders = [
      createMockMemberOrder({
        memberId: 'member-1',
        items: [
          createMockOrderItem({ id: 201, name: '珍珠奶茶', price: 50, storeType: 'drink_shop' }),
        ]
      }),
    ];

    render(
      <SummaryDisplay
        orders={drinkOnlyOrders}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
        drinkShopName="測試飲料店"
      />
    );

    expect(screen.getByText('飲料 ($50.00)')).toBeInTheDocument();
    expect(screen.queryByText('餐點')).not.toBeInTheDocument();
    expect(screen.getByText('🥤 測試飲料店')).toBeInTheDocument();
    expect(screen.queryByText('🍽️')).not.toBeInTheDocument();
  });

  it('should handle unknown member names', () => {
    const ordersWithUnknownMember = [
      createMockMemberOrder({
        memberId: 'unknown-member',
        items: [
          createMockOrderItem({ id: 101, name: '牛肉麵', price: 120, storeType: 'restaurant' }),
        ]
      }),
    ];

    render(
      <SummaryDisplay
        orders={ordersWithUnknownMember}
        memberNameMap={mockMemberNameMap}
        onStartOver={mockOnStartOver}
        onBack={mockOnBack}
        orderDate="2022-01-01T00:00:00.000Z"
        orderId="test-order-123"
      />
    );

    expect(screen.getByText('未知成員')).toBeInTheDocument();
  });
});
