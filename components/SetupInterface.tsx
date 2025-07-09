import React, { useState, useEffect } from 'react';
import { Store } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { ClockIcon, StoreIcon, ShuffleIcon } from './icons';

interface SetupInterfaceProps {
  restaurants: Store[];
  drinkShops: Store[];
  onComplete: (deadline: string, restaurantId: number | null, drinkShopId: number | null) => void;
  orderId: string;
}

const SetupInterface: React.FC<SetupInterfaceProps> = ({
  restaurants,
  drinkShops,
  onComplete,
  orderId
}) => {
  const [deadline, setDeadline] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [selectedDrinkShopId, setSelectedDrinkShopId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // 調試：檢查接收到的數據
  useEffect(() => {
    console.log('SetupInterface 接收到的餐廳數據:', restaurants);
    console.log('SetupInterface 接收到的飲料店數據:', drinkShops);
  }, [restaurants, drinkShops]);

  // 設定預設截止時間（30分鐘後）
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const defaultTime = now.toTimeString().slice(0, 5);
    setDeadline(defaultTime);
  }, []);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!deadline) {
        alert('請設定截止時間');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else {
      // 完成設定
      if (!selectedRestaurantId && !selectedDrinkShopId) {
        alert('請至少選擇一間餐廳或飲料店');
        return;
      }
      onComplete(deadline, selectedRestaurantId, selectedDrinkShopId);
    }
  };

  const handleRandomRestaurant = () => {
    if (restaurants.length === 0) {
      alert('沒有可選擇的餐廳');
      return;
    }
    const randomIndex = Math.floor(Math.random() * restaurants.length);
    setSelectedRestaurantId(restaurants[randomIndex].id);
  };

  const handleRandomDrinkShop = () => {
    if (drinkShops.length === 0) {
      alert('沒有可選擇的飲料店');
      return;
    }
    const randomIndex = Math.floor(Math.random() * drinkShops.length);
    setSelectedDrinkShopId(drinkShops[randomIndex].id);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <ClockIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">設定訂單截止時間</h2>
              <p className="text-slate-600">設定一個截止時間，讓大家知道什麼時候要完成點餐</p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-indigo-700 mb-2">
                <strong>訂單ID：</strong>{orderId}
              </p>
              <p className="text-xs text-indigo-600">
                請將此ID分享給其他人，讓他們可以加入點餐
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                截止時間
              </label>
              <input
                type="time"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                建議設定在30-60分鐘後，給大家足夠的點餐時間
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <StoreIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">選擇餐廳</h2>
              <p className="text-slate-600">選擇一間餐廳，或跳過此步驟</p>
            </div>

            <div className="text-center mb-4">
              <Button
                onClick={handleRandomRestaurant}
                disabled={restaurants.length === 0}
                className="mb-4"
              >
                <ShuffleIcon className="h-5 w-5 mr-2" />
                隨機選擇餐廳！
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {restaurants.length === 0 && (
                <div className="text-center text-slate-500 py-4">
                  沒有載入到餐廳數據
                </div>
              )}
              {restaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurantId(restaurant.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedRestaurantId === restaurant.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <h3 className="font-semibold">{restaurant.name}</h3>
                  <p className="text-sm text-slate-600">
                    {restaurant.menu.length} 個分類，
                    {restaurant.menu.reduce((total, cat) => total + cat.items.length, 0)} 道菜
                  </p>
                </button>
              ))}
            </div>

            <Button
              onClick={() => setSelectedRestaurantId(null)}
              variant="secondary"
              className="w-full"
            >
              跳過餐廳選擇
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <StoreIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">選擇飲料店</h2>
              <p className="text-slate-600">選擇一間飲料店，或跳過此步驟</p>
            </div>

            <div className="text-center mb-4">
              <Button
                onClick={handleRandomDrinkShop}
                disabled={drinkShops.length === 0}
                className="mb-4"
              >
                <ShuffleIcon className="h-5 w-5 mr-2" />
                隨機選擇飲料店！
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {drinkShops.length === 0 && (
                <div className="text-center text-slate-500 py-4">
                  沒有載入到飲料店數據
                </div>
              )}
              {drinkShops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => setSelectedDrinkShopId(shop.id)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedDrinkShopId === shop.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <h3 className="font-semibold">{shop.name}</h3>
                  <p className="text-sm text-slate-600">
                    {shop.menu.length} 個分類，
                    {shop.menu.reduce((total, cat) => total + cat.items.length, 0)} 種飲料
                  </p>
                </button>
              ))}
            </div>

            <Button
              onClick={() => setSelectedDrinkShopId(null)}
              variant="secondary"
              className="w-full"
            >
              跳過飲料店選擇
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          {/* 進度指示器 */}
          <div className="flex items-center justify-center mb-6">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step <= currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-8 h-1 ${
                      step < currentStep ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {renderStepContent()}

          <div className="flex gap-3 mt-6">
            {currentStep > 1 && (
              <Button onClick={handleBack} variant="secondary" className="flex-1">
                上一步
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1">
              {currentStep === 3 ? '完成設定' : '下一步'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SetupInterface;
