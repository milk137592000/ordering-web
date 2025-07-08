import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import HistoryDisplay from '../../../components/HistoryDisplay';
import { createMockHistoricalOrder } from '../../test-utils';

// Mock Firebase functions
const mockGetDoc = jest.fn();
const mockDoc = jest.fn();

jest.mock('../../../firebase', () => ({
  db: {},
  doc: mockDoc,
  getDoc: mockGetDoc,
}));

describe('HistoryDisplay', () => {
  const mockOnBack = jest.fn();
  const mockOnViewOrder = jest.fn();

  const mockHistoricalOrders = [
    createMockHistoricalOrder({
      orderId: 'order-1',
      orderDate: '2022-01-01T00:00:00.000Z',
      completedAt: '2022-01-01T01:00:00.000Z',
      totalAmount: 250,
      restaurantName: '測試餐廳',
      drinkShopName: '測試飲料店',
    }),
    createMockHistoricalOrder({
      orderId: 'order-2',
      orderDate: '2022-01-02T00:00:00.000Z',
      completedAt: '2022-01-02T01:00:00.000Z',
      totalAmount: 150,
      restaurantName: '另一間餐廳',
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ id: 'mock-doc' });
  });

  it('should render loading state initially', () => {
    mockGetDoc.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    expect(screen.getByText('載入中...')).toBeInTheDocument();
  });

  it('should render historical orders when loaded', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ orderIds: ['order-1', 'order-2'] })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockHistoricalOrders[0]
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockHistoricalOrders[1]
      });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('歷史訂單')).toBeInTheDocument();
    });

    expect(screen.getByText('2022年1月1日')).toBeInTheDocument();
    expect(screen.getByText('2022年1月2日')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('should show empty state when no historical orders exist', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ orderIds: [] })
    });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('尚無歷史訂單')).toBeInTheDocument();
    });

    expect(screen.getByText('完成第一筆訂單後，就會在這裡顯示歷史記錄。')).toBeInTheDocument();
  });

  it('should show empty state when history document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null
    });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('尚無歷史訂單')).toBeInTheDocument();
    });
  });

  it('should call onBack when back button is clicked', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ orderIds: [] })
    });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('歷史訂單')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('返回'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should call onViewOrder when order card is clicked', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ orderIds: ['order-1'] })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockHistoricalOrders[0]
      });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('2022年1月1日')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('2022年1月1日').closest('div')!);
    expect(mockOnViewOrder).toHaveBeenCalledWith(mockHistoricalOrders[0]);
  });

  it('should display restaurant and drink shop names', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ orderIds: ['order-1'] })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockHistoricalOrders[0]
      });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('測試餐廳')).toBeInTheDocument();
    });

    expect(screen.getByText('測試飲料店')).toBeInTheDocument();
  });

  it('should handle orders with only restaurant', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ orderIds: ['order-2'] })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockHistoricalOrders[1]
      });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('另一間餐廳')).toBeInTheDocument();
    });

    expect(screen.queryByText('測試飲料店')).not.toBeInTheDocument();
  });

  it('should sort orders by completion date (newest first)', async () => {
    const olderOrder = createMockHistoricalOrder({
      orderId: 'order-old',
      orderDate: '2021-12-31T00:00:00.000Z',
      completedAt: '2021-12-31T01:00:00.000Z',
      totalAmount: 100,
    });

    const newerOrder = createMockHistoricalOrder({
      orderId: 'order-new',
      orderDate: '2022-01-01T00:00:00.000Z',
      completedAt: '2022-01-01T01:00:00.000Z',
      totalAmount: 200,
    });

    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ orderIds: ['order-old', 'order-new'] })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => olderOrder
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => newerOrder
      });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('2022年1月1日')).toBeInTheDocument();
    });

    const orderCards = screen.getAllByText(/\d{4}年\d{1,2}月\d{1,2}日/);
    expect(orderCards[0]).toHaveTextContent('2022年1月1日'); // Newer first
    expect(orderCards[1]).toHaveTextContent('2021年12月31日'); // Older second
  });

  it('should handle Firebase errors gracefully', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Firebase error'));

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('載入歷史訂單時發生錯誤，請稍後再試。')).toBeInTheDocument();
    });

    expect(screen.getByText('返回')).toBeInTheDocument();
  });

  it('should skip non-existent orders', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ orderIds: ['order-1', 'non-existent', 'order-2'] })
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockHistoricalOrders[0]
      })
      .mockResolvedValueOnce({
        exists: () => false, // Non-existent order
        data: () => null
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockHistoricalOrders[1]
      });

    render(
      <HistoryDisplay onBack={mockOnBack} onViewOrder={mockOnViewOrder} />
    );

    await waitFor(() => {
      expect(screen.getByText('2022年1月1日')).toBeInTheDocument();
    });

    expect(screen.getByText('2022年1月2日')).toBeInTheDocument();
    // Should only show 2 orders, not 3
    expect(screen.getAllByText(/\d{4}年\d{1,2}月\d{1,2}日/)).toHaveLength(2);
  });
});
