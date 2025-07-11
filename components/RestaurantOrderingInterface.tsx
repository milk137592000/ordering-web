import React, { useState, useCallback } from 'react';
import { Store, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { PlusIcon, MinusIcon, UserIcon } from './icons';
import CustomOptionDialog from './CustomOptionDialog';
import RestaurantCustomizationDialog from './RestaurantCustomizationDialog';

interface RestaurantOrderingInterfaceProps {
  restaurant: Store | null;
  onOrderUpdate: (userId: string, userName: string, items: OrderItem[]) => void;
  onComplete: () => void;
  onBack: () => void;
  existingOrders: { [userId: string]: { userName: string; items: OrderItem[] } };
  teamMembers: { id: string; name: string; }[];
}

const RestaurantOrderingInterface: React.FC<RestaurantOrderingInterfaceProps> = ({
  restaurant,
  onOrderUpdate,
  onComplete,
  onBack,
  existingOrders,
  teamMembers
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  const [showNewMemberInput, setShowNewMemberInput] = useState(false);
  const [showCustomOptionDialog, setShowCustomOptionDialog] = useState(false);
  const [showRestaurantCustomizationDialog, setShowRestaurantCustomizationDialog] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<any>(null);

  // 獲取所有用戶列表（團隊成員 + 已有訂單的用戶）
  const allUsers = React.useMemo(() => {
    const userMap = new Map<string, { id: string; name: string }>();

    // 添加團隊成員
    teamMembers.forEach(member => {
      userMap.set(member.id, { id: member.id, name: member.name });
    });

    // 添加已有訂單的用戶（可能是臨時添加的成員）
    Object.keys(existingOrders).forEach(userId => {
      if (!userMap.has(userId)) {
        userMap.set(userId, { id: userId, name: existingOrders[userId].userName });
      }
    });

    return Array.from(userMap.values());
  }, [teamMembers, existingOrders]);

  // 處理用戶選擇
  const handleUserSelect = useCallback((userId: string) => {
    if (userId === 'new') {
      setShowNewMemberInput(true);
      setSelectedUserId('');
      setSelectedUserName('');
      setCurrentItems([]);
    } else {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        setSelectedUserId(userId);
        setSelectedUserName(user.name);

        // 載入該用戶的現有餐廳訂單
        const existingRestaurantItems = existingOrders[userId]
          ? existingOrders[userId].items.filter(item => item.type === 'restaurant')
          : [];
        setCurrentItems(existingRestaurantItems);
        setShowNewMemberInput(false);
      }
    }
  }, [existingOrders, allUsers]);

  // 處理新成員添加
  const handleAddNewMember = useCallback(() => {
    if (!newMemberName.trim()) {
      alert('請輸入成員姓名');
      return;
    }

    const newUserId = `temp-${Date.now()}`;
    setSelectedUserId(newUserId);
    setSelectedUserName(newMemberName.trim());
    setCurrentItems([]);
    setShowNewMemberInput(false);
    setNewMemberName('');
  }, [newMemberName]);

  // 獲取商品在當前訂單中的數量
  const getItemQuantity = useCallback((item: any) => {
    const existingItem = currentItems.find(i =>
      i.name === item.name &&
      i.type === 'restaurant' &&
      i.storeId === (restaurant?.id || 0)
    );
    return existingItem ? existingItem.quantity : 0;
  }, [currentItems, restaurant]);

  // 添加商品到當前訂單
  const handleAddItem = useCallback((item: any) => {
    if (!selectedUserId) {
      alert('請先選擇要點餐的人員');
      return;
    }

    // 檢查是否是"其他選項"
    if (item.id === 99999) {
      console.log('點擊其他選項，顯示自定義對話框');
      setShowCustomOptionDialog(true);
      return;
    }

    // 顯示餐點客製化對話框
    console.log('點擊餐點項目:', item.name, '為用戶:', selectedUserName);
    console.log('設置 customizingItem:', item);
    setCustomizingItem(item);
    console.log('設置 showRestaurantCustomizationDialog 為 true');
    setShowRestaurantCustomizationDialog(true);
  }, [selectedUserId, selectedUserName]);

  // 減少商品數量
  const handleDecreaseItem = useCallback((item: any) => {
    if (!selectedUserId) {
      alert('請先選擇要點餐的人員');
      return;
    }

    setCurrentItems(prev => {
      const existingIndex = prev.findIndex(i =>
        i.name === item.name &&
        i.type === 'restaurant' &&
        i.storeId === (restaurant?.id || 0)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        if (updated[existingIndex].quantity > 1) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity - 1
          };
        } else {
          updated.splice(existingIndex, 1);
        }
        return updated;
      }
      return prev;
    });
  }, [selectedUserId, restaurant]);

  // 處理自定義選項確認
  const handleCustomOptionConfirm = useCallback((customizedItem: OrderItem) => {
    console.log('處理自定義選項確認:', customizedItem);

    setCurrentItems(prev => [...prev, customizedItem]);
    setShowCustomOptionDialog(false);
    console.log('添加自定義選項並關閉對話框');
  }, []);

  // 處理自定義選項取消
  const handleCustomOptionCancel = useCallback(() => {
    console.log('取消自定義選項');
    setShowCustomOptionDialog(false);
  }, []);

  // 處理餐點客製化確認
  const handleRestaurantCustomizationConfirm = useCallback((customizedItem: OrderItem) => {
    console.log('處理餐點客製化確認:', customizedItem);
    setCurrentItems(prev => {
      const existingIndex = prev.findIndex(i =>
        i.id === customizedItem.id &&
        i.storeType === customizedItem.storeType &&
        i.customizations === customizedItem.customizations
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (updated[existingIndex].quantity || 1) + 1
        };
        return updated;
      } else {
        return [...prev, customizedItem];
      }
    });
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
    console.log('添加餐點客製化項目並關閉對話框');
  }, []);

  // 處理餐點客製化取消
  const handleRestaurantCustomizationCancel = useCallback(() => {
    console.log('取消餐點客製化');
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 保存當前用戶的訂單
  const handleSaveOrder = useCallback(() => {
    if (!selectedUserId || !selectedUserName) {
      alert('請選擇要點餐的人員');
      return;
    }

    // 合併餐廳和飲料訂單
    const existingDrinkItems = existingOrders[selectedUserId]
      ? existingOrders[selectedUserId].items.filter(item => item.type === 'drink')
      : [];

    const allItems = [...currentItems, ...existingDrinkItems];
    onOrderUpdate(selectedUserId, selectedUserName, allItems);
    alert(`已保存 ${selectedUserName} 的餐廳訂單`);
  }, [selectedUserId, selectedUserName, currentItems, onOrderUpdate, existingOrders]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <div className="text-center mb-6">
          <UserIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">餐廳點餐</h2>
          <p className="text-slate-600">為團隊成員點餐</p>
        </div>

        {/* 用戶選擇 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            選擇要點餐的人員
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserSelect(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">請選擇人員</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
            <option value="new">+ 新增臨時成員</option>
          </select>
        </div>

        {/* 新成員輸入 */}
        {showNewMemberInput && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              新成員姓名
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="請輸入姓名"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button onClick={handleAddNewMember} size="small">
                確認
              </Button>
              <Button
                onClick={() => setShowNewMemberInput(false)}
                variant="secondary"
                size="small"
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 當前訂單顯示 */}
        {selectedUserId && currentItems.length > 0 && (
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-semibold text-indigo-700 mb-2">
              {selectedUserName} 的當前訂單
            </h3>
            <div className="space-y-2">
              {currentItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span>數量: {item.quantity || 1}</span>
                    <span className="font-medium">NT$ {item.price}</span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between items-center font-semibold">
                <span>小計</span>
                <span>NT$ {currentItems.reduce((sum, item) => sum + item.price, 0)}</span>
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={handleSaveOrder} size="small" className="w-full">
                保存 {selectedUserName} 的訂單
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 餐廳菜單 */}
      {restaurant && selectedUserId && (
        <Card>
          <h3 className="text-xl font-bold text-slate-800 mb-4">{restaurant.name} 菜單</h3>
          <div className="space-y-6">
            {restaurant.menu.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h4 className="text-lg font-semibold text-indigo-600 mb-3">{category.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.items.map((item, itemIndex) => {
                    const quantity = getItemQuantity(item);
                    return (
                      <div key={itemIndex} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                        <div className="flex-1">
                          <h5 className="font-medium text-slate-800">{item.name}</h5>
                          <p className="text-sm text-slate-600">NT$ {item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleDecreaseItem(item)}
                            disabled={!selectedUserId || quantity === 0}
                            size="small"
                            variant="secondary"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          {quantity > 0 && (
                            <span className="min-w-[2rem] text-center font-medium text-slate-800">
                              {quantity}
                            </span>
                          )}
                          <Button
                            onClick={() => handleAddItem(item)}
                            disabled={!selectedUserId}
                            size="small"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 導航按鈕 */}
      <div className="flex gap-4">
        <Button onClick={onBack} variant="secondary" className="flex-1">
          返回
        </Button>
        <Button
          onClick={() => {
            console.log('點擊前往飲料點餐按鈕');
            onComplete();
          }}
          className="flex-1"
        >
          前往飲料點餐
        </Button>
      </div>

      {/* 自定義選項對話框 */}
      {showCustomOptionDialog && (
        <CustomOptionDialog
          restaurantName={restaurant?.name || '餐廳'}
          onConfirm={handleCustomOptionConfirm}
          onCancel={handleCustomOptionCancel}
        />
      )}

      {/* 餐點客製化對話框 */}
      {showRestaurantCustomizationDialog && customizingItem && (
        <RestaurantCustomizationDialog
          item={customizingItem}
          restaurant={restaurant}
          onConfirm={handleRestaurantCustomizationConfirm}
          onCancel={handleRestaurantCustomizationCancel}
        />
      )}
    </div>
  );
};

export default RestaurantOrderingInterface;