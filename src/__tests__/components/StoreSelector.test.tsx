import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import StoreSelector from '../../../components/StoreSelector';
import { createMockStore, createMockDrinkShop } from '../../test-utils';

describe('StoreSelector', () => {
  const mockStores = [
    createMockStore({ id: 1, name: '測試餐廳1' }),
    createMockStore({ id: 2, name: '測試餐廳2' }),
  ];

  const mockOnSelect = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render store selector with title', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
      />
    );

    expect(screen.getByText('選擇餐廳')).toBeInTheDocument();
    expect(screen.getAllByText('測試餐廳1')).toHaveLength(2); // Appears twice in the card
    expect(screen.getAllByText('測試餐廳2')).toHaveLength(2); // Appears twice in the card
  });

  it('should display correct item count for each store', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
      />
    );

    // Each mock store has 2 items in the main category
    expect(screen.getAllByText('2 項餐點')).toHaveLength(2);
  });

  it('should call onSelect when store is clicked', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
      />
    );

    fireEvent.click(screen.getAllByText('測試餐廳1')[0]);
    expect(mockOnSelect).toHaveBeenCalledWith(mockStores[0]);
  });

  it('should show random selection button', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
      />
    );

    expect(screen.getByText('隨機選擇！')).toBeInTheDocument();
  });

  it('should call onSelect with random store when random button is clicked', () => {
    // Mock Math.random to return 0.5 (which should select index 1)
    const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
      />
    );

    fireEvent.click(screen.getByText('隨機選擇！'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockStores[1]);

    mockMathRandom.mockRestore();
  });

  it('should show back button when onBack is provided', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('返回')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
        onBack={mockOnBack}
      />
    );

    fireEvent.click(screen.getByText('返回'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should show skip button when onSkip is provided', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
        onSkip={mockOnSkip}
        skipLabel="跳過"
      />
    );

    expect(screen.getByText('跳過')).toBeInTheDocument();
  });

  it('should call onSkip when skip button is clicked', () => {
    render(
      <StoreSelector
        stores={mockStores}
        onSelect={mockOnSelect}
        title="選擇餐廳"
        onSkip={mockOnSkip}
        skipLabel="跳過"
      />
    );

    fireEvent.click(screen.getByText('跳過'));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('should handle empty stores array', () => {
    render(
      <StoreSelector
        stores={[]}
        onSelect={mockOnSelect}
        title="選擇餐廳"
      />
    );

    expect(screen.getByText('選擇餐廳')).toBeInTheDocument();
    expect(screen.queryByText('隨機選擇！')).toBeInTheDocument(); // Button should still be there
  });

  it('should handle stores with different types', () => {
    const mixedStores = [
      createMockStore({ id: 1, name: '餐廳', type: 'restaurant' }),
      createMockDrinkShop({ id: 2, name: '飲料店', type: 'drink_shop' }),
    ];

    render(
      <StoreSelector
        stores={mixedStores}
        onSelect={mockOnSelect}
        title="選擇店家"
      />
    );

    expect(screen.getAllByText('餐廳')).toHaveLength(2);
    expect(screen.getAllByText('飲料店')).toHaveLength(2);
  });

  it('should calculate total items correctly for drink shops with toppings', () => {
    const drinkShop = createMockDrinkShop({
      id: 1,
      name: '飲料店',
      menu: [
        {
          name: '茶類',
          items: [
            { id: 201, name: '奶茶', price: 50 },
            { id: 202, name: '紅茶', price: 30 },
          ]
        }
      ],
      toppings: [
        { name: '珍珠', price: 10 },
        { name: '椰果', price: 10 },
      ]
    });

    render(
      <StoreSelector
        stores={[drinkShop]}
        onSelect={mockOnSelect}
        title="選擇飲料店"
      />
    );

    // Should count menu items only, not toppings
    expect(screen.getByText('2 項餐點')).toBeInTheDocument();
  });
});
