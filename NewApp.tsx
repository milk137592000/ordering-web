import React, { useState, useCallback, useEffect } from 'react';
import { AppPhase, UserRole, UserSession, SessionData, Store, OrderItem, HistoricalOrder } from './types';
import IdentitySelection from './components/IdentitySelection';
import SetupInterface from './components/SetupInterface';
import AdminOrderingInterface from './components/AdminOrderingInterface';
import RestaurantOrderingInterface from './components/RestaurantOrderingInterface';
import DrinkOrderingInterface from './components/DrinkOrderingInterface';
import RestaurantOrdering from './components/RestaurantOrdering';
import DrinkOrdering from './components/DrinkOrdering';
import PersonalOrderSummary from './components/PersonalOrderSummary';
import HistoryDisplay from './components/HistoryDisplay';
import HistoricalOrderDetail from './components/HistoricalOrderDetail';
import FirebaseConnectionStatus from './components/FirebaseConnectionStatus';
import { LogoIcon, RefreshIcon, HistoryIcon } from './components/icons';
import * as firebaseServices from './firebase';
import Button from './components/common/Button';
import { parseStoresFromMarkdown } from './src/utils/parseStores';
import { loadTeamMembers } from './src/utils/teamMembers';

enum ViewMode {
  ORDERING = 'ordering',
  HISTORY = 'history',
  HISTORICAL_DETAIL = 'historical_detail'
}

