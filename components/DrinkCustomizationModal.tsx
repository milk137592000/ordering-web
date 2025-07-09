import React, { useState } from 'react';
import { MenuItem, Topping, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';

interface DrinkCustomizationModalProps {
  item: MenuItem;
  toppings: Topping[];
  onComplete: (customizedItem: OrderItem) => void;
  onCancel: () => void;
}

const DrinkCustomizationModal: React.FC<DrinkCustomizationModalProps> = ({
  item,
  toppings,
  onComplete,
  onCancel
}) => {
  const [sweetness, setSweetness] = useState(7);
  const [ice, setIce] = useState(7);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [customRequest, setCustomRequest] = useState('');

  const handleToppingChange = (topping: Topping) => {
    setSelectedToppings(prev =>
      prev.some(t => t.name === topping.name) 
        ? prev.filter(t => t.name !== topping.name) 
        : [...prev, topping]
    );
  };

  const handleSubmit = () => {
    const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0);
    const finalPrice = item.price + toppingsPrice;
    
    const customizedItem: OrderItem = {
      ...item,
      instanceId: `item-${Date.now()}-${Math.random()}`,
      storeType: 'drink_shop',
      price: finalPrice,
      sweetness,
      ice,
      toppings: selectedToppings.map(t => t.name),
      customRequest: customRequest.trim() || undefined,
    };
    
    onComplete(customizedItem);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-2xl font-bold text-indigo-700 mb-2">{item.name}</h3>
          <p className="text-slate-500 mb-6">在加入訂單前客製化您的飲料。</p>

          <div className="space-y-6">
            {/* Sweetness */}
            <div>
              <h4 className="text-lg font-semibold text-slate-700 mb-3">甜度</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">無糖</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={sweetness}
                  onChange={e => setSweetness(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-sm text-slate-500">全糖</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm font-medium text-indigo-600">{sweetness}/10</span>
              </div>
            </div>

            {/* Ice */}
            <div>
              <h4 className="text-lg font-semibold text-slate-700 mb-3">冰塊</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">去冰</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={ice}
                  onChange={e => setIce(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-sm text-slate-500">正常冰</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm font-medium text-indigo-600">{ice}/10</span>
              </div>
            </div>

            {/* Toppings */}
            {toppings && toppings.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-slate-700 mb-3">加料</h4>
                <div className="grid grid-cols-1 gap-2">
                  {toppings.map((topping, index) => (
                    <label key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedToppings.some(t => t.name === topping.name)}
                          onChange={() => handleToppingChange(topping)}
                          className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                        />
                        <span className="font-medium text-slate-700">{topping.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">+${topping.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Request */}
            <div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">其他要求</h4>
              <input
                type="text"
                value={customRequest}
                onChange={e => setCustomRequest(e.target.value)}
                placeholder="例如：多一份珍珠、微糖"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Price Summary */}
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">基本價格</span>
              <span className="font-semibold">${item.price}</span>
            </div>
            {selectedToppings.length > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">加料費用</span>
                <span className="font-semibold">+${selectedToppings.reduce((sum, t) => sum + t.price, 0)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-800">總計</span>
              <span className="text-lg font-bold text-indigo-600">
                ${item.price + selectedToppings.reduce((sum, t) => sum + t.price, 0)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              取消
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              加入訂單
            </Button>
          </div>
        </div>
      </Card>

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

export default DrinkCustomizationModal;
