import React from 'react';
import { OrderItem, UserRole } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { CheckIcon, ClockIcon, UserIcon } from './icons';

interface PersonalOrderSummaryProps {
  personalOrder: OrderItem[];
  userName: string;
  userRole: UserRole;
  orderId: string;
  deadline: Date | null;
  isDeadlineReached: boolean;
  isOrderClosed: boolean;
  restaurantName?: string;
  drinkShopName?: string;
  onEditOrder: () => void;
  onViewAllOrders?: () => void; // 僅管理員可用
  onCloseOrder?: () => void; // 僅管理員可用
}

const PersonalOrderSummary: React.FC<PersonalOrderSummaryProps> = ({
  personalOrder,
  userName,
  userRole,
  orderId,
  deadline,
  isDeadlineReached,
  isOrderClosed,
  restaurantName,
  drinkShopName,
  onEditOrder,
  onViewAllOrders,
  onCloseOrder
}) => {
  const restaurantItems = personalOrder.filter(item => item.storeType === 'restaurant');
  const drinkItems = personalOrder.filter(item => item.storeType === 'drink_shop');
  
  const restaurantTotal = restaurantItems.reduce((sum, item) => sum + item.price, 0);
  const drinkTotal = drinkItems.reduce((sum, item) => sum + item.price, 0);
  const grandTotal = restaurantTotal + drinkTotal;

  const renderOrderItems = (items: OrderItem[], title: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">{title}</h3>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.instanceId} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">${item.price}</p>
                </div>
              </div>
              {item.storeType === 'drink_shop' && (item.sweetness !== undefined || item.ice !== undefined || item.toppings?.length || item.customRequest) && (
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  {item.sweetness !== undefined && <p>甜度: {item.sweetness}/10</p>}
                  {item.ice !== undefined && <p>冰塊: {item.ice}/10</p>}
                  {item.toppings?.length && <p>加料: {item.toppings.join(', ')}</p>}
                  {item.customRequest && <p>備註: {item.customRequest}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="p-6">
            {/* 標題區域 */}
            <div className="text-center mb-6">
              <CheckIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">點餐完成！</h1>
              <p className="text-slate-600">感謝您的點餐，以下是您的訂單詳情</p>
            </div>

            {/* 訂單資訊 */}
            <div className="bg-indigo-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">訂單ID</p>
                  <p className="font-semibold text-slate-800">{orderId}</p>
                </div>
                <div>
                  <p className="text-slate-600">點餐人</p>
                  <p className="font-semibold text-slate-800">
                    {userName}
                    {userRole === UserRole.ADMIN && (
                      <span className="ml-2 px-2 py-1 bg-indigo-200 text-indigo-800 text-xs rounded-full">
                        管理員
                      </span>
                    )}
                  </p>
                </div>
                {deadline && (
                  <div>
                    <p className="text-slate-600">截止時間</p>
                    <p className={`font-semibold ${isDeadlineReached ? 'text-red-600' : 'text-slate-800'}`}>
                      {deadline.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      {isDeadlineReached && ' (已截止)'}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-slate-600">訂單狀態</p>
                  <p className={`font-semibold ${isOrderClosed ? 'text-green-600' : 'text-yellow-600'}`}>
                    {isOrderClosed ? '已收單' : '進行中'}
                  </p>
                </div>
              </div>
            </div>

            {/* 店家資訊 */}
            {(restaurantName || drinkShopName) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">選擇的店家</h3>
                <div className="space-y-2">
                  {restaurantName && (
                    <p className="text-slate-600">🍽️ 餐廳：{restaurantName}</p>
                  )}
                  {drinkShopName && (
                    <p className="text-slate-600">🥤 飲料店：{drinkShopName}</p>
                  )}
                </div>
              </div>
            )}

            {/* 訂單內容 */}
            {personalOrder.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">您還沒有點任何餐點</p>
              </div>
            ) : (
              <>
                {renderOrderItems(restaurantItems, '餐點')}
                {renderOrderItems(drinkItems, '飲料')}

                {/* 總計 */}
                <div className="border-t pt-4">
                  {restaurantTotal > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-600">餐點小計</span>
                      <span className="font-semibold">${restaurantTotal}</span>
                    </div>
                  )}
                  {drinkTotal > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-600">飲料小計</span>
                      <span className="font-semibold">${drinkTotal}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold text-indigo-600 border-t pt-2">
                    <span>總計</span>
                    <span>${grandTotal}</span>
                  </div>
                </div>
              </>
            )}

            {/* 操作按鈕 */}
            <div className="mt-6 space-y-3">
              {!isOrderClosed && !isDeadlineReached && (
                <Button
                  onClick={onEditOrder}
                  variant="secondary"
                  className="w-full"
                >
                  修改訂單
                </Button>
              )}

              {userRole === UserRole.ADMIN && (
                <>
                  {onViewAllOrders && (
                    <Button
                      onClick={onViewAllOrders}
                      className="w-full"
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      查看所有人的訂單
                    </Button>
                  )}
                  {onCloseOrder && !isOrderClosed && (
                    <Button
                      onClick={onCloseOrder}
                      variant="danger"
                      className="w-full"
                    >
                      <ClockIcon className="w-4 h-4 mr-2" />
                      提早收單
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* 提示訊息 */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700">
                💡 提示：您可以隨時回到這個頁面查看您的訂單。
                {userRole === UserRole.ADMIN && ' 作為管理員，您可以查看所有人的訂單並提早收單。'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PersonalOrderSummary;
