
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppPhase, TeamMember, Store, MemberOrder, OrderItem, MenuCategory, SessionData, Topping, HistoricalOrder } from './types';
import StoreSelector from './components/StoreSelector';
import OrderingInterface from './components/OrderingInterface';
import SummaryDisplay from './components/SummaryDisplay';
import HistoryDisplay from './components/HistoryDisplay';
import HistoricalOrderDetail from './components/HistoricalOrderDetail';
import { LogoIcon, RefreshIcon, HistoryIcon } from './components/icons';
import { db, doc, onSnapshot, setDoc, getDoc } from './firebase';
import Button from './components/common/Button';

const SESSION_ID = 'active_session'; // Using a single document for the current session

enum ViewMode {
  ORDERING = 'ordering',
  HISTORY = 'history',
  HISTORICAL_DETAIL = 'historical_detail'
}

const parseStoresFromMarkdown = (
  markdownText: string,
  type: 'restaurant' | 'drink_shop',
  idCounters: { store: number; item: number }
): Store[] => {
  const stores: Store[] = [];
  const storeBlocks = markdownText.trim().split(/^#\s/m).filter(Boolean);

  const TOPPING_CATEGORY_KEYWORDS = ['加料', '加點', '口感', '選料', '單品', '專屬', '添加'];
  // Sort by length descending for greedy matching
  const KNOWN_TOPPINGS = [
    '珍珠', '黃金珍珠', '烘烏龍茶凍', '波霸', '雙Q果', '椰果', '養樂多', '波波', '仙草凍', '蜂蜜凍', '芝芝',
    '古玉凍', '葡萄凍', '手作布丁', '芝士奶蓋', '鮮奶', '杏仁凍', '湯圓', '芋圓', '紫米', '粉粿', '紅豆',
    '花生', '芋頭', '鶴記茶凍', '鶴記烏龍凍', '鶴記杏仁凍', '鶴記芝麻椰凍'
  ].sort((a, b) => b.length - a.length);

  const parseToppings = (nameStr: string): string[] => {
    const toppings: string[] = [];
    let remainingStr = nameStr;
    while (remainingStr.length > 0) {
        const foundTopping = KNOWN_TOPPINGS.find(t => remainingStr.startsWith(t));
        if (foundTopping) {
            toppings.push(foundTopping);
            remainingStr = remainingStr.substring(foundTopping.length);
        } else {
            if (remainingStr.trim()) {
                toppings.push(remainingStr.trim());
            }
            break;
        }
    }
    return toppings;
  };

  for (const block of storeBlocks) {
    const lines = block.trim().split('\n');
    const storeName = lines.shift()?.trim();
    if (!storeName) continue;

    const menu: MenuCategory[] = [];
    const storeToppings: Topping[] = [];
    let currentCategory: MenuCategory = { name: '', items: [] };
    let isToppingCategory = false;
    menu.push(currentCategory);

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('##')) {
        const categoryName = trimmedLine.replace('##', '').trim();
        isToppingCategory = TOPPING_CATEGORY_KEYWORDS.some(keyword => categoryName.includes(keyword));
        if (!isToppingCategory) {
            if (currentCategory.items.length > 0 || currentCategory.name) {
                currentCategory = { name: categoryName, items: [] };
                menu.push(currentCategory);
            } else {
                currentCategory.name = categoryName;
            }
        }
        continue;
      }
      
      const colonFormatMatch = line.match(/^\s*-\s*(.+?)\s*:\s*\$?(\d+(\.\d+)?).*$/);
      const dotsFormatMatch = line.match(/^\s*(?:-\s*)?(.*?)\s*\.{2,}\s*\$?(\d+(\.\d+)?).*$/);
      const match = colonFormatMatch || dotsFormatMatch;

      if (!match) {
        const isPotentialHeader = !/[:.]/.test(trimmedLine);
        if (isPotentialHeader && TOPPING_CATEGORY_KEYWORDS.some(keyword => trimmedLine.includes(keyword))) {
            isToppingCategory = true;
        }
        continue;
      }

      if (match) {
        const itemName = match[1].trim();
        const itemPrice = parseFloat(match[2]);
        
        if (isToppingCategory) {
            const parsedToppings = parseToppings(itemName);
            for (const toppingName of parsedToppings) {
                if (!storeToppings.some(t => t.name === toppingName)) {
                    storeToppings.push({ name: toppingName, price: itemPrice });
                }
            }
        } else {
            currentCategory.items.push({
              id: idCounters.item++,
              name: itemName,
              price: itemPrice,
            });
        }
      }
    }
    
    const validMenu = menu.filter(c => (c.name !== '' || c.items.length > 0) && c.items.length > 0);
    if (validMenu.length > 0 || storeToppings.length > 0) {
      stores.push({
        id: idCounters.store++,
        name: storeName,
        type: type,
        menu: validMenu,
        toppings: storeToppings,
      });
    }
  }
  return stores;
};