const NewApp: React.FC = () => {
  // 用戶會話狀態
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  // 共享訂單狀態
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  // 店家數據
  const [restaurants, setRestaurants] = useState<Store[]>([]);
  const [drinkShops, setDrinkShops] = useState<Store[]>([]);
  // 系統狀態
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ORDERING);
  const [selectedHistoricalOrder, setSelectedHistoricalOrder] = useState<HistoricalOrder | null>(null);

  // 載入店家數據
  useEffect(() => {
    const loadStores = async () => {
      try {
        const [restaurantsResponse, drinksResponse] = await Promise.all([
          fetch('/restaurants.md'),
          fetch('/drinks.md')
        ]);

        const [restaurantsText, drinksText] = await Promise.all([
          restaurantsResponse.text(),
          drinksResponse.text()
        ]);

        const parsedRestaurants = parseStoresFromMarkdown(restaurantsText, 'restaurant', { store: 1, item: 1 });
        const parsedDrinkShops = parseStoresFromMarkdown(drinksText, 'drink_shop', { store: 1, item: 1 });

        console.log('載入的餐廳數據:', parsedRestaurants);
        console.log('載入的飲料店數據:', parsedDrinkShops);

        setRestaurants(parsedRestaurants);
        setDrinkShops(parsedDrinkShops);
      } catch (err) {
        console.error('載入店家數據失敗:', err);
        setError('載入店家數據失敗');
      } finally {
        setIsLoading(false);
      }
    };

    loadStores();
  }, []);

  // 處理身份選擇
  const handleIdentitySelection = useCallback(async (role: UserRole, userName: string, orderId?: string) => {
    try {
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (role === UserRole.ADMIN) {
        // 創建新訂單
        const newOrderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newUserSession: UserSession = {
          userId,
          userName,
          role,
          currentPhase: AppPhase.SETUP,
          orderId: newOrderId,
          personalOrder: []
        };
        
        setUserSession(newUserSession);
      } else {
        // 加入現有訂單
        if (!orderId) {
          alert('請輸入訂單ID');
          return;
        }

        // 檢查訂單是否存在
        const { db, doc, getDoc } = firebaseServices;
        if (db) {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);
          
          if (!orderSnap.exists()) {
            alert('找不到該訂單，請檢查訂單ID是否正確');
            return;
          }

          const orderData = orderSnap.data() as SessionData;
          if (orderData.isOrderClosed) {
            alert('該訂單已經收單，無法加入');
            return;
          }

          setSessionData(orderData);
        }

        const newUserSession: UserSession = {
          userId,
          userName,
          role,
          currentPhase: sessionData?.selectedRestaurantId ? AppPhase.RESTAURANT_ORDERING : AppPhase.DRINK_ORDERING,
          orderId,
          personalOrder: []
        };
        
        setUserSession(newUserSession);
      }
    } catch (err) {
      console.error('身份選擇錯誤:', err);
      setError('身份選擇失敗，請重試');
    }
  }, [sessionData]);

  // 處理管理員設定完成
  const handleSetupComplete = useCallback(async (deadline: string, restaurantId: number | null, drinkShopId: number | null) => {
    if (!userSession) return;

    try {
      const now = new Date();
      const [hours, minutes] = deadline.split(':');
      const deadlineDate = new Date();
      deadlineDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // 如果截止時間是明天
      if (deadlineDate <= now) {
        deadlineDate.setDate(deadlineDate.getDate() + 1);
      }

      // 載入團隊成員列表
      const teamMembers = await loadTeamMembers();

      // 如果沒有成員，添加一個預設成員
      if (teamMembers.length === 0) {
        teamMembers.push({ id: 'member-1', name: '預設成員' });
      }

      const newSessionData: SessionData = {
        orderId: userSession.orderId!,
        adminId: userSession.userId,
        adminName: userSession.userName,
        phase: AppPhase.RESTAURANT_ORDERING,
        teamMembers: teamMembers,
        orders: teamMembers.map(m => ({ memberId: m.id, items: [] })),
        selectedRestaurantId: restaurantId,
        selectedDrinkShopId: drinkShopId,
        deadline: deadlineDate.toISOString(),
        isDeadlineReached: false,
        isOrderClosed: false,
        orderDate: now.toISOString(),
        createdAt: now.toISOString(),
        memberOrders: {}
      };

      // 保存到 Firebase
      const { db, doc, setDoc } = firebaseServices;
      if (db) {
        await setDoc(doc(db, 'orders', userSession.orderId!), newSessionData);
      }

      setSessionData(newSessionData);
      
      // 更新用戶會話
      const updatedUserSession = {
        ...userSession,
        currentPhase: userSession.role === UserRole.ADMIN ? AppPhase.ADMIN_ORDERING : (restaurantId ? AppPhase.RESTAURANT_ORDERING : AppPhase.DRINK_ORDERING)
      };
      setUserSession(updatedUserSession);
    } catch (err) {
      console.error('設定完成錯誤:', err);
      setError('設定失敗，請重試');
    }
  }, [userSession]);

  // 處理添加品項
  const handleAddItem = useCallback((item: OrderItem) => {
    if (!userSession) return;

    const updatedUserSession = {
      ...userSession,
      personalOrder: [...userSession.personalOrder, item]
    };
    setUserSession(updatedUserSession);
  }, [userSession]);

  // 處理移除品項
  const handleRemoveItem = useCallback((itemInstanceId: string) => {
    if (!userSession) return;

    const updatedUserSession = {
      ...userSession,
      personalOrder: userSession.personalOrder.filter(item => item.instanceId !== itemInstanceId)
    };
    setUserSession(updatedUserSession);
  }, [userSession]);

  // 處理管理員為團隊成員點餐
  const handleAdminOrderUpdate = useCallback(async (userId: string, userName: string, items: OrderItem[]) => {
    if (!userSession || !sessionData) return;

    try {
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);
        await updateDoc(orderRef, {
          [`memberOrders.${userId}`]: {
            userName: userName,
            items: items
          }
        });

        // 更新本地狀態
        setSessionData(prev => prev ? {
          ...prev,
          memberOrders: {
            ...prev.memberOrders,
            [userId]: {
              userName: userName,
              items: items
            }
          }
        } : null);
      }
    } catch (err) {
      console.error('更新訂單失敗:', err);
      setError('更新訂單失敗，請重試');
    }
  }, [userSession, sessionData]);

  // 處理管理員點餐完成
  const handleAdminOrderingComplete = useCallback(async () => {
    if (!userSession || !sessionData) return;

    try {
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);
        await updateDoc(orderRef, {
          phase: AppPhase.RESTAURANT_ORDERING
        });

        // 更新本地狀態
        setSessionData(prev => prev ? {
          ...prev,
          phase: AppPhase.RESTAURANT_ORDERING
        } : null);
      }
    } catch (err) {
      console.error('更新階段失敗:', err);
      setError('更新階段失敗，請重試');
    }
  }, [userSession, sessionData]);

  // 處理餐廳點餐完成
  const handleRestaurantOrderingComplete = useCallback(() => {
    if (!userSession) return;

    const nextPhase = sessionData?.selectedDrinkShopId ? AppPhase.DRINK_ORDERING : AppPhase.PERSONAL_SUMMARY;
    const updatedUserSession = {
      ...userSession,
      currentPhase: nextPhase
    };
    setUserSession(updatedUserSession);
  }, [userSession, sessionData]);

  // 處理飲料點餐完成
  const handleDrinkOrderingComplete = useCallback(() => {
    if (!userSession) return;

    const updatedUserSession = {
      ...userSession,
      currentPhase: AppPhase.PERSONAL_SUMMARY
    };
    setUserSession(updatedUserSession);
  }, [userSession]);

  // 處理返回餐廳點餐
  const handleBackToRestaurantOrdering = useCallback(() => {
    if (!userSession) return;

    const updatedUserSession = {
      ...userSession,
      currentPhase: AppPhase.RESTAURANT_ORDERING
    };
    setUserSession(updatedUserSession);
  }, [userSession]);

  // 處理繼續到下一階段
  const handleContinue = useCallback(() => {
    if (!userSession) return;

    let nextPhase: AppPhase;
    if (userSession.currentPhase === AppPhase.RESTAURANT_ORDERING) {
      nextPhase = sessionData?.selectedDrinkShopId ? AppPhase.DRINK_ORDERING : AppPhase.PERSONAL_SUMMARY;
    } else if (userSession.currentPhase === AppPhase.DRINK_ORDERING) {
      nextPhase = AppPhase.PERSONAL_SUMMARY;
    } else {
      return;
    }

    const updatedUserSession = {
      ...userSession,
      currentPhase: nextPhase
    };
    setUserSession(updatedUserSession);
  }, [userSession, sessionData]);

  // 處理返回上一階段
  const handleBack = useCallback(() => {
    if (!userSession) return;

    let prevPhase: AppPhase;
    if (userSession.currentPhase === AppPhase.DRINK_ORDERING) {
      prevPhase = sessionData?.selectedRestaurantId ? AppPhase.RESTAURANT_ORDERING : AppPhase.SETUP;
    } else if (userSession.currentPhase === AppPhase.PERSONAL_SUMMARY) {
      prevPhase = sessionData?.selectedDrinkShopId ? AppPhase.DRINK_ORDERING : AppPhase.RESTAURANT_ORDERING;
    } else {
      return;
    }

    const updatedUserSession = {
      ...userSession,
      currentPhase: prevPhase
    };
    setUserSession(updatedUserSession);
  }, [userSession, sessionData]);

  // 處理編輯訂單
  const handleEditOrder = useCallback(() => {
    if (!userSession || !sessionData) return;

    const firstPhase = sessionData.selectedRestaurantId ? AppPhase.RESTAURANT_ORDERING : AppPhase.DRINK_ORDERING;
    const updatedUserSession = {
      ...userSession,
      currentPhase: firstPhase
    };
    setUserSession(updatedUserSession);
  }, [userSession, sessionData]);

  // 獲取當前店家
  const selectedRestaurant = sessionData?.selectedRestaurantId 
    ? restaurants.find(r => r.id === sessionData.selectedRestaurantId) || null
    : null;
  
  const selectedDrinkShop = sessionData?.selectedDrinkShopId 
    ? drinkShops.find(d => d.id === sessionData.selectedDrinkShopId) || null
    : null;

  // 計算截止時間
  const deadline = sessionData?.deadline ? new Date(sessionData.deadline) : null;
  const isDeadlineReached = deadline ? new Date() > deadline : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重新載入</Button>
        </div>
      </div>
    );
  }

  // 渲染當前階段
  const renderCurrentPhase = () => {
    if (!userSession) {
      return <IdentitySelection onSelectRole={handleIdentitySelection} />;
    }

    switch (userSession.currentPhase) {
      case AppPhase.SETUP:
        return (
          <SetupInterface
            restaurants={restaurants}
            drinkShops={drinkShops}
            onComplete={handleSetupComplete}
            orderId={userSession.orderId!}
          />
        );

      case AppPhase.ADMIN_ORDERING:
        return (
          <AdminOrderingInterface
            restaurant={selectedRestaurant}
            drinkShop={selectedDrinkShop}
            onOrderUpdate={handleAdminOrderUpdate}
            onComplete={handleAdminOrderingComplete}
            existingOrders={sessionData?.memberOrders || {}}
            teamMembers={sessionData?.teamMembers || []}
          />
        );

      case AppPhase.RESTAURANT_ORDERING:
        return (
          <RestaurantOrderingInterface
            restaurant={selectedRestaurant}
            onOrderUpdate={handleAdminOrderUpdate}
            onComplete={handleRestaurantOrderingComplete}
            onBack={handleBack}
            existingOrders={sessionData?.memberOrders || {}}
            teamMembers={sessionData?.teamMembers || []}
          />
        );

      case AppPhase.DRINK_ORDERING:
        return (
          <DrinkOrderingInterface
            drinkShop={selectedDrinkShop}
            onOrderUpdate={handleAdminOrderUpdate}
            onComplete={handleDrinkOrderingComplete}
            onBack={handleBackToRestaurantOrdering}
            existingOrders={sessionData?.memberOrders || {}}
            teamMembers={sessionData?.teamMembers || []}
          />
        );

      case AppPhase.PERSONAL_SUMMARY:
        return (
          <PersonalOrderSummary
            personalOrder={userSession.personalOrder}
            userName={userSession.userName}
            userRole={userSession.role}
            orderId={userSession.orderId!}
            deadline={deadline}
            isDeadlineReached={isDeadlineReached}
            isOrderClosed={sessionData?.isOrderClosed || false}
            restaurantName={selectedRestaurant?.name}
            drinkShopName={selectedDrinkShop?.name}
            onEditOrder={handleEditOrder}
          />
        );

      default:
        return <div>未知階段</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <FirebaseConnectionStatus />
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoIcon className="h-8 w-8 text-indigo-600"/>
            <h1 className="text-2xl font-bold text-slate-800">丁二烯C班點餐系統</h1>
          </div>
          {userSession && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                歡迎，{userSession.userName}
                {userSession.role === UserRole.ADMIN && (
                  <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                    管理員
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto">
        {renderCurrentPhase()}
      </main>
    </div>
  );
};

export default NewApp;
