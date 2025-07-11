import React, { useState, useCallback } from 'react';
import { Store, OrderItem, MenuItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { PlusIcon, MinusIcon } from './icons';
import DrinkCustomizationModal from './DrinkCustomizationModal';

interface DrinkOrderingProps {
  drinkShop: Store;
  personalOrder: OrderItem[];
  onAddItem: (item: OrderItem) => void;
  onRemoveItem: (itemInstanceId: string) => void;
  onContinue: () => void;
  onBack: () => void;
  deadline: Date | null;
  isDeadlineReached: boolean;
}

const DrinkOrdering: React.FC<DrinkOrderingProps> = ({
  drinkShop,
  personalOrder,
  onAddItem,
  onRemoveItem,
  onContinue,
  onBack,
  deadline,
  isDeadlineReached
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // 計算特定品項的訂購數量
  const getItemQuantity = (itemId: number) => {
    return personalOrder.filter(orderItem => 
      orderItem.id === itemId && orderItem.storeType === 'drink_shop'
    ).length;
  };

  // 移除特定品項的最新一個實例
  const handleRemoveClick = (itemId: number) => {
    // 從個人訂單中找到最新的該品項實例
    for (let i = personalOrder.length - 1; i >= 0; i--) {
      const item = personalOrder[i];
      if (item.id === itemId && item.storeType === 'drink_shop') {
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

    setCustomizingItem(item);
    setIsModalOpen(true);
  };

  const handleCustomizationComplete = (customizedItem: OrderItem) => {
    onAddItem(customizedItem);
    setIsModalOpen(false);
    setCustomizingItem(null);
  };

  const drinkTotal = personalOrder
    .filter(item => item.storeType === 'drink_shop')
    .reduce((sum, item) => sum + item.price, 0);

  // 檢查是否有點飲料
  const hasOrderedDrinks = personalOrder.some(item => item.storeType === 'drink_shop');

  // 處理完成點餐
  const handleComplete = useCallback(() => {
    if (!hasOrderedDrinks) {
      alert('請至少點一杯飲料才能完成點餐');
      return;
    }
    onContinue();
  }, [hasOrderedDrinks, onContinue]);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題和截止時間 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{drinkShop.name}</h1>
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
                <h2 className="text-xl font-bold text-slate-800 mb-4">飲料菜單</h2>
                <div className="space-y-6">
                  {drinkShop.menu.map((category, catIndex) => (
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
                <h3 className="text-lg font-bold text-slate-800 mb-4">我的飲料</h3>
                
                {personalOrder.filter(item => item.storeType === 'drink_shop').length === 0 ? (
                  <p className="text-slate-500 text-center py-8">還沒有選擇任何飲料</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {personalOrder
                      .filter(item => item.storeType === 'drink_shop')
                      .map(item => (
                        <div key={item.instanceId} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
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
                          {(item.sweetness !== undefined || item.ice !== undefined || item.toppings?.length || item.customRequest) && (
                            <div className="text-xs text-slate-600 space-y-1">
                              {item.sweetness !== undefined && <p>甜度: {item.sweetness}/10</p>}
                              {item.ice !== undefined && <p>冰塊: {item.ice}/10</p>}
                              {item.toppings?.length && <p>加料: {item.toppings.join(', ')}</p>}
                              {item.customRequest && <p>備註: {item.customRequest}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {drinkTotal > 0 && (
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center font-semibold text-lg">
                      <span>飲料小計</span>
                      <span className="text-indigo-600">${drinkTotal}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={onBack}
                    variant="secondary"
                    className="w-full"
                  >
                    返回餐點選擇
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="w-full"
                    size="large"
                    disabled={isDeadlineReached || !hasOrderedDrinks}
                  >
                    完成點餐
                  </Button>
                  {!hasOrderedDrinks && !isDeadlineReached && (
                    <p className="text-sm text-slate-500 text-center">
                      請至少點一杯飲料才能完成點餐
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 飲料客製化彈窗 */}
      {isModalOpen && customizingItem && (
        <DrinkCustomizationModal
          item={customizingItem}
          toppings={drinkShop.toppings || []}
          onComplete={handleCustomizationComplete}
          onCancel={() => {
            setIsModalOpen(false);
            setCustomizingItem(null);
          }}
        />
      )}
    </div>
  );
};

export default DrinkOrdering;