const updateSession = async (data: Partial<SessionData>) => {
    const sessionRef = doc(db, 'sessions', SESSION_ID);
    await setDoc(sessionRef, data, { merge: true });
};

const App: React.FC = () => {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [restaurants, setRestaurants] = useState<Store[]>([]);
  const [drinkShops, setDrinkShops] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ORDERING);
  const [selectedHistoricalOrder, setSelectedHistoricalOrder] = useState<HistoricalOrder | null>(null);

  // Fetch static menu data once on component mount
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setError(null);
        const responses = await Promise.all([
          fetch('restaurants.md'),
          fetch('drinks.md'),
        ]);

        for (const response of responses) {
            if (!response.ok) {
                throw new Error('無法讀取菜單檔案。');
            }
        }
        
        const [restoText, drinksText] = await Promise.all(
            responses.map(res => res.text())
        );

        const idCounters = { store: 1, item: 101 };
        const parsedRestos = parseStoresFromMarkdown(restoText, 'restaurant', idCounters);
        const parsedDrinks = parseStoresFromMarkdown(drinksText, 'drink_shop', idCounters);
        
        setRestaurants(parsedRestos);
        setDrinkShops(parsedDrinks);
      } catch (err) {
        console.error("菜單資料載入錯誤:", err);
        setError(err instanceof Error ? err.message : '載入菜單資料時發生未知錯誤。');
      }
    };
    fetchMenuData();
  }, []);

  // Set up Firebase listener for session data
  useEffect(() => {
    setIsLoading(true);
    const sessionRef = doc(db, 'sessions', SESSION_ID);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        setSessionData(docSnap.data() as SessionData);
      } else {
        // If no session exists, it might need to be initialized.
        setSessionData(null);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Firebase 監聽錯誤:", err);
      setError("無法連線至即時同步服務。請檢查您的 Firebase 設定。");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Deadline checker effect
  useEffect(() => {
      if (!sessionData?.deadline || sessionData.isDeadlineReached) {
          return;
      }

      const deadlineDate = new Date(sessionData.deadline);
      const intervalId = setInterval(() => {
          if (new Date() >= deadlineDate) {
              updateSession({ isDeadlineReached: true });
              clearInterval(intervalId);
          }
      }, 1000);

      return () => clearInterval(intervalId);
  }, [sessionData?.deadline, sessionData?.isDeadlineReached]);


  const handleStartOver = useCallback(async () => {
    setIsInitializing(true);
    try {
        const mateResponse = await fetch('mate.md');
        if (!mateResponse.ok) {
            throw new Error('無法讀取成員資料檔案。');
        }
        const mateText = await mateResponse.text();
        const parsedMembers = mateText.trim().split('\n')
            .map(name => name.trim())
            .filter(Boolean)
            .map((name, index) => ({ id: `member-${index + 1}`, name }));
        
        if (parsedMembers.length === 0) {
            parsedMembers.push({ id: 'member-1', name: '預設成員' });
        }

        const now = new Date().toISOString();
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newSession: SessionData = {
            phase: AppPhase.RESTAURANT_SELECTION,
            teamMembers: parsedMembers,
            orders: parsedMembers.map(m => ({ memberId: m.id, items: [] })),
            selectedRestaurantId: null,
            selectedDrinkShopId: null,
            deadline: null,
            isDeadlineReached: false,
            orderId: orderId,
            orderDate: now,
            createdAt: now,
        };
        await setDoc(doc(db, 'sessions', SESSION_ID), newSession);
        setViewMode(ViewMode.ORDERING);
    } catch (err) {
        console.error("建立新訂單錯誤:", err);
        setError(err instanceof Error ? err.message : '建立新訂單時發生錯誤。');
    } finally {
        setIsInitializing(false);
    }
  }, []);

  const handleRestaurantSelect = useCallback((restaurant: Store) => {
    updateSession({ selectedRestaurantId: restaurant.id, phase: AppPhase.DRINK_SHOP_SELECTION });
  }, []);

  const handleSkipRestaurant = useCallback(() => {
    updateSession({ selectedRestaurantId: null, phase: AppPhase.DRINK_SHOP_SELECTION });
  }, []);

  const handleDrinkShopSelect = useCallback((drinkShop: Store) => {
    updateSession({ selectedDrinkShopId: drinkShop.id, phase: AppPhase.ORDERING });
  }, []);
  
  const handleSkipDrinkShop = useCallback(() => {
    if (sessionData?.selectedRestaurantId === null) {
      alert('您必須至少選擇一間餐廳或一間飲料店才能繼續。');
      return;
    }
    updateSession({ selectedDrinkShopId: null, phase: AppPhase.ORDERING });
  }, [sessionData?.selectedRestaurantId]);

  const handleAddItem = useCallback((memberId: string, item: OrderItem) => {
    if (!sessionData) return;
    const newOrders = sessionData.orders.map(order => {
        if (order.memberId === memberId) {
            return { ...order, items: [...order.items, item] };
        }
        return order;
    });
    updateSession({ orders: newOrders });
  }, [sessionData]);

  const handleRemoveItem = useCallback((memberId: string, itemInstanceId: string) => {
    if (!sessionData) return;
    const newOrders = sessionData.orders.map(order => {
        if (order.memberId === memberId) {
            const newItems = order.items.filter(item => item.instanceId !== itemInstanceId);
            return { ...order, items: newItems };
        }
        return order;
    });
    updateSession({ orders: newOrders });
  }, [sessionData]);
  
  const handleFinishOrdering = useCallback(() => {
    updateSession({ phase: AppPhase.SUMMARY });
  }, []);

  const handleCompleteOrder = useCallback(async () => {
    if (!sessionData) return;

    try {
      const completedAt = new Date().toISOString();
      const totalAmount = sessionData.orders.reduce((sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.price, 0), 0);

      // Handle legacy data without orderId
      const orderId = sessionData.orderId || `legacy_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderDate = sessionData.orderDate || new Date().toISOString();
      const createdAt = sessionData.createdAt || new Date().toISOString();

      // Get store names
      const selectedRestaurant = restaurants.find(r => r.id === sessionData.selectedRestaurantId);
      const selectedDrinkShop = drinkShops.find(d => d.id === sessionData.selectedDrinkShopId);

      // Create historical order
      const historicalOrder: HistoricalOrder = {
        orderId: orderId,
        orderDate: orderDate,
        createdAt: createdAt,
        completedAt: completedAt,
        teamMembers: sessionData.teamMembers,
        orders: sessionData.orders,
        selectedRestaurantId: sessionData.selectedRestaurantId,
        selectedDrinkShopId: sessionData.selectedDrinkShopId,
        totalAmount: totalAmount,
        restaurantName: selectedRestaurant?.name,
        drinkShopName: selectedDrinkShop?.name,
      };

      // Save to historical orders collection
      await setDoc(doc(db, 'historical_orders', orderId), historicalOrder);

      // Update order list
      const historyRef = doc(db, 'history', 'order_list');
      const historySnap = await getDoc(historyRef);
      const existingOrderIds = historySnap.exists() ? (historySnap.data().orderIds || []) : [];
      const updatedOrderIds = [orderId, ...existingOrderIds];
      await setDoc(historyRef, { orderIds: updatedOrderIds });

      // Clear current session
      await setDoc(doc(db, 'sessions', SESSION_ID), {});
      setSessionData(null);

      alert('訂單已完成並保存到歷史記錄！');
    } catch (err) {
      console.error('保存歷史訂單錯誤:', err);
      alert('保存歷史訂單時發生錯誤，請稍後再試。');
    }
  }, [sessionData, restaurants, drinkShops]);
  
  const handleAddTemporaryMember = useCallback((name: string): string => {
    if (!sessionData) return '';
    const newMember: TeamMember = {
      id: `temp-member-${Date.now()}`,
      name: `${name} (加班)`,
    };
    const updatedTeamMembers = [...sessionData.teamMembers, newMember];
    const updatedOrders = [...sessionData.orders, { memberId: newMember.id, items: [] }];
    updateSession({ teamMembers: updatedTeamMembers, orders: updatedOrders });
    return newMember.id;
  }, [sessionData]);
  
  const handleSetDeadline = useCallback((timeString: string) => {
    if (!timeString) {
      updateSession({ deadline: null, isDeadlineReached: false });
      return;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDeadline = new Date();
    newDeadline.setHours(hours, minutes, 0, 0);

    updateSession({ deadline: newDeadline.toISOString(), isDeadlineReached: newDeadline < new Date() });
  }, []);

  const handleGoBack = useCallback(() => {
    if (!sessionData) return;
    let newPhase = sessionData.phase;
    if (newPhase === AppPhase.SUMMARY) newPhase = AppPhase.ORDERING;
    else if (newPhase === AppPhase.ORDERING) newPhase = AppPhase.DRINK_SHOP_SELECTION;
    else if (newPhase === AppPhase.DRINK_SHOP_SELECTION) newPhase = AppPhase.RESTAURANT_SELECTION;
    updateSession({ phase: newPhase });
  }, [sessionData]);

  const handleViewHistory = useCallback(() => {
    setViewMode(ViewMode.HISTORY);
  }, []);

  const handleBackToOrdering = useCallback(() => {
    setViewMode(ViewMode.ORDERING);
    setSelectedHistoricalOrder(null);
  }, []);

  const handleViewHistoricalOrder = useCallback((order: HistoricalOrder) => {
    setSelectedHistoricalOrder(order);
    setViewMode(ViewMode.HISTORICAL_DETAIL);
  }, []);

  const handleBackToHistory = useCallback(() => {
    setSelectedHistoricalOrder(null);
    setViewMode(ViewMode.HISTORY);
  }, []);

  const memberNameMap = useMemo(() => {
    return new Map(sessionData?.teamMembers.map(m => [m.id, m.name]) || []);
  }, [sessionData?.teamMembers]);

  const selectedRestaurant = useMemo(() => restaurants.find(r => r.id === sessionData?.selectedRestaurantId) || null, [restaurants, sessionData?.selectedRestaurantId]);
  const selectedDrinkShop = useMemo(() => drinkShops.find(s => s.id === sessionData?.selectedDrinkShopId) || null, [drinkShops, sessionData?.selectedDrinkShopId]);

  const renderPhase = () => {
    if (isLoading || isInitializing) {
        return (
          <div className="text-center py-20 flex flex-col items-center justify-center">
            <RefreshIcon className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-lg text-slate-500">{isInitializing ? '正在建立新訂單...' : '正在同步資料...'}</p>
          </div>
        );
    }

    if (error) {
       return (
        <div className="text-center py-20 bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-700">發生錯誤</h3>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      );
    }
    
    if (!sessionData || Object.keys(sessionData).length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-slate-700 mb-4">歡迎使用點餐系統！</h2>
                <p className="text-slate-500 mb-6">目前沒有進行中的訂單，請建立一個新訂單來開始。</p>
                <Button onClick={handleCreateNewOrder} size="large" disabled={isInitializing}>
                    <RefreshIcon className="h-5 w-5 mr-2" />
                    建立新訂單
                </Button>
            </div>
        );
    }

    switch (sessionData.phase) {
      case AppPhase.RESTAURANT_SELECTION:
        return <StoreSelector stores={restaurants} onSelect={handleRestaurantSelect} title="選擇一間餐廳" onSkip={handleSkipRestaurant} skipLabel="今天不用餐" />;
      case AppPhase.DRINK_SHOP_SELECTION:
        return <StoreSelector stores={drinkShops} onSelect={handleDrinkShopSelect} title="選擇一間飲料店" onBack={handleGoBack} onSkip={handleSkipDrinkShop} skipLabel="今天不訂飲料" />;
      case AppPhase.ORDERING:
        if (!selectedRestaurant && !selectedDrinkShop) return null;
        return <OrderingInterface 
                  teamMembers={sessionData.teamMembers}
                  restaurant={selectedRestaurant}
                  drinkShop={selectedDrinkShop}
                  orders={sessionData.orders}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                  onFinish={handleFinishOrdering}
                  memberNameMap={memberNameMap}
                  onBack={handleGoBack}
                  onAddTemporaryMember={handleAddTemporaryMember}
                  deadline={sessionData.deadline ? new Date(sessionData.deadline) : null}
                  isDeadlineReached={sessionData.isDeadlineReached}
                  onSetDeadline={handleSetDeadline}
               />;
      case AppPhase.SUMMARY:
        return <SummaryDisplay
                  orders={sessionData.orders}
                  memberNameMap={memberNameMap}
                  onStartOver={handleCompleteOrder}
                  onBack={handleGoBack}
                  orderDate={sessionData.orderDate || new Date().toISOString()}
                  orderId={sessionData.orderId || 'legacy-order'}
                  restaurantName={selectedRestaurant?.name}
                  drinkShopName={selectedDrinkShop?.name}
               />;
      default:
        return <div>發生錯誤。</div>;
    }
  };

  const ProgressIndicator = () => {
      const steps = ['選擇餐廳', '選擇飲料', '開始點餐', '訂單總覽'];
      const currentStepIndex = sessionData?.phase ?? 0;

      return (
          <div className="w-full mb-8">
              <div className="flex justify-between items-center">
                  {steps.map((step, index) => (
                      <React.Fragment key={step}>
                          <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${index <= currentStepIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                  {index < currentStepIndex ? '✔' : index + 1}
                              </div>
                              <p className={`mt-2 text-xs text-center font-semibold ${index <= currentStepIndex ? 'text-indigo-600' : 'text-slate-500'}`}>{step}</p>
                          </div>
                          {index < steps.length - 1 && (
                              <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${index < currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                          )}
                      </React.Fragment>
                  ))}
              </div>
          </div>
      );
  };
  
  const today = new Date();
  const formattedDate = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日`;

  const renderContent = () => {
    switch (viewMode) {
      case ViewMode.HISTORY:
        return <HistoryDisplay onBack={handleBackToOrdering} onViewOrder={handleViewHistoricalOrder} />;
      case ViewMode.HISTORICAL_DETAIL:
        return selectedHistoricalOrder ?
          <HistoricalOrderDetail order={selectedHistoricalOrder} onBack={handleBackToHistory} /> :
          <div>載入中...</div>;
      case ViewMode.ORDERING:
      default:
        return (
          <>
            {sessionData && <ProgressIndicator />}
            {renderPhase()}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoIcon className="h-8 w-8 text-indigo-600"/>
            <h1 className="text-2xl font-bold text-slate-800">丁二烯C班點餐系統</h1>
          </div>
          <div className="flex items-center gap-4">
            {viewMode === ViewMode.ORDERING && (
              <Button onClick={handleViewHistory} variant="secondary" size="sm">
                <HistoryIcon className="w-4 h-4 mr-2" />
                歷史訂單
              </Button>
            )}
            <div className="text-sm text-slate-500 font-medium">
              {formattedDate}
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
