import React, { useState, useCallback } from 'react';
import { Store, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { PlusIcon, MinusIcon, UserIcon } from './icons';

interface AdminOrderingInterfaceProps {
  restaurant: Store | null;
  drinkShop: Store | null;
  onOrderUpdate: (userId: string, userName: string, items: OrderItem[]) => void;
  onComplete: () => void;
  existingOrders: { [userId: string]: { userName: string; items: OrderItem[] } };
}

const AdminOrderingInterface: React.FC<AdminOrderingInterfaceProps> = ({
  restaurant,
  drinkShop,
  onOrderUpdate,
  onComplete,
  existingOrders
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  const [showNewMemberInput, setShowNewMemberInput] = useState(false);

  // 獲取現有用戶列表
  const existingUsers = Object.keys(existingOrders).map(userId => ({
    id: userId,
    name: existingOrders[userId].userName
  }));

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
      setSelectedUserId(userId);
      setSelectedUserName(existingOrders[userId].userName);
      setCurrentItems([...existingOrders[userId].items]);
      setShowNewMemberInput(false);
    }
  }, [existingOrders]);

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

  // 添加商品到當前訂單
  const handleAddItem = useCallback((item: any, type: 'restaurant' | 'drink') => {
    if (!selectedUserId) {
      alert('請先選擇要點餐的人員');
      return;
    }

    const orderItem: OrderItem = {
      id: `${type}-${item.id}-${Date.now()}`,
      name: item.name,
      price: item.price,
      type: type,
      quantity: 1,
      storeId: type === 'restaurant' ? restaurant?.id || 0 : drinkShop?.id || 0,
      storeName: type === 'restaurant' ? restaurant?.name || '' : drinkShop?.name || ''
    };

    setCurrentItems(prev => {
      const existingIndex = prev.findIndex(i => 
        i.name === item.name && i.type === type && i.storeId === orderItem.storeId
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        return [...prev, orderItem];
      }
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

  // 保存當前用戶的訂單
  const handleSaveOrder = useCallback(() => {
    if (!selectedUserId || !selectedUserName) {
      alert('請選擇要點餐的人員');
      return;
    }

    onOrderUpdate(selectedUserId, selectedUserName, currentItems);
    alert(`已保存 ${selectedUserName} 的訂單`);
  }, [selectedUserId, selectedUserName, currentItems, onOrderUpdate]);

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
            {existingUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
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
          <h3 className="text-xl font-bold text-slate-800 mb-4">🍽️ {restaurant.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurant.menu.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-800">{item.name}</h4>
                  <p className="text-slate-600">${item.price}</p>
                </div>
                <Button
                  onClick={() => handleAddItem(item, 'restaurant')}
                  disabled={!selectedUserId}
                  size="small"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 飲料店菜單 */}
      {drinkShop && (
        <Card>
          <h3 className="text-xl font-bold text-slate-800 mb-4">🥤 {drinkShop.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drinkShop.menu.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-800">{item.name}</h4>
                  <p className="text-slate-600">${item.price}</p>
                </div>
                <Button
                  onClick={() => handleAddItem(item, 'drink')}
                  disabled={!selectedUserId}
                  size="small"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 完成按鈕 */}
      <div className="text-center">
        <Button onClick={onComplete} size="large">
          完成點餐設定
        </Button>
      </div>
    </div>
  );
};

export default AdminOrderingInterface;
