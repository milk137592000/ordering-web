import React, { useState } from 'react';
import { Store, OrderItem, MenuItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { PlusIcon, MinusIcon } from './icons';
import CustomOptionDialog from './CustomOptionDialog';
import RestaurantCustomizationDialog from './RestaurantCustomizationDialog';

interface RestaurantOrderingProps {
  restaurant: Store;
  personalOrder: OrderItem[];
  onAddItem: (item: OrderItem) => void;
  onRemoveItem: (itemInstanceId: string) => void;
  onContinue: () => void;
  deadline: Date | null;
  isDeadlineReached: boolean;
}

const RestaurantOrdering: React.FC<RestaurantOrderingProps> = ({
  restaurant,
  personalOrder,
  onAddItem,
  onRemoveItem,
  onContinue,
  deadline,
  isDeadlineReached
}) => {
  const [showCustomOptionDialog, setShowCustomOptionDialog] = useState(false);
  const [showRestaurantCustomizationDialog, setShowRestaurantCustomizationDialog] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // 計算特定品項的訂購數量
  const getItemQuantity = (itemId: number) => {
    return personalOrder.filter(orderItem => 
      orderItem.id === itemId && orderItem.storeType === 'restaurant'
    ).length;
  };

  // 移除特定品項的最新一個實例
  const handleRemoveClick = (itemId: number) => {
    // 從個人訂單中找到最新的該品項實例
    for (let i = personalOrder.length - 1; i >= 0; i--) {
      const item = personalOrder[i];
      if (item.id === itemId && item.storeType === 'restaurant') {
        onRemoveItem(item.instanceId);
        return;
      }
    }
  };

  const handleAddClick = (item: MenuItem) => {
    if (isDeadlineReached) {
      alert('點餐時間已截止');
      return;
    }

    // 檢查是否是"其他選項"
    if (item.id === 99999) {
      console.log('點擊其他選項，顯示自定義對話框');
      setShowCustomOptionDialog(true);
      return;
    }

    // 顯示餐點客製化對話框
    console.log('點擊餐點項目:', item.name);
    setCustomizingItem(item);
    setShowRestaurantCustomizationDialog(true);
  };

  // 處理自定義選項確認
  const handleCustomOptionConfirm = (customizedItem: OrderItem) => {
    console.log('處理自定義選項確認:', customizedItem);
    onAddItem(customizedItem);
    setShowCustomOptionDialog(false);
    console.log('添加自定義選項並關閉對話框');
  };

  // 處理自定義選項取消
  const handleCustomOptionCancel = () => {
    console.log('取消自定義選項');
    setShowCustomOptionDialog(false);
  };

  // 處理餐點客製化確認
  const handleRestaurantCustomizationConfirm = (customizedItem: OrderItem) => {
    console.log('處理餐點客製化確認:', customizedItem);
    onAddItem(customizedItem);
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
    console.log('添加餐點客製化項目並關閉對話框');
  };

  // 處理餐點客製化取消
  const handleRestaurantCustomizationCancel = () => {
    console.log('取消餐點客製化');
    setShowRestaurantCustomizationDialog(false);
    setCustomizingItem(null);
  };

  const restaurantTotal = personalOrder
    .filter(item => item.storeType === 'restaurant')
    .reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題和截止時間 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{restaurant.name}</h1>
          {deadline && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              isDeadlineReached 
                ? 'bg-red-100 text-red-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              截止時間：{deadline.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              {isDeadlineReached && ' (已截止)'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 菜單區域 */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">菜單</h2>
                <div className="space-y-6">
                  {restaurant.menu.map((category, catIndex) => (
                    <div key={catIndex}>
                      {category.name && (
                        <h3 className="text-lg font-semibold text-slate-600 border-b-2 border-indigo-200 pb-2 mb-4">
                          {category.name}
                        </h3>
                      )}
                      <div className="space-y-3">
                        {category.items.map(item => {
                          const quantity = getItemQuantity(item.id);
                          return (
                            <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm border">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-slate-800">{item.name}</h4>
                                    <p className="text-sm text-slate-500">${item.price}</p>
                                  </div>
                                  {quantity > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                        <span className="text-sm font-semibold">已選 {quantity}</span>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveClick(item.id)}
                                        className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isDeadlineReached}
                                        title="移除一個"
                                      >
                                        <MinusIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddClick(item)}
                                className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-3"
                                disabled={isDeadlineReached}
                                title="新增一個"
                              >
                                <PlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* 個人訂單摘要 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">我的餐點</h3>
                
                {personalOrder.filter(item => item.storeType === 'restaurant').length === 0 ? (
                  <p className="text-slate-500 text-center py-8">還沒有選擇任何餐點</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {personalOrder
                      .filter(item => item.storeType === 'restaurant')
                      .map(item => (
                        <div key={item.instanceId} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-800">{item.name}</p>
                            <p className="text-sm text-slate-500">${item.price}</p>
                          </div>
                          <button
                            onClick={() => onRemoveItem(item.instanceId)}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            disabled={isDeadlineReached}
                            title="移除"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {restaurantTotal > 0 && (
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center font-semibold text-lg">
                      <span>餐點小計</span>
                      <span className="text-indigo-600">${restaurantTotal}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={onContinue}
                  className="w-full"
                  size="large"
                >
                  繼續選擇飲料
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 自定義選項對話框 */}
      {showCustomOptionDialog && (
        <CustomOptionDialog
          restaurantName={restaurant.name}
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

export default RestaurantOrdering;
