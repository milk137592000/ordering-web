import React, { useState } from 'react';
import { OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';

interface CustomOptionDialogProps {
  restaurantName: string;
  onConfirm: (customizedItem: OrderItem) => void;
  onCancel: () => void;
}

const CustomOptionDialog: React.FC<CustomOptionDialogProps> = ({
  restaurantName,
  onConfirm,
  onCancel
}) => {
  const [customRequest, setCustomRequest] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const handleConfirm = () => {
    if (!customRequest.trim()) {
      alert('請輸入您的需求');
      return;
    }

    const price = parseFloat(customPrice);
    if (isNaN(price) || price < 0) {
      alert('請輸入有效的價格');
      return;
    }

    console.log('確認自定義選項:', { customRequest, price });
    
    const orderItem: OrderItem = {
      id: 99999, // 特殊ID標識其他選項
      name: '其他選項',
      price: price,
      instanceId: `custom-${Date.now()}-${Math.random()}`,
      storeType: 'restaurant',
      type: 'restaurant',
      quantity: 1,
      customRequest: customRequest.trim(),
      customizations: `自定義需求: ${customRequest.trim()}`
    };

    console.log('創建的自定義訂單項目:', orderItem);
    onConfirm(orderItem);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-indigo-700 mb-2">其他選項</h3>
          <p className="text-slate-500 mb-6">請輸入您在 {restaurantName} 的特殊需求和價格。</p>

          {/* 需求輸入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              您的需求 *
            </label>
            <textarea
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              placeholder="請詳細描述您的需求，例如：加蛋、不要香菜、特殊調味等..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={4}
            />
          </div>

          {/* 價格輸入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              價格 (NT$) *
            </label>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="請輸入價格"
              min="0"
              step="1"
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

export default CustomOptionDialog;
