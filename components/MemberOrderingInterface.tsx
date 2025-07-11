import React, { useState, useCallback } from 'react';
import { Store, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { PlusIcon, MinusIcon, UserIcon, ChevronDownIcon, ChevronUpIcon } from './icons';
import DrinkCustomizationDialog from './DrinkCustomizationDialog';
import RestaurantCustomizationDialog from './RestaurantCustomizationDialog';

interface MemberOrderingInterfaceProps {
  restaurant: Store | null;
  drinkShop: Store | null;
  personalOrder: OrderItem[];
  userName: string;
  onAddItem: (item: OrderItem) => void;
  onRemoveItem: (itemInstanceId: string) => void;
  onComplete: () => void;
  deadline: Date | null;
  isDeadlineReached: boolean;
}

const MemberOrderingInterface: React.FC<MemberOrderingInterfaceProps> = ({
  restaurant,
  drinkShop,
  personalOrder,
  userName,
  onAddItem,
  onRemoveItem,
  onComplete,
  deadline,
  isDeadlineReached
}) => {
  const [isRestaurantExpanded, setIsRestaurantExpanded] = useState(true);
  const [isDrinkExpanded, setIsDrinkExpanded] = useState(true);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [showRestaurantCustomizationDialog, setShowRestaurantCustomizationDialog] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<any>(null);





  // 獲取商品在當前訂單中的數量
  const getItemQuantity = useCallback((item: any, type: 'restaurant' | 'drink') => {
    const storeType = type === 'restaurant' ? 'restaurant' : 'drink_shop';
    return personalOrder.filter(orderItem => 
      orderItem.id === item.id && orderItem.storeType === storeType
    ).length;
  }, [personalOrder]);

  // 添加商品到當前訂單
  const handleAddItem = useCallback((item: any, type: 'restaurant' | 'drink') => {
    if (isDeadlineReached) {
      alert('點餐時間已截止');
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
  }, [isDeadlineReached]);

  // 減少商品數量
  const handleDecreaseItem = useCallback((item: any, type: 'restaurant' | 'drink') => {
    const storeType = type === 'restaurant' ? 'restaurant' : 'drink_shop';

    // 從個人訂單中找到最新的該品項實例
    for (let i = personalOrder.length - 1; i >= 0; i--) {
      const orderItem = personalOrder[i];
      if (orderItem.id === item.id && orderItem.storeType === storeType && orderItem.instanceId) {
        onRemoveItem(orderItem.instanceId);
        return;
      }
    }
  }, [personalOrder, onRemoveItem]);

  // 處理飲料客製化完成
  const handleCustomizationConfirm = useCallback((customizedItem: OrderItem) => {
    onAddItem(customizedItem);
    setShowCustomizationDialog(false);
    setCustomizingItem(null);
  }, [onAddItem]);

  // 處理飲料客製化取消
  const handleCustomizationCancel = useCallback(() => {
    setShowCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 處理餐點客製化完成
  const handleRestaurantCustomizationConfirm = useCallback((customizedItem: OrderItem) => {
    onAddItem(customizedItem);
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
  }, [onAddItem]);

  // 處理餐點客製化取消
  const handleRestaurantCustomizationCancel = useCallback(() => {
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
  }, []);

  // 計算總金額
  const restaurantTotal = personalOrder
    .filter(item => item.storeType === 'restaurant')
    .reduce((sum, item) => sum + item.price, 0);

  const drinkTotal = personalOrder
    .filter(item => item.storeType === 'drink_shop')
    .reduce((sum, item) => sum + item.price, 0);

  const grandTotal = restaurantTotal + drinkTotal;

  // 檢查是否有點餐
  const hasOrdered = personalOrder.length > 0;

  // 處理完成點餐
  const handleComplete = useCallback(() => {
    if (!hasOrdered) {
      alert('請至少點一樣餐點或飲料才能完成點餐');
      return;
    }
    onComplete();
  }, [hasOrdered, onComplete]);

  // 調試信息（可在生產環境中移除）
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 MemberOrderingInterface 渲染調試:');
    console.log('- restaurant:', restaurant);
    console.log('- drinkShop:', drinkShop);
    console.log('- personalOrder.length:', personalOrder.length);
    console.log('- hasAvailableStores:', restaurant || drinkShop);
  }

  // 檢查是否有可用的店家
  const hasAvailableStores = restaurant || drinkShop;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <div className="text-center mb-6">
          <UserIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">個人點餐</h2>
          <p className="text-slate-600">歡迎 {userName}，請選擇您要的餐點和飲料</p>
          {deadline && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm mt-2 ${
              isDeadlineReached
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              截止時間：{deadline.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              {isDeadlineReached && ' (已截止)'}
            </div>
          )}
        </div>

        {/* 等待管理員設定店家的提示 */}
        {!hasAvailableStores && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">載入店家資料中</h3>
            <p className="text-slate-500 mb-4">正在載入餐廳和飲料店資料，請稍候...</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                💡 提示：如果持續顯示此畫面，請重新整理頁面或聯繫管理員
              </p>
            </div>
          </div>
        )}

        {/* 餐廳菜單 */}
        {restaurant && (
          <div className="mb-6">
            <button
              onClick={() => setIsRestaurantExpanded(!isRestaurantExpanded)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-xl font-bold text-slate-800">{restaurant.name} 菜單</h3>
              {isRestaurantExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-slate-600" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-slate-600" />
              )}
            </button>
            
            {isRestaurantExpanded && (
              <div className="mt-4 space-y-6">
                {restaurant.menu.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <h4 className="text-lg font-semibold text-indigo-600 mb-3">{category.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.items.map((item, itemIndex) => {
                        const quantity = getItemQuantity(item, 'restaurant');
                        return (
                          <div key={itemIndex} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                            <div className="flex-1">
                              <h5 className="font-medium text-slate-800">{item.name}</h5>
                              <p className="text-sm text-slate-600">NT$ {item.price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleDecreaseItem(item, 'restaurant')}
                                disabled={quantity === 0 || isDeadlineReached}
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
                                disabled={isDeadlineReached}
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
          </div>
        )}

        {/* 飲料店菜單 */}
        {drinkShop && (
          <div className="mb-6">
            <button
              onClick={() => setIsDrinkExpanded(!isDrinkExpanded)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-xl font-bold text-slate-800">{drinkShop.name} 菜單</h3>
              {isDrinkExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-slate-600" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-slate-600" />
              )}
            </button>
            
            {isDrinkExpanded && (
              <div className="mt-4 space-y-6">
                {drinkShop.menu && drinkShop.menu.length > 0 ? (
                  drinkShop.menu.map((category, categoryIndex) => (
                    <div key={categoryIndex}>
                      <h4 className="text-lg font-semibold text-indigo-600 mb-3">{category.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.items.map((item, itemIndex) => {
                          const quantity = getItemQuantity(item, 'drink');
                          return (
                            <div key={itemIndex} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                              <div className="flex-1">
                                <h5 className="font-medium text-slate-800">{item.name}</h5>
                                <p className="text-sm text-slate-600">NT$ {item.price}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => handleDecreaseItem(item, 'drink')}
                                  disabled={quantity === 0 || isDeadlineReached}
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
                                  disabled={isDeadlineReached}
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
                  ))
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    <p>飲料菜單載入中或暫無可用飲料...</p>
                    <p className="text-sm mt-2">如果問題持續，請重新整理頁面</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 當前訂單總覽 */}
        {personalOrder.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">您的訂單</h3>
            <div className="space-y-2 mb-4">
              {personalOrder.map(item => (
                <div key={item.instanceId} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.customizations && (
                      <span className="text-sm text-slate-600 ml-2">({item.customizations})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">NT$ {item.price}</span>
                    <Button
                      onClick={() => {
                        if (item.instanceId) {
                          onRemoveItem(item.instanceId);
                        }
                      }}
                      disabled={isDeadlineReached}
                      size="small"
                      variant="secondary"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4">
              {restaurantTotal > 0 && (
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>餐點小計</span>
                  <span>NT$ {restaurantTotal}</span>
                </div>
              )}
              {drinkTotal > 0 && (
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>飲料小計</span>
                  <span>NT$ {drinkTotal}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold text-slate-800">
                <span>總計</span>
                <span>NT$ {grandTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* 完成按鈕 - 只有在有可用店家時才顯示 */}
        {hasAvailableStores && (
          <div className="text-center pt-6">
            <Button
              onClick={handleComplete}
              size="large"
              disabled={isDeadlineReached || !hasOrdered}
            >
              完成點餐
            </Button>
            {!hasOrdered && !isDeadlineReached && (
              <p className="text-sm text-slate-500 mt-2">
                請至少點一樣餐點或飲料才能完成點餐
              </p>
            )}
          </div>
        )}
      </Card>

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

export default MemberOrderingInterface;
