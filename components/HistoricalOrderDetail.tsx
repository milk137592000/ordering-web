import React, { useMemo } from 'react';
import { HistoricalOrder, OrderItem } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { ArrowLeftIcon } from './icons';

interface HistoricalOrderDetailProps {
  order: HistoricalOrder;
  onBack: () => void;
}

const HistoricalOrderDetail: React.FC<HistoricalOrderDetailProps> = ({ order, onBack }) => {
  
  const calculateSubtotal = (items: OrderItem[], type: 'restaurant' | 'drink_shop') => {
    return items.filter(item => item.storeType === type).reduce((sum, item) => sum + item.price, 0);
  };

  const totals = useMemo(() => {
    const grandTotal = order.orders.reduce((sum, memberOrder) => 
      sum + memberOrder.items.reduce((itemSum, item) => itemSum + item.price, 0), 0);
    const foodTotal = order.orders.reduce((sum, memberOrder) => 
      sum + calculateSubtotal(memberOrder.items, 'restaurant'), 0);
    const drinkTotal = order.orders.reduce((sum, memberOrder) => 
      sum + calculateSubtotal(memberOrder.items, 'drink_shop'), 0);
    return { grandTotal, foodTotal, drinkTotal };
  }, [order.orders]);

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    order.teamMembers.forEach(member => {
      map.set(member.id, member.name);
    });
    return map;
  }, [order.teamMembers]);
  
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
      minute: '2-digit'
    });
  };

  return (
    <div>
        <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">歷史訂單詳情</h2>
                <div className="mt-4 space-y-2">
                    <p className="text-lg font-semibold text-indigo-600">
                        📅 {formatDate(order.orderDate)} {formatTime(order.orderDate)}
                    </p>
                    <p className="text-sm text-slate-500">訂單編號: {order.orderId}</p>
                    <p className="text-sm text-slate-500">
                        完成時間: {formatDate(order.completedAt)} {formatTime(order.completedAt)}
                    </p>
                    {(order.restaurantName || order.drinkShopName) && (
                        <div className="text-sm text-slate-600">
                            {order.restaurantName && <span>🍽️ {order.restaurantName}</span>}
                            {order.restaurantName && order.drinkShopName && <span className="mx-2">•</span>}
                            {order.drinkShopName && <span>🥤 {order.drinkShopName}</span>}
                        </div>
                    )}
                </div>
            </div>
            <Button onClick={onBack} variant="secondary">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                返回列表
            </Button>
        </div>

        <div className="space-y-6">
            {order.orders.map(memberOrder => {
                if(memberOrder.items.length === 0) return null;
                
                const memberName = memberNameMap.get(memberOrder.memberId) || '未知成員';
                const foodItems = memberOrder.items.filter(i => i.storeType === 'restaurant');
                const drinkItems = memberOrder.items.filter(i => i.storeType === 'drink_shop');
                const foodSubtotal = calculateSubtotal(memberOrder.items, 'restaurant');
                const drinkSubtotal = calculateSubtotal(memberOrder.items, 'drink_shop');
                const memberTotal = foodSubtotal + drinkSubtotal;

                return (
                    <Card key={memberOrder.memberId}>
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
                                    ) : (
                                        <p className="text-slate-400 text-sm italic">未點餐點</p>
                                    )}
                                </div>

                                <div>
                                    <h4 className="font-semibold text-slate-600 border-b pb-1 mb-2">飲料 (${drinkSubtotal.toFixed(2)})</h4>
                                    {drinkItems.length > 0 ? (
                                        <div className="space-y-2 text-sm">
                                            {drinkItems.map((item) => (
                                                <div key={item.instanceId}>
                                                    <div className="flex justify-between">
                                                        <span>{item.name}</span>
                                                        <span>${item.price.toFixed(2)}</span>
                                                    </div>
                                                    {renderCustomizations(item)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm italic">未點飲料</p>
                                    )}
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
                        <span className="text-indigo-400">${totals.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </Card>
    </div>
  );
};

export default HistoricalOrderDetail;
