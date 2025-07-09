import React, { useState, useCallback } from 'react';
import { Store, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { PlusIcon, MinusIcon, UserIcon } from './icons';
import DrinkCustomizationDialog from './DrinkCustomizationDialog';

interface DrinkOrderingInterfaceProps {
  drinkShop: Store | null;
  onOrderUpdate: (userId: string, userName: string, items: OrderItem[]) => void;
  onComplete: () => void;
  onBack: () => void;
  existingOrders: { [userId: string]: { userName: string; items: OrderItem[] } };
  teamMembers: { id: string; name: string; }[];
}

const DrinkOrderingInterface: React.FC<DrinkOrderingInterfaceProps> = ({
  drinkShop,
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
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
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
        // 載入現有的飲料訂單項目
        const existingDrinkItems = existingOrders[userId] 
          ? existingOrders[userId].items.filter(item => item.type === 'drink')
          : [];
        setCurrentItems(existingDrinkItems);
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
      i.type === 'drink' && 
      i.storeId === (drinkShop?.id || 0)
    );
    return existingItem ? existingItem.quantity : 0;
  }, [currentItems, drinkShop]);

  // 添加商品到當前訂單
  const handleAddItem = useCallback((item: any) => {
    if (!selectedUserId) {
      alert('請先選擇要點餐的人員');
      return;
    }

    // 顯示客製化對話框
    setCustomizingItem(item);
    setShowCustomizationDialog(true);
  }, [selectedUserId]);

  // 處理客製化完成
  const handleCustomizationConfirm = useCallback((customizedItem: OrderItem) => {
    setCurrentItems(prev => {
      const existingIndex = prev.findIndex(i =>
        i.name === customizedItem.name &&
        i.type === 'drink' &&
        i.storeId === customizedItem.storeId &&
        i.sweetness === customizedItem.sweetness &&
        i.ice === customizedItem.ice
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        return [...prev, customizedItem];
      }
    });

    setShowCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 處理客製化取消
  const handleCustomizationCancel = useCallback(() => {
    setShowCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 減少商品數量
  const handleDecreaseItem = useCallback((item: any) => {
    if (!selectedUserId) {
      alert('請先選擇要點餐的人員');
      return;
    }

    setCurrentItems(prev => {
      const existingIndex = prev.findIndex(i => 
        i.name === item.name && 
        i.type === 'drink' && 
        i.storeId === (drinkShop?.id || 0)
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
  }, [selectedUserId, drinkShop]);

  // 保存當前用戶的訂單
  const handleSaveOrder = useCallback(() => {
    if (!selectedUserId || !selectedUserName) {
      alert('請選擇要點餐的人員');
      return;
    }

    // 合併餐廳和飲料訂單
    const existingRestaurantItems = existingOrders[selectedUserId] 
      ? existingOrders[selectedUserId].items.filter(item => item.type === 'restaurant')
      : [];
    
    const allItems = [...existingRestaurantItems, ...currentItems];
    onOrderUpdate(selectedUserId, selectedUserName, allItems);
    alert(`已保存 ${selectedUserName} 的飲料訂單`);
  }, [selectedUserId, selectedUserName, currentItems, onOrderUpdate, existingOrders]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <div className="text-center mb-6">
          <UserIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">飲料點餐</h2>
          <p className="text-slate-600">為團隊成員點飲料</p>
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
              正在為 <span className="font-bold">{selectedUserName}</span> 點飲料
            </p>
          </div>
        )}

        {/* 當前訂單 */}
        {currentItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">當前飲料訂單</h3>
            <div className="space-y-2">
              {currentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-slate-600 ml-2">x{item.quantity}</span>
                    <span className="text-slate-600 ml-2">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSaveOrder} className="flex-1">
                保存 {selectedUserName} 的飲料訂單
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 飲料店菜單 */}
      {drinkShop && (
        <Card>
          <h3 className="text-xl font-bold text-slate-800 mb-4">🥤 {drinkShop.name}</h3>
          <div className="space-y-6">
            {drinkShop.menu.map((category, catIndex) => (
              <div key={catIndex}>
                <h4 className="text-lg font-semibold text-slate-600 border-b-2 border-indigo-200 pb-2 mb-4">
                  {category.name}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => {
                    const quantity = getItemQuantity(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div>
                          <h5 className="font-medium text-slate-800">{item.name}</h5>
                          <p className="text-slate-600">${item.price}</p>
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
          返回餐廳點餐
        </Button>
        <Button onClick={onComplete} className="flex-1">
          完成點餐設定
        </Button>
      </div>

      {/* 飲料客製化對話框 */}
      {showCustomizationDialog && customizingItem && (
        <DrinkCustomizationDialog
          item={customizingItem}
          drinkShop={drinkShop}
          onConfirm={handleCustomizationConfirm}
          onCancel={handleCustomizationCancel}
        />
      )}
    </div>
  );
};

export default DrinkOrderingInterface;
