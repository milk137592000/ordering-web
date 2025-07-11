import React, { useState, useCallback } from 'react';
import { Store, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { PlusIcon, MinusIcon, UserIcon, ChevronDownIcon, ChevronUpIcon } from './icons';
import DrinkCustomizationDialog from './DrinkCustomizationDialog';
import RestaurantCustomizationDialog from './RestaurantCustomizationDialog';

interface AdminOrderingInterfaceProps {
  restaurant: Store | null;
  drinkShop: Store | null;
  onOrderUpdate: (userId: string, userName: string, items: OrderItem[]) => void;
  onComplete: () => void;
  existingOrders: { [userId: string]: { userName: string; items: OrderItem[] } };
  teamMembers: { id: string; name: string; }[];
}

const AdminOrderingInterface: React.FC<AdminOrderingInterfaceProps> = ({
  restaurant,
  drinkShop,
  onOrderUpdate,
  onComplete,
  existingOrders,
  teamMembers
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  const [showNewMemberInput, setShowNewMemberInput] = useState(false);
  const [isRestaurantExpanded, setIsRestaurantExpanded] = useState(true);
  const [isDrinkExpanded, setIsDrinkExpanded] = useState(true);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
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
    } else if (userId === '') {
      setSelectedUserId('');
      setSelectedUserName('');
      setCurrentItems([]);
      setShowNewMemberInput(false);
    } else {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        setSelectedUserId(userId);
        setSelectedUserName(user.name);
        // 如果用戶已有訂單，載入現有項目；否則從空開始
        setCurrentItems(existingOrders[userId] ? [...existingOrders[userId].items] : []);
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
  const getItemQuantity = useCallback((item: any, type: 'restaurant' | 'drink') => {
    const storeId = type === 'restaurant' ? restaurant?.id || 0 : drinkShop?.id || 0;
    const existingItem = currentItems.find(i =>
      i.name === item.name &&
      i.type === type &&
      i.storeId === storeId
    );
    return existingItem ? existingItem.quantity : 0;
  }, [currentItems, restaurant, drinkShop]);

  // 添加商品到當前訂單
  const handleAddItem = useCallback((item: any, type: 'restaurant' | 'drink') => {
    if (!selectedUserId) {
      alert('請先選擇要點餐的人員');
      return;
    }

    // 如果是飲料，顯示飲料客製化對話框
    if (type === 'drink') {
      setCustomizingItem(item);
      setShowCustomizationDialog(true);
      return;
    }

    // 如果是餐點，顯示餐點客製化對話框
    if (type === 'restaurant') {
      setCustomizingItem(item);
      setShowRestaurantCustomizationDialog(true);
      return;
    }
  }, [selectedUserId, restaurant, drinkShop]);

  // 減少商品數量
  const handleDecreaseItem = useCallback((item: any, type: 'restaurant' | 'drink') => {
    if (!selectedUserId) {
      alert('請先選擇要點餐的人員');
      return;
    }

    const storeId = type === 'restaurant' ? restaurant?.id || 0 : drinkShop?.id || 0;

    setCurrentItems(prev => {
      const existingIndex = prev.findIndex(i =>
        i.name === item.name &&
        i.type === type &&
        i.storeId === storeId
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
  }, [selectedUserId, restaurant, drinkShop]);

  // 移除商品
  const handleRemoveItem = useCallback((itemId: string) => {
    setCurrentItems(prev => {
      const existingIndex = prev.findIndex(i => i.id === itemId);
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
  }, []);

  // 處理飲料客製化完成
  const handleCustomizationConfirm = useCallback((customizedItem: OrderItem) => {
    setCurrentItems(prev => [...prev, customizedItem]);
    setShowCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 處理飲料客製化取消
  const handleCustomizationCancel = useCallback(() => {
    setShowCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 處理餐點客製化完成
  const handleRestaurantCustomizationConfirm = useCallback((customizedItem: OrderItem) => {
    setCurrentItems(prev => [...prev, customizedItem]);
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 處理餐點客製化取消
  const handleRestaurantCustomizationCancel = useCallback(() => {
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 保存當前用戶的訂單
  const handleSaveOrder = useCallback(() => {
    if (!selectedUserId || !selectedUserName) {
      alert('請選擇要點餐的人員');
      return;
    }

    onOrderUpdate(selectedUserId, selectedUserName, currentItems);
    alert(`已保存 ${selectedUserName} 的訂單`);
  }, [selectedUserId, selectedUserName, currentItems, onOrderUpdate]);

  // 完成點餐設定（自動保存當前訂單）
  const handleComplete = useCallback(() => {
    // 如果有選中的用戶且有訂單項目，自動保存
    if (selectedUserId && selectedUserName && currentItems.length > 0) {
      onOrderUpdate(selectedUserId, selectedUserName, currentItems);
      console.log(`🔄 自動保存 ${selectedUserName} 的訂單，共 ${currentItems.length} 項`);
    }

    onComplete();
  }, [selectedUserId, selectedUserName, currentItems, onOrderUpdate, onComplete]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <div className="text-center mb-6">
          <UserIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">管理員點餐</h2>
          <p className="text-slate-600">為團隊成員點餐</p>
        </div>

        {/* 人員選擇 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            選擇點餐人員
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserSelect(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">請選擇人員...</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} {existingOrders[user.id] ? '(已有訂單)' : ''}
              </option>
            ))}
            <option value="new">+ 新增成員</option>
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
                placeholder="請輸入成員姓名"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button onClick={handleAddNewMember}>
                確認新增
              </Button>
            </div>
          </div>
        )}

        {/* 當前選擇的用戶 */}
        {selectedUserName && (
          <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
            <p className="text-indigo-800 font-medium">
              正在為 <span className="font-bold">{selectedUserName}</span> 點餐
            </p>
          </div>
        )}

        {/* 當前訂單 */}
        {currentItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">當前訂單</h3>
            <div className="space-y-2">
              {currentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-slate-600 ml-2">x{item.quantity}</span>
                    <span className="text-slate-600 ml-2">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <Button
                    onClick={() => handleRemoveItem(item.id)}
                    variant="secondary"
                    size="small"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSaveOrder} className="flex-1">
                保存 {selectedUserName} 的訂單
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 餐廳菜單 */}
      {restaurant && (
        <Card>
          <div
            className="flex items-center justify-between cursor-pointer p-2 -m-2 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={() => setIsRestaurantExpanded(!isRestaurantExpanded)}
          >
            <h3 className="text-xl font-bold text-slate-800">🍽️ {restaurant.name} 餐廳菜單</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {isRestaurantExpanded ? '點擊收合' : '點擊展開'}
              </span>
              {isRestaurantExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-slate-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-slate-500" />
              )}
            </div>
          </div>

          {isRestaurantExpanded && (
            <div className="mt-4 space-y-6">
              {restaurant.menu.map((category, catIndex) => (
                <div key={catIndex}>
                  <h4 className="text-lg font-semibold text-slate-600 border-b-2 border-indigo-200 pb-2 mb-4">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.items.map((item) => {
                      const quantity = getItemQuantity(item, 'restaurant');
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div>
                            <h5 className="font-medium text-slate-800">{item.name}</h5>
                            <p className="text-slate-600">${item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleDecreaseItem(item, 'restaurant')}
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
                              onClick={() => handleAddItem(item, 'restaurant')}
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
          )}
        </Card>
      )}

      {/* 飲料店菜單 */}
      {drinkShop && (
        <Card>
          <div
            className="flex items-center justify-between cursor-pointer p-2 -m-2 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={() => setIsDrinkExpanded(!isDrinkExpanded)}
          >
            <h3 className="text-xl font-bold text-slate-800">🥤 {drinkShop.name} 飲料菜單</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {isDrinkExpanded ? '點擊收合' : '點擊展開'}
              </span>
              {isDrinkExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-slate-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-slate-500" />
              )}
            </div>
          </div>

          {isDrinkExpanded && (
            <div className="mt-4 space-y-6">
              {drinkShop.menu.map((category, catIndex) => (
                <div key={catIndex}>
                  <h4 className="text-lg font-semibold text-slate-600 border-b-2 border-indigo-200 pb-2 mb-4">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.items.map((item) => {
                      const quantity = getItemQuantity(item, 'drink');
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div>
                            <h5 className="font-medium text-slate-800">{item.name}</h5>
                            <p className="text-slate-600">${item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleDecreaseItem(item, 'drink')}
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
                              onClick={() => handleAddItem(item, 'drink')}
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
          )}
        </Card>
      )}

      {/* 完成按鈕 */}
      <div className="text-center">
        <Button onClick={handleComplete} size="large">
          完成點餐設定
        </Button>
      </div>

      {/* 飲料客製化對話框 */}
      {showCustomizationDialog && customizingItem && drinkShop && (
        <DrinkCustomizationDialog
          item={customizingItem}
          drinkShop={drinkShop}
          onConfirm={handleCustomizationConfirm}
          onCancel={handleCustomizationCancel}
        />
      )}

      {/* 餐點客製化對話框 */}
      {showRestaurantCustomizationDialog && customizingItem && restaurant && (
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

export default AdminOrderingInterface;
