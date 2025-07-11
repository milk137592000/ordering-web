
import React, { useMemo } from 'react';
import { MemberOrder, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { RefreshIcon, ArrowLeftIcon } from './icons';

interface SummaryDisplayProps {
  orders: MemberOrder[];
  memberNameMap: Map<string, string>;
  onStartOver: () => void;
  onBack: () => void;
  orderDate: string;
  orderId: string;
  restaurantName?: string;
  drinkShopName?: string;
}

const SummaryDisplay: React.FC<SummaryDisplayProps> = ({
  orders,
  memberNameMap,
  onStartOver,
  onBack,
  orderDate,
  orderId,
  restaurantName,
  drinkShopName
}) => {

  const calculateSubtotal = (items: OrderItem[], type: 'restaurant' | 'drink_shop') => {
    return items.filter(item => item.storeType === type).reduce((sum, item) => sum + item.price, 0);
  };

  const totals = useMemo(() => {
    console.log('🔍 SummaryDisplay 計算總金額 - orders:', orders);

    const grandTotal = orders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => {
        console.log(`🔍 計算項目: ${item.name}, 價格: ${item.price}`);
        return itemSum + item.price;
      }, 0);
      console.log(`🔍 成員 ${order.memberId} 總計: ${orderTotal}`);
      return sum + orderTotal;
    }, 0);

    const foodTotal = orders.reduce((sum, order) => sum + calculateSubtotal(order.items, 'restaurant'), 0);
    const drinkTotal = orders.reduce((sum, order) => sum + calculateSubtotal(order.items, 'drink_shop'), 0);

    console.log('🔍 SummaryDisplay 計算結果:', { grandTotal, foodTotal, drinkTotal });

    return { grandTotal, foodTotal, drinkTotal };
  }, [orders]);
  
  const renderCustomizations = (item: OrderItem) => {
    if (item.storeType !== 'drink_shop') return null;

    const details = [
        `甜度: ${item.sweetness}/10`,
        `冰塊: ${item.ice}/10`,
    ];

    if (item.toppings && item.toppings.length > 0) {
        details.push(`加料: ${item.toppings.join(', ')}`);
    }

    if (item.customRequest) {
        details.push(`其他: ${item.customRequest}`);
    }

    return (
        <p className="text-xs text-slate-500 pl-4">
            - {details.join(', ')}
        </p>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div>
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800">訂單總覽</h2>
            <div className="mt-4 space-y-2">
                <p className="text-lg font-semibold text-indigo-600">
                    📅 {formatDate(orderDate)} {formatTime(orderDate)}
                </p>
                <p className="text-sm text-slate-500">訂單編號: {orderId}</p>
                {(restaurantName || drinkShopName) && (
                    <div className="text-sm text-slate-600">
                        {restaurantName && <span>🍽️ {restaurantName}</span>}
                        {restaurantName && drinkShopName && <span className="mx-2">•</span>}
                        {drinkShopName && <span>🥤 {drinkShopName}</span>}
                    </div>
                )}
            </div>
            <p className="text-slate-500 mt-4">這是所有人的訂單明細。</p>
        </div>

        <div className="space-y-6">
            {orders.map(order => {
                if(order.items.length === 0) return null;
                
                const memberName = memberNameMap.get(order.memberId) || '未知成員';
                const foodItems = order.items.filter(i => i.storeType === 'restaurant');
                const drinkItems = order.items.filter(i => i.storeType === 'drink_shop');
                const foodSubtotal = calculateSubtotal(order.items, 'restaurant');
                const drinkSubtotal = calculateSubtotal(order.items, 'drink_shop');
                const memberTotal = foodSubtotal + drinkSubtotal;

                return (
                    <Card key={order.memberId}>
                        <div className="p-5">
                            <div className="flex justify-between items-baseline mb-4">
                                <h3 className="text-xl font-semibold text-slate-800">{memberName}</h3>
                                <p className="text-lg font-bold text-indigo-600">總計: ${memberTotal.toFixed(2)}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <h4 className="font-semibold text-slate-600 border-b pb-1 mb-2">餐點 (${foodSubtotal.toFixed(2)})</h4>
                                    {foodItems.length > 0 ? (
                                        <ul className="space-y-1 text-sm">
                                            {foodItems.map((item) => (
                                                <li key={item.instanceId} className="flex justify-between">
                                                    <span>{item.name}</span>
                                                    <span>${item.price.toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-sm text-slate-400">沒有點餐。</p>}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-600 border-b pb-1 mb-2">飲料 (${drinkSubtotal.toFixed(2)})</h4>
                                    {drinkItems.length > 0 ? (
                                        <ul className="space-y-1 text-sm">
                                            {drinkItems.map((item) => (
                                               <li key={item.instanceId}>
                                                    <div className="flex justify-between">
                                                        <span>{item.name}</span>
                                                        <span>${item.price.toFixed(2)}</span>
                                                    </div>
                                                    {renderCustomizations(item)}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-sm text-slate-400">沒有點飲料。</p>}
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>

        <Card className="mt-8 bg-slate-800 text-white">
            <div className="p-6">
                <h3 className="text-2xl font-bold mb-4">費用總計</h3>
                <div className="space-y-2 text-lg">
                    <div className="flex justify-between">
                        <span className="text-slate-300">餐點總費用:</span>
                        <span className="font-semibold">${totals.foodTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-300">飲料總費用:</span>
                        <span className="font-semibold">${totals.drinkTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold pt-2 border-t border-slate-600 mt-2">
                        <span className="text-indigo-400">總金額:</span>
                        <span className="text-indigo-400" data-testid="total-amount">${totals.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </Card>

        <div className="mt-8 text-center flex items-center justify-center gap-4">
            <Button onClick={onBack} size="large" variant="secondary">
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                返回點餐頁面
            </Button>
            <Button onClick={onStartOver} size="large">
                <RefreshIcon className="h-5 w-5 mr-2" />
                完成訂單
            </Button>
        </div>
    </div>
  );
};

export default SummaryDisplay;