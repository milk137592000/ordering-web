import React, { useState } from 'react';
import { OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';

interface RestaurantCustomizationDialogProps {
  item: any;
  restaurant: any;
  onConfirm: (customizedItem: OrderItem) => void;
  onCancel: () => void;
}

const RestaurantCustomizationDialog: React.FC<RestaurantCustomizationDialogProps> = ({
  item,
  restaurant,
  onConfirm,
  onCancel
}) => {
  console.log('RestaurantCustomizationDialog 渲染，item:', item, 'restaurant:', restaurant);
  const [otherRequirements, setOtherRequirements] = useState('');
  const [additionalCost, setAdditionalCost] = useState(0);

  const handleConfirm = () => {
    console.log('確認餐點客製化:', { otherRequirements, additionalCost, itemName: item.name });

    // 計算總價格（原價 + 額外費用）
    const totalPrice = item.price + additionalCost;

    // 建立客製化描述
    let customizations = '';
    if (otherRequirements.trim()) {
      customizations = `其他要求：${otherRequirements.trim()}`;
    }
    if (additionalCost > 0) {
      if (customizations) {
        customizations += `，額外費用：$${additionalCost}`;
      } else {
        customizations = `額外費用：$${additionalCost}`;
      }
    }

    const orderItem: OrderItem = {
      id: item.id,
      name: item.name,
      price: totalPrice,
      instanceId: `restaurant-${item.id}-${Date.now()}-${Math.random()}`,
      storeType: 'restaurant',
      type: 'restaurant',
      quantity: 1,
      storeId: restaurant?.id || 0,
      storeName: restaurant?.name || '',
      customRequest: otherRequirements.trim() || undefined,
      customizations: customizations || undefined
    };

    console.log('創建的餐點訂單項目:', orderItem);
    onConfirm(orderItem);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-indigo-700 mb-2">客製化餐點</h3>
          <p className="text-slate-500 mb-6">為您的餐點添加特殊要求。</p>
          
          <div className="mb-4">
            <h4 className="font-semibold text-indigo-600 mb-2">{item.name}</h4>
            <p className="text-gray-600">
              原價：NT$ {item.price}
              {additionalCost > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  + NT$ {additionalCost} = NT$ {item.price + additionalCost}
                </span>
              )}
            </p>
          </div>

          {/* 其他要求輸入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              其他要求
            </label>
            <textarea
              value={otherRequirements}
              onChange={(e) => setOtherRequirements(e.target.value)}
              placeholder="請輸入特殊要求，例如：加蛋、不要香菜、辣度調整等..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={3}
            />
          </div>

          {/* 額外費用輸入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              額外費用 (NT$)
            </label>
            <input
              type="text"
              value={additionalCost}
              onChange={(e) => setAdditionalCost(Number(e.target.value) || 0)}
              placeholder="如有額外費用請輸入"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="secondary"
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              確認加入
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RestaurantCustomizationDialog;
