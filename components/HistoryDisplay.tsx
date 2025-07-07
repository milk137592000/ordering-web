import React, { useState, useEffect } from 'react';
import { HistoricalOrder } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from './icons';
import { db, doc, onSnapshot, getDoc } from '../firebase';

interface HistoryDisplayProps {
  onBack: () => void;
  onViewOrder: (order: HistoricalOrder) => void;
}

const HistoryDisplay: React.FC<HistoryDisplayProps> = ({ onBack, onViewOrder }) => {
  const [historicalOrders, setHistoricalOrders] = useState<HistoricalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistoricalOrders = async () => {
      try {
        setIsLoading(true);
        // Get the list of historical order IDs
        const historyRef = doc(db, 'history', 'order_list');
        const historySnap = await getDoc(historyRef);
        
        if (historySnap.exists()) {
          const orderIds = historySnap.data().orderIds || [];
          
          // Load each historical order
          const orders: HistoricalOrder[] = [];
          for (const orderId of orderIds) {
            const orderRef = doc(db, 'historical_orders', orderId);
            const orderSnap = await getDoc(orderRef);
            if (orderSnap.exists()) {
              orders.push(orderSnap.data() as HistoricalOrder);
            }
          }
          
          // Sort by completion date (newest first)
          orders.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
          setHistoricalOrders(orders);
        }
      } catch (err) {
        console.error('載入歷史訂單錯誤:', err);
        setError('無法載入歷史訂單');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoricalOrders();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-slate-500">載入歷史訂單中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onBack} variant="secondary">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">歷史訂單</h2>
          <p className="text-slate-500 mt-2">查看過往的訂餐記錄</p>
        </div>
        <Button onClick={onBack} variant="secondary">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      {historicalOrders.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">尚無歷史訂單</h3>
            <p className="text-slate-500">完成第一筆訂單後，就會在這裡顯示歷史記錄。</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {historicalOrders.map((order) => (
            <Card key={order.orderId} className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-6" onClick={() => onViewOrder(order)}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {formatDate(order.orderDate)}
                    </h3>
                    <div className="flex items-center text-sm text-slate-500 space-x-4">
                      <span className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {formatTime(order.orderDate)}
                      </span>
                      <span>訂單編號: {order.orderId.slice(-8)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-indigo-600">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {order.orders.filter(o => o.items.length > 0).length} 人點餐
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm">
                  {order.restaurantName && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      🍽️ {order.restaurantName}
                    </span>
                  )}
                  {order.drinkShopName && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      🥤 {order.drinkShopName}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryDisplay;
