
import React, { useState, useEffect } from 'react';
import { TeamMember, Store, MemberOrder, MenuItem, OrderItem, Topping } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { TrashIcon, CheckCircleIcon, ArrowLeftIcon, UserPlusIcon, ClockIcon } from './icons';

interface OrderingInterfaceProps {
  teamMembers: TeamMember[];
  restaurant: Store | null;
  drinkShop: Store | null;
  orders: MemberOrder[];
  onAddItem: (memberId: string, item: OrderItem) => void;
  onRemoveItem: (memberId: string, itemInstanceId: string) => void;
  onFinish: () => void;
  onBack: () => void;
  memberNameMap: Map<string, string>;
  onAddTemporaryMember: (name: string) => string;
  deadline: Date | null;
  isDeadlineReached: boolean;
  onSetDeadline: (time: string) => void;
}

const DrinkCustomizationModal: React.FC<{
    item: MenuItem;
    toppings: Topping[];
    onClose: () => void;
    onConfirm: (customizations: { sweetness: number; ice: number; toppings: string[]; customRequest: string; price: number }) => void;
}> = ({ item, toppings, onClose, onConfirm }) => {
    const [sweetness, setSweetness] = useState(7);
    const [ice, setIce] = useState(7);
    const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
    const [customRequest, setCustomRequest] = useState('');

    const handleToppingChange = (topping: Topping) => {
        setSelectedToppings(prev =>
            prev.some(t => t.name === topping.name) ? prev.filter(t => t.name !== topping.name) : [...prev, topping]
        );
    };

    const handleSubmit = () => {
        const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0);
        const finalPrice = item.price + toppingsPrice;
        onConfirm({
            sweetness,
            ice,
            toppings: selectedToppings.map(t => t.name),
            customRequest: customRequest.trim(),
            price: finalPrice,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-2xl font-bold text-indigo-700 mb-2">{item.name}</h3>
                    <p className="text-slate-500 mb-6">在加入訂單前客製化您的飲料。</p>

                    <div className="space-y-6">
                        {/* Sweetness */}
                        <div>
                            <label htmlFor="sweetness" className="block text-lg font-semibold text-slate-700 mb-2">甜度: {sweetness}</label>
                            <input
                                id="sweetness"
                                type="range"
                                min="0"
                                max="10"
                                value={sweetness}
                                onChange={e => setSweetness(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>無糖</span>
                                <span>正常甜</span>
                            </div>
                        </div>

                        {/* Ice */}
                        <div>
                            <label htmlFor="ice" className="block text-lg font-semibold text-slate-700 mb-2">冰塊: {ice}</label>
                            <input
                                id="ice"
                                type="range"
                                min="0"
                                max="10"
                                value={ice}
                                onChange={e => setIce(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>去冰</span>
                                <span>正常冰</span>
                            </div>
                        </div>

                        {/* Toppings */}
                        {toppings.length > 0 && (
                          <div>
                              <h4 className="text-lg font-semibold text-slate-700 mb-2">加料</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {toppings.map(topping => (
                                      <label key={topping.name} className={`flex items-center justify-between gap-2 p-2 rounded-lg border-2 cursor-pointer transition-colors ${selectedToppings.some(t => t.name === topping.name) ? 'bg-indigo-100 border-indigo-500' : 'bg-white border-slate-200'}`}>
                                          <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedToppings.some(t => t.name === topping.name)}
                                                onChange={() => handleToppingChange(topping)}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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

                    <div className="mt-8 flex justify-end gap-3">
                        <Button variant="secondary" onClick={onClose}>取消</Button>
                        <Button onClick={handleSubmit}>加入訂單</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};


const OrderingInterface: React.FC<OrderingInterfaceProps> = ({
  teamMembers,
  restaurant,
  drinkShop,
  orders,
  onAddItem,
  onRemoveItem,
  onFinish,
  onBack,
  memberNameMap,
  onAddTemporaryMember,
  deadline,
  isDeadlineReached,
  onSetDeadline,
}) => {
  const [activeMemberId, setActiveMemberId] = useState<string>(teamMembers[0]?.id || '');
  const [tempMemberName, setTempMemberName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const [timeInput, setTimeInput] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    // If the active member is no longer in the list (e.g., after a reset),
    // or if no member is selected yet, default to the first member.
    if (teamMembers.length > 0) {
      const memberExists = teamMembers.some(m => m.id === activeMemberId);
      if (!memberExists) {
        setActiveMemberId(teamMembers[0].id);
      }
    }
  }, [teamMembers, activeMemberId]);

  useEffect(() => {
    if (!deadline || isDeadlineReached) {
        setTimeLeft('');
        return;
    }
    const intervalId = setInterval(() => {
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        if (diff <= 0) {
            setTimeLeft('00:00');
            clearInterval(intervalId);
            return;
        }
        const minutes = Math.floor(diff / 1000 / 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [deadline, isDeadlineReached]);


  const handleAddClick = (item: MenuItem, storeType: 'restaurant' | 'drink_shop') => {
      if (!activeMemberId) {
        alert("請先選擇一位團隊成員。");
        return;
      }

      if (storeType === 'drink_shop') {
          setCustomizingItem(item);
          setIsModalOpen(true);
      } else {
          const newOrderItem: OrderItem = {
              ...item,
              instanceId: `item-${Date.now()}-${Math.random()}`,
              storeType: 'restaurant',
          };
          onAddItem(activeMemberId, newOrderItem);
      }
  };

  const handleConfirmCustomization = (customizations: { sweetness: number; ice: number; toppings: string[], customRequest: string; price: number }) => {
      if (!customizingItem || !activeMemberId) return;
      
      const { price, ...rest } = customizations;

      const newOrderItem: OrderItem = {
          ...customizingItem,
          price: price,
          instanceId: `item-${Date.now()}-${Math.random()}`,
          storeType: 'drink_shop',
          ...rest,
      };
      onAddItem(activeMemberId, newOrderItem);

      setIsModalOpen(false);
      setCustomizingItem(null);
  };

  const handleAddTempMember = () => {
    if (tempMemberName.trim()) {
      const newMemberId = onAddTemporaryMember(tempMemberName.trim());
      setActiveMemberId(newMemberId);
      setTempMemberName('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTempMember();
    }
  };

  const handleSetDeadline = () => {
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeInput)) {
        onSetDeadline(timeInput);
    } else {
        alert('請輸入有效的24小時制時間格式 (HH:MM)，例如：14:30。');
    }
  };
  
  const handleClearDeadline = () => {
      onSetDeadline('');
      setTimeInput('');
  };
  
  const MenuSection: React.FC<{ store: Store }> = ({ store }) => (
    <Card className="flex-1">
      <div className="p-4">
        <h3 className="text-xl font-bold text-indigo-700 mb-4">{store.name}</h3>
        <div className="space-y-4">
          {store.menu.map((category, catIndex) => (
            <div key={catIndex}>
              {category.name && (
                <h4 className="text-lg font-semibold text-slate-600 border-b-2 border-indigo-200 pb-2 mb-3">
                  {category.name}
                </h4>
              )}
              <div className="space-y-3">
                {category.items.map(item => (
                  <div key={item.id} className="w-full flex justify-between items-center p-3 bg-white rounded-lg shadow-sm" data-testid="menu-item">
                    <div>
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-sm text-slate-500">${item.price.toFixed(2)}</p>
                    </div>
                    <Button onClick={() => handleAddClick(item, store.type)} size="small" disabled={!activeMemberId || isDeadlineReached}>
                      新增
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  return (
    <div>
        {isModalOpen && customizingItem && (
            <DrinkCustomizationModal 
                item={customizingItem} 
                toppings={drinkShop?.toppings || []}
                onClose={() => setIsModalOpen(false)} 
                onConfirm={handleConfirmCustomization}
            />
        )}

        <Card className="mb-6 bg-indigo-50 border-indigo-200">
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <ClockIcon className="h-6 w-6 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-indigo-800">設定訂單截止時間</h3>
                </div>
                <div className="flex-grow flex items-center justify-center sm:justify-end">
                {isDeadlineReached ? (
                    <div className="text-center font-bold text-red-600 bg-red-100 px-4 py-2 rounded-lg">
                        收單時間已到！
                    </div>
                ) : deadline ? (
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-sm text-slate-600">剩餘時間</p>
                            <p className="text-2xl font-bold text-indigo-600 tabular-nums">{timeLeft}</p>
                        </div>
                        <Button onClick={handleClearDeadline} variant="secondary" size="small">清除</Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={timeInput}
                            onChange={(e) => setTimeInput(e.target.value)}
                            placeholder="設定截止時間 (HH:MM)"
                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg w-28 text-center placeholder:text-slate-400"
                        />
                        <Button onClick={handleSetDeadline} disabled={!timeInput}>設定截止時間</Button>
                    </div>
                )}
                </div>
            </div>
        </Card>

        <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-slate-800">開始點餐</h2>
            <p className="text-slate-500 mt-2">選擇一位成員並為他們新增餐點。</p>
        </div>

        <Card className="mb-6">
            <div className="p-4">
                <label htmlFor="member-select" className="block text-sm font-medium text-slate-700 mb-2">
                    現在是誰在點餐？
                </label>
                <select
                    id="member-select"
                    value={activeMemberId}
                    onChange={(e) => setActiveMemberId(e.target.value)}
                    disabled={isDeadlineReached}
                    className="w-full p-3 bg-white border-2 border-slate-300 rounded-lg text-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm disabled:bg-slate-100"
                >
                    <option value="" disabled>-- 選擇一位成員 --</option>
                    {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                </select>
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <label htmlFor="temp-member-name" className="block text-sm font-medium text-slate-700 mb-2">
                        新增加班人員
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="temp-member-name"
                            type="text"
                            value={tempMemberName}
                            onChange={e => setTempMemberName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="輸入臨時成員姓名"
                            disabled={isDeadlineReached}
                            className="flex-grow px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-slate-200"
                        />
                        <Button onClick={handleAddTempMember} disabled={!tempMemberName.trim() || isDeadlineReached} variant="secondary">
                            <UserPlusIcon className="h-5 w-5 mr-2" />
                            新增臨時成員
                        </Button>
                    </div>
                </div>

            </div>
        </Card>

      <div className={`grid grid-cols-1 ${restaurant && drinkShop ? 'lg:grid-cols-2' : ''} gap-6 mb-8`}>
        {restaurant && <MenuSection store={restaurant} />}
        {drinkShop && <MenuSection store={drinkShop} />}
      </div>
      
      <Card>
          <div className="p-4">
            <h3 className="text-2xl font-bold text-slate-800 mb-4">即時訂單總覽</h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-slate-600">成員</th>
                            <th className="p-3 text-sm font-semibold text-slate-600">餐點</th>
                            <th className="p-3 text-sm font-semibold text-slate-600 text-right">總計</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => {
                             const memberName = memberNameMap.get(order.memberId) || '未知成員';
                             const total = order.items.reduce((sum, i) => sum + i.price, 0);
                            return (
                                <tr key={order.memberId} className="border-b">
                                    <td className="p-3 font-medium align-top">{memberName}</td>
                                    <td className="p-3">
                                        {order.items.length > 0 ? order.items.map((item) => (
                                            <div key={item.instanceId} className="flex items-center justify-between text-sm py-1">
                                                <div>
                                                    <span className="font-semibold">{item.name}</span> (${item.price.toFixed(2)})
                                                    {item.storeType === 'drink_shop' && (
                                                        <span className="text-xs text-slate-500 ml-2">
                                                            (甜度:{item.sweetness}, 冰塊:{item.ice}
                                                            {item.toppings && item.toppings.length > 0 ? `, ${item.toppings.join(', ')}` : ''}
                                                            {item.customRequest ? `, ${item.customRequest}` : ''})
                                                        </span>
                                                    )}
                                                </div>
                                                <button onClick={() => onRemoveItem(order.memberId, item.instanceId)} className="ml-2 text-slate-400 hover:text-red-500 shrink-0" disabled={isDeadlineReached}><TrashIcon className="h-4 w-4"/></button>
                                            </div>
                                        )) : <span className="text-slate-400 text-sm">尚未點餐</span>}
                                    </td>
                                    <td className="p-3 text-right font-semibold text-indigo-600 align-top">${total.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
             </div>
          </div>
      </Card>


      <div className="mt-8 text-center flex items-center justify-center gap-4">
        <Button onClick={onBack} size="large" variant="secondary">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            返回
        </Button>
        <Button onClick={onFinish} size="large" disabled={isDeadlineReached}>
            <CheckCircleIcon className="h-5 w-5 mr-2" />
          完成點餐並查看總覽
        </Button>
      </div>
    </div>
  );
};

export default OrderingInterface;
