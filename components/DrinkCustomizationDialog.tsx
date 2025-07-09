import React, { useState } from 'react';
import { OrderItem } from '../types';

interface DrinkCustomizationDialogProps {
  item: any;
  drinkShop: any;
  onConfirm: (customizedItem: OrderItem) => void;
  onCancel: () => void;
}

const DrinkCustomizationDialog: React.FC<DrinkCustomizationDialogProps> = ({
  item,
  drinkShop,
  onConfirm,
  onCancel
}) => {
  const [sweetness, setSweetness] = useState(7);
  const [ice, setIce] = useState(7);

  const handleConfirm = () => {
    const orderItem: OrderItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      instanceId: `drink-${item.id}-${Date.now()}-${Math.random()}`,
      storeType: 'drink_shop',
      type: 'drink',
      quantity: 1,
      storeId: drinkShop?.id || 0,
      storeName: drinkShop?.name || '',
      sweetness,
      ice,
      customizations: `甜度${sweetness}分，冰塊${ice}分`
    };

    onConfirm(orderItem);
  };

  const getSweetnessLabel = (value: number) => {
    if (value === 0) return '無糖';
    if (value <= 3) return '微糖';
    if (value <= 5) return '半糖';
    if (value <= 7) return '少糖';
    if (value <= 9) return '正常糖';
    return '全糖';
  };

  const getIceLabel = (value: number) => {
    if (value === 0) return '去冰';
    if (value <= 3) return '微冰';
    if (value <= 5) return '少冰';
    if (value <= 7) return '正常冰';
    if (value <= 9) return '多冰';
    return '滿冰';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">客製化飲料</h3>
        
        <div className="mb-4">
          <h4 className="font-semibold text-indigo-600 mb-2">{item.name}</h4>
          <p className="text-gray-600">NT$ {item.price}</p>
        </div>

        {/* 甜度選擇 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            甜度：{getSweetnessLabel(sweetness)} ({sweetness}分)
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={sweetness}
            onChange={(e) => setSweetness(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 (無糖)</span>
            <span>5 (半糖)</span>
            <span>10 (全糖)</span>
          </div>
        </div>

        {/* 冰塊選擇 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            冰塊：{getIceLabel(ice)} ({ice}分)
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={ice}
            onChange={(e) => setIce(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 (去冰)</span>
            <span>5 (少冰)</span>
            <span>10 (滿冰)</span>
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            確認加入
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default DrinkCustomizationDialog;
