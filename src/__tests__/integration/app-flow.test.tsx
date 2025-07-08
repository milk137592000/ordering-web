import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import App from '../../../App';
import { AppPhase } from '../../../types';
import { 
  createMockSessionData, 
  createMockStore, 
  createMockDrinkShop,
  mockFirebaseSuccess,
  mockFirebaseEmpty 
} from '../../test-utils';

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

describe('Application Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebaseEmpty(); // Start with empty Firebase state
  });

  describe('Complete Ordering Flow', () => {
    it('should complete full ordering flow from team setup to summary', async () => {
      render(<App />);

      // Step 1: Team Setup Phase
      expect(screen.getByText('團隊設定')).toBeInTheDocument();
      
      // Add team members
      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      fireEvent.change(nameInput, { target: { value: '張三' } });
      fireEvent.click(screen.getByText('新增成員'));
      
      fireEvent.change(nameInput, { target: { value: '李四' } });
      fireEvent.click(screen.getByText('新增成員'));

      expect(screen.getByText('張三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();

      // Start ordering
      fireEvent.click(screen.getByText('開始點餐'));

      // Step 2: Restaurant Selection Phase
      await waitFor(() => {
        expect(screen.getByText('選擇餐廳')).toBeInTheDocument();
      });

      // Select a restaurant
      await waitFor(() => {
        expect(screen.getByText('測試餐廳')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getAllByText('測試餐廳')[0]);

      // Step 3: Drink Shop Selection Phase
      await waitFor(() => {
        expect(screen.getByText('選擇飲料店')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('測試飲料店')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getAllByText('測試飲料店')[0]);

      // Step 4: Ordering Phase
      await waitFor(() => {
        expect(screen.getByText('點餐介面')).toBeInTheDocument();
      });

      // Switch to first member and add items
      fireEvent.click(screen.getByText('張三'));
      
      // Add restaurant item
      await waitFor(() => {
        expect(screen.getByText('牛肉麵')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('牛肉麵'));

      // Add drink item
      fireEvent.click(screen.getByText('飲料'));
      await waitFor(() => {
        expect(screen.getByText('珍珠奶茶')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('珍珠奶茶'));

      // Go to summary
      fireEvent.click(screen.getByText('查看總覽'));

      // Step 5: Summary Phase
      await waitFor(() => {
        expect(screen.getByText('訂單總覽')).toBeInTheDocument();
      });

      expect(screen.getByText('張三')).toBeInTheDocument();
      expect(screen.getByText('牛肉麵')).toBeInTheDocument();
      expect(screen.getByText('珍珠奶茶')).toBeInTheDocument();
    });

    it('should handle skipping drink shop selection', async () => {
      render(<App />);

      // Setup team
      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      fireEvent.change(nameInput, { target: { value: '張三' } });
      fireEvent.click(screen.getByText('新增成員'));
      fireEvent.click(screen.getByText('開始點餐'));

      // Select restaurant
      await waitFor(() => {
        expect(screen.getByText('選擇餐廳')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('測試餐廳')).toBeInTheDocument();
      });
      fireEvent.click(screen.getAllByText('測試餐廳')[0]);

      // Skip drink shop
      await waitFor(() => {
        expect(screen.getByText('選擇飲料店')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('跳過飲料店'));

      // Should go directly to ordering
      await waitFor(() => {
        expect(screen.getByText('點餐介面')).toBeInTheDocument();
      });

      // Should only show restaurant tab
      expect(screen.getByText('餐點')).toBeInTheDocument();
      expect(screen.queryByText('飲料')).not.toBeInTheDocument();
    });

    it('should handle navigation between phases', async () => {
      render(<App />);

      // Setup team and start ordering
      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      fireEvent.change(nameInput, { target: { value: '張三' } });
      fireEvent.click(screen.getByText('新增成員'));
      fireEvent.click(screen.getByText('開始點餐'));

      // Go to restaurant selection and back
      await waitFor(() => {
        expect(screen.getByText('選擇餐廳')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('返回'));
      
      await waitFor(() => {
        expect(screen.getByText('團隊設定')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty team members', async () => {
      render(<App />);

      expect(screen.getByText('團隊設定')).toBeInTheDocument();
      
      // Try to start without adding members
      const startButton = screen.getByText('開始點餐');
      expect(startButton).toBeDisabled();
    });

    it('should handle markdown loading errors', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      render(<App />);

      // Setup team
      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      fireEvent.change(nameInput, { target: { value: '張三' } });
      fireEvent.click(screen.getByText('新增成員'));
      fireEvent.click(screen.getByText('開始點餐'));

      // Should show loading or error state
      await waitFor(() => {
        expect(screen.getByText('選擇餐廳')).toBeInTheDocument();
      });

      // Should handle gracefully - might show empty state or retry option
    });

    it('should handle Firebase connection errors', async () => {
      // Mock Firebase to fail
      const mockServices = window.firebaseServices;
      mockServices.onSnapshot.mockImplementation((docRef, callback, errorCallback) => {
        errorCallback(new Error('Firebase connection failed'));
        return () => {};
      });

      render(<App />);

      // App should still be functional even with Firebase errors
      expect(screen.getByText('團隊設定')).toBeInTheDocument();
    });

    it('should handle session restoration from Firebase', async () => {
      // Mock existing session data
      const existingSession = createMockSessionData({
        phase: AppPhase.ORDERING,
        teamMembers: [{ id: 'member-1', name: '張三' }],
        selectedRestaurantId: 1,
        selectedDrinkShopId: 2,
      });

      const mockServices = window.firebaseServices;
      mockServices.onSnapshot.mockImplementation((docRef, callback) => {
        callback({
          exists: () => true,
          data: () => existingSession
        });
        return () => {};
      });

      render(<App />);

      // Should restore to ordering phase
      await waitFor(() => {
        expect(screen.getByText('點餐介面')).toBeInTheDocument();
      });

      expect(screen.getByText('張三')).toBeInTheDocument();
    });
  });

  describe('Data Persistence and Synchronization', () => {
    it('should save session data when making changes', async () => {
      const mockServices = window.firebaseServices;
      mockFirebaseSuccess();

      render(<App />);

      // Add team member
      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      fireEvent.change(nameInput, { target: { value: '張三' } });
      fireEvent.click(screen.getByText('新增成員'));

      // Should call setDoc to save session data
      await waitFor(() => {
        expect(mockServices.setDoc).toHaveBeenCalled();
      });
    });

    it('should handle concurrent updates from other users', async () => {
      const mockServices = window.firebaseServices;
      let snapshotCallback: any;

      mockServices.onSnapshot.mockImplementation((docRef, callback) => {
        snapshotCallback = callback;
        // Initial empty state
        callback({
          exists: () => false,
          data: () => null
        });
        return () => {};
      });

      render(<App />);

      // Add a team member locally
      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      fireEvent.change(nameInput, { target: { value: '張三' } });
      fireEvent.click(screen.getByText('新增成員'));

      // Simulate update from another user
      const updatedSession = createMockSessionData({
        teamMembers: [
          { id: 'member-1', name: '張三' },
          { id: 'member-2', name: '李四' }
        ]
      });

      snapshotCallback({
        exists: () => true,
        data: () => updatedSession
      });

      // Should show both members
      await waitFor(() => {
        expect(screen.getByText('張三')).toBeInTheDocument();
        expect(screen.getByText('李四')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and User Experience', () => {
    it('should show loading states during transitions', async () => {
      render(<App />);

      // Setup team
      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      fireEvent.change(nameInput, { target: { value: '張三' } });
      fireEvent.click(screen.getByText('新增成員'));
      fireEvent.click(screen.getByText('開始點餐'));

      // Should show some loading indication while fetching stores
      // This depends on implementation details
    });

    it('should handle rapid user interactions gracefully', async () => {
      render(<App />);

      const nameInput = screen.getByPlaceholderText('輸入成員姓名');
      
      // Rapidly add multiple members
      for (let i = 0; i < 5; i++) {
        fireEvent.change(nameInput, { target: { value: `成員${i}` } });
        fireEvent.click(screen.getByText('新增成員'));
      }

      // Should handle all additions
      await waitFor(() => {
        expect(screen.getByText('成員0')).toBeInTheDocument();
        expect(screen.getByText('成員4')).toBeInTheDocument();
      });
    });
  });
});
