import React, { useState, useCallback, useEffect } from 'react';
import { AppPhase, UserRole, UserSession, SessionData, Store, OrderItem, HistoricalOrder } from './types';
import IdentitySelection from './components/IdentitySelection.tsx';
import SetupInterface from './components/SetupInterface.tsx';
import AdminOrderingInterface from './components/AdminOrderingInterface.tsx';
import RestaurantOrderingInterface from './components/RestaurantOrderingInterface.tsx';
import DrinkOrderingInterface from './components/DrinkOrderingInterface.tsx';
import RestaurantOrdering from './components/RestaurantOrdering.tsx';
import DrinkOrdering from './components/DrinkOrdering.tsx';
import MemberOrderingInterface from './components/MemberOrderingInterface.tsx';
import PersonalOrderSummary from './components/PersonalOrderSummary.tsx';
import SummaryDisplay from './components/SummaryDisplay.tsx';
import HistoryDisplay from './components/HistoryDisplay.tsx';
import HistoricalOrderDetail from './components/HistoricalOrderDetail.tsx';
import FirebaseConnectionStatus from './components/FirebaseConnectionStatus.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { LogoIcon, RefreshIcon, HistoryIcon } from './components/icons.tsx';
import * as firebaseServices from './firebase.ts';
import Button from './components/common/Button.tsx';
import { parseStoresFromMarkdown, loadStoresData } from './src/utils/parseStores.ts';
import { loadTeamMembers } from '@/src/utils/teamMembers.ts';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// 清理數據函數，移除所有 undefined 值
const cleanDataForFirebase = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map(cleanDataForFirebase).filter(item => item !== undefined && item !== null);
  }

  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const cleanedValue = cleanDataForFirebase(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }

  return data;
};

// 驗證訂單項目數據
const validateOrderItem = (item: OrderItem): boolean => {
  return !!(
    item &&
    typeof item.name === 'string' &&
    item.name.trim() !== '' &&
    typeof item.price === 'number' &&
    item.price >= 0 &&
    typeof item.instanceId === 'string' &&
    item.instanceId.trim() !== '' &&
    (item.storeType === 'restaurant' || item.storeType === 'drink_shop')
  );
};

// 驗證用戶會話數據
const validateUserSession = (userSession: UserSession): boolean => {
  return !!(
    userSession &&
    typeof userSession.userId === 'string' &&
    userSession.userId.trim() !== '' &&
    typeof userSession.userName === 'string' &&
    userSession.userName.trim() !== '' &&
    typeof userSession.orderId === 'string' &&
    userSession.orderId.trim() !== '' &&
    Array.isArray(userSession.personalOrder)
  );
};

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
  const [isRetrying, setIsRetrying] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ORDERING);
  const [selectedHistoricalOrder, setSelectedHistoricalOrder] = useState<HistoricalOrder | null>(null);

  // 網路狀態檢測
  const networkStatus = useNetworkStatus();

  // 自動重連機制 - 移到retrySync函數定義之後

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

        const restaurantCounters = { store: 1, item: 1 };
        const parsedRestaurants = parseStoresFromMarkdown(restaurantsText, 'restaurant', restaurantCounters);

        const drinkCounters = { store: 100, item: 1000 }; // 使用不同的起始ID避免衝突
        const parsedDrinkShops = parseStoresFromMarkdown(drinksText, 'drink_shop', drinkCounters);

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
      // 生成簡單的用戶ID
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const userId = `user-${randomNum}`;
      
      if (role === UserRole.ADMIN) {
        // 創建新訂單 - 使用簡單的6碼格式
        const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const newOrderId = randomNum;

        // 創建初始訂單數據
        const initialSessionData: SessionData = {
          orderId: newOrderId,
          adminId: userId,
          adminName: userName,
          phase: AppPhase.SETUP,
          teamMembers: [],
          selectedRestaurantId: null,
          selectedDrinkShopId: null,
          deadline: null,
          isDeadlineReached: false,
          memberOrders: {},
          createdAt: new Date().toISOString()
        };

        // 保存到 Firebase
        const { db, doc, setDoc } = firebaseServices;
        if (db) {
          try {
            const orderRef = doc(db, 'orders', newOrderId);
            const cleanedInitialData = cleanDataForFirebase(initialSessionData);
            await setDoc(orderRef, cleanedInitialData);
            console.log('✅ 新訂單已創建到 Firebase:', newOrderId);
          } catch (error) {
            console.error('❌ 創建訂單失敗:', error);
            setError('創建訂單失敗，請重試');
            return;
          }
        }

        const newUserSession: UserSession = {
          userId,
          userName,
          role,
          currentPhase: AppPhase.SETUP,
          orderId: newOrderId,
          personalOrder: []
        };

        setUserSession(newUserSession);
        setSessionData(initialSessionData);
      } else {
        // 加入現有訂單
        if (!orderId) {
          alert('請輸入訂單ID');
          return;
        }

        // 檢查訂單是否存在
        const { db, doc, getDoc } = firebaseServices;
        let orderData: SessionData | null = null;

        if (db) {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);

          if (!orderSnap.exists()) {
            alert('找不到該訂單，請檢查訂單ID是否正確');
            return;
          }

          orderData = orderSnap.data() as SessionData;
          if (orderData.isOrderClosed) {
            alert('該訂單已經收單，無法加入');
            return;
          }

          setSessionData(orderData);
        }

        // 🔧 修復：檢查用戶是否是原始管理員
        let actualRole = role;
        if (orderData && orderData.adminName === userName) {
          // 如果用戶名匹配原始管理員名稱，則設為管理員角色
          actualRole = UserRole.ADMIN;
          console.log('🔍 檢測到原始管理員重新加入:', {
            userName,
            adminName: orderData.adminName,
            originalRole: role,
            actualRole
          });
        }

        // 根據訂單的當前階段設置用戶階段
        let userPhase = AppPhase.MEMBER_ORDERING;
        if (orderData) {
          // 🔧 修復：檢查是否為原始管理員（使用actualRole）
          const isOriginalAdmin = actualRole === UserRole.ADMIN;

          console.log('🔍 管理員身份檢查:', {
            userName,
            originalRole: role,
            actualRole,
            orderAdminName: orderData.adminName,
            isOriginalAdmin
          });

          // 如果訂單已經進入總結階段，管理員應該能看到總結
          if (orderData.phase === AppPhase.SUMMARY) {
            userPhase = isOriginalAdmin ? AppPhase.SUMMARY : AppPhase.PERSONAL_SUMMARY;
          } else if (orderData.phase === AppPhase.PERSONAL_SUMMARY) {
            userPhase = AppPhase.PERSONAL_SUMMARY;
          } else if (orderData.phase === AppPhase.RESTAURANT_ORDERING) {
            // 🔧 修復：如果是原始管理員，應該進入管理員點餐界面
            userPhase = isOriginalAdmin ? AppPhase.ADMIN_ORDERING : AppPhase.RESTAURANT_ORDERING;
          } else if (orderData.phase === AppPhase.DRINK_ORDERING) {
            userPhase = isOriginalAdmin ? AppPhase.ADMIN_ORDERING : AppPhase.DRINK_ORDERING;
          } else if (orderData.phase === AppPhase.SETUP) {
            // 如果管理員還在設定階段，非管理員應該等待
            userPhase = isOriginalAdmin ? AppPhase.SETUP : AppPhase.MEMBER_ORDERING;
          } else {
            // 其他情況，根據訂單設定決定從哪個階段開始
            if (isOriginalAdmin) {
              // 原始管理員應該進入管理員點餐界面
              userPhase = AppPhase.ADMIN_ORDERING;
            } else if (orderData.selectedRestaurantId) {
              userPhase = AppPhase.RESTAURANT_ORDERING;
            } else if (orderData.selectedDrinkShopId) {
              userPhase = AppPhase.DRINK_ORDERING;
            } else {
              userPhase = AppPhase.MEMBER_ORDERING;
            }
          }
        }

        const newUserSession: UserSession = {
          userId,
          userName,
          role: actualRole, // 🔧 修復：使用實際角色
          currentPhase: userPhase,
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

  // 設置 Firebase 實時監聽器來同步訂單數據
  useEffect(() => {
    if (!userSession?.orderId) return;

    const { db, doc, onSnapshot } = firebaseServices;
    if (!db) {
      console.warn('⚠️ Firebase 不可用，跳過實時同步');
      return;
    }

    console.log('🔄 設置 Firebase 實時監聽器，訂單ID:', userSession.orderId);
    const orderRef = doc(db, 'orders', userSession.orderId);

    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const orderData = docSnap.data() as SessionData;
        console.log('📡 收到 Firebase 數據更新:', orderData);
        console.log('🔍 Firebase 數據詳細檢查:', {
          hasPhase: !!orderData.phase,
          hasMemberOrders: !!orderData.memberOrders,
          memberOrdersKeys: orderData.memberOrders ? Object.keys(orderData.memberOrders) : [],
          memberOrdersCount: orderData.memberOrders ? Object.keys(orderData.memberOrders).length : 0
        });

        // 更新會話數據
        setSessionData(orderData);

        // 🔧 修復：處理所有用戶的階段更新，包括管理員
        const isOriginalAdmin = userSession.role === UserRole.ADMIN && orderData.adminName === userSession.userName;

        // 檢查是否管理員剛完成設定（有餐廳或飲料店ID）
        const hasStoreSetup = orderData.selectedRestaurantId || orderData.selectedDrinkShopId;
        const isWaitingForSetup = userSession.currentPhase === AppPhase.MEMBER_ORDERING;

        console.log('🔍 檢查用戶階段更新條件:', {
          hasStoreSetup,
          isWaitingForSetup,
          currentPhase: userSession.currentPhase,
          restaurantId: orderData.selectedRestaurantId,
          drinkShopId: orderData.selectedDrinkShopId,
          orderPhase: orderData.phase,
          userRole: userSession.role,
          isOriginalAdmin
        });

        // 處理非管理員用戶的階段更新
        if (!isOriginalAdmin) {
          // 如果有店家設定且用戶在等待狀態，或者訂單階段已經進入點餐階段
          if ((hasStoreSetup && isWaitingForSetup) ||
              (orderData.phase === AppPhase.RESTAURANT_ORDERING || orderData.phase === AppPhase.DRINK_ORDERING)) {
            console.log('🔄 管理員已設定店家，更新非管理員用戶階段');

            // 根據訂單階段或設定的店家決定下一階段
            let nextPhase: AppPhase;
            if (orderData.phase === AppPhase.RESTAURANT_ORDERING) {
              nextPhase = AppPhase.RESTAURANT_ORDERING;
            } else if (orderData.phase === AppPhase.DRINK_ORDERING) {
              nextPhase = AppPhase.DRINK_ORDERING;
            } else if (orderData.selectedRestaurantId && orderData.selectedDrinkShopId) {
              // 兩個都有，從餐廳開始
              nextPhase = AppPhase.RESTAURANT_ORDERING;
            } else if (orderData.selectedRestaurantId) {
              // 只有餐廳
              nextPhase = AppPhase.RESTAURANT_ORDERING;
            } else if (orderData.selectedDrinkShopId) {
              // 只有飲料店
              nextPhase = AppPhase.DRINK_ORDERING;
            } else {
              // 保持原狀態
              nextPhase = userSession.currentPhase;
            }

            console.log('🎯 非管理員用戶階段更新:', {
              from: userSession.currentPhase,
              to: nextPhase,
              restaurantId: orderData.selectedRestaurantId,
              drinkShopId: orderData.selectedDrinkShopId,
              orderPhase: orderData.phase
            });

            // 只有當階段真的需要改變時才更新
            if (nextPhase !== userSession.currentPhase) {
              setUserSession(prev => ({
                ...prev,
                currentPhase: nextPhase
              }));
            }
          }
        } else {
          // 🔧 新增：處理原始管理員的階段更新
          console.log('🔄 處理原始管理員的階段更新');

          let nextPhase: AppPhase = userSession.currentPhase;

          // 根據訂單階段決定管理員應該在哪個階段
          if (orderData.phase === AppPhase.SUMMARY) {
            nextPhase = AppPhase.SUMMARY;
          } else if (orderData.phase === AppPhase.PERSONAL_SUMMARY) {
            nextPhase = AppPhase.SUMMARY; // 管理員看總覽
          } else if (orderData.phase === AppPhase.RESTAURANT_ORDERING || orderData.phase === AppPhase.DRINK_ORDERING) {
            // 如果訂單在點餐階段，管理員應該在管理員點餐界面
            if (hasStoreSetup && userSession.currentPhase === AppPhase.MEMBER_ORDERING) {
              nextPhase = AppPhase.ADMIN_ORDERING;
            }
          }

          console.log('🎯 原始管理員階段更新:', {
            from: userSession.currentPhase,
            to: nextPhase,
            orderPhase: orderData.phase,
            hasStoreSetup
          });

          // 只有當階段真的需要改變時才更新
          if (nextPhase !== userSession.currentPhase) {
            setUserSession(prev => ({
              ...prev,
              currentPhase: nextPhase
            }));
          }
        }
      } else {
        console.log('📡 訂單文檔不存在');
      }
    }, (error) => {
      console.error('❌ Firebase 監聽錯誤:', error);
      setError('實時同步連接失敗，請檢查網路連接');
    });

    return () => {
      console.log('🔄 清理 Firebase 監聽器');
      unsubscribe();
    };
  }, [userSession?.orderId]);

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
        const cleanedSessionData = cleanDataForFirebase(newSessionData);
        await setDoc(doc(db, 'orders', userSession.orderId!), cleanedSessionData);
      }

      setSessionData(newSessionData);

      // 管理員進入管理員點餐界面，非管理員進入個人點餐流程
      let nextPhase: AppPhase;
      if (userSession.role === UserRole.ADMIN) {
        nextPhase = AppPhase.ADMIN_ORDERING;
      } else {
        nextPhase = restaurantId ? AppPhase.RESTAURANT_ORDERING : AppPhase.DRINK_ORDERING;
      }

      console.log('🔍 設定完成 - 階段切換調試:');
      console.log('- userRole:', userSession.role);
      console.log('- restaurantId:', restaurantId);
      console.log('- drinkShopId:', drinkShopId);
      console.log('- nextPhase:', nextPhase);

      const updatedUserSession = {
        ...userSession,
        currentPhase: nextPhase
      };
      setUserSession(updatedUserSession);
    } catch (err) {
      console.error('設定完成錯誤:', err);
      setError('設定失敗，請重試');
    }
  }, [userSession]);

  // 處理添加品項
  const handleAddItem = useCallback(async (item: OrderItem) => {
    if (!userSession || !sessionData) return;

    // 驗證用戶會話數據
    if (!validateUserSession(userSession)) {
      console.error('❌ 用戶會話數據不完整:', userSession);
      setError('用戶會話數據不完整，請重新登入');
      return;
    }

    // 驗證訂單項目
    if (!validateOrderItem(item)) {
      console.error('❌ 訂單項目數據無效:', item);
      setError('訂單項目數據無效');
      return;
    }

    try {
      // 更新本地狀態
      const updatedUserSession = {
        ...userSession,
        personalOrder: [...userSession.personalOrder, item]
      };
      setUserSession(updatedUserSession);

      // 同步到 Firebase
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        console.log('🔄 正在同步訂單到 Firebase...');
        const orderRef = doc(db, 'orders', userSession.orderId!);

        // 添加重試機制
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            const updateData = cleanDataForFirebase({
              [`memberOrders.${userSession.userId}`]: {
                userName: userSession.userName,
                items: updatedUserSession.personalOrder
              }
            });



            await Promise.race([
              updateDoc(orderRef, updateData),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('操作超時')), 10000)
              )
            ]);
            console.log('✅ 個人訂單已同步到 Firebase');
            break;
          } catch (retryError) {
            retryCount++;
            console.warn(`⚠️ 同步重試 ${retryCount}/${maxRetries}:`, retryError);

            if (retryCount >= maxRetries) {
              throw retryError;
            }

            // 等待後重試
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      } else {
        console.log('📱 離線模式：訂單已保存到本地');
      }
    } catch (error) {
      console.error('❌ 同步個人訂單失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setError(`同步訂單失敗：${errorMessage}。請檢查網路連接後重試。`);
    }
  }, [userSession, sessionData]);

  // 增強的重試同步功能
  const retrySync = useCallback(async () => {
    if (!userSession || !sessionData || isRetrying) return;

    setIsRetrying(true);
    setError(null);

    // 多層重試策略
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 重試同步個人訂單 (嘗試 ${attempt}/${maxRetries})...`);

        const { db, doc, updateDoc } = firebaseServices;
        if (!db) {
          throw new Error('Firebase 服務不可用，請檢查網路連接');
        }

        const orderRef = doc(db, 'orders', userSession.orderId!);
        const retryUpdateData = cleanDataForFirebase({
          [`memberOrders.${userSession.userId}`]: {
            userName: userSession.userName,
            items: userSession.personalOrder,
            lastUpdated: new Date().toISOString(),
            syncAttempt: attempt
          }
        });

        // 使用指數退避延遲
        const timeout = 10000 + (attempt * 5000); // 10s, 15s, 20s
        await Promise.race([
          updateDoc(orderRef, retryUpdateData),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`重試超時 (${timeout/1000}秒)`)), timeout)
          )
        ]);

        console.log(`✅ 重試同步成功 (嘗試 ${attempt})`);
        setError(null);
        return; // 成功後退出

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`❌ 重試同步失敗 (嘗試 ${attempt}/${maxRetries}):`, lastError.message);

        // 如果不是最後一次嘗試，等待後重試
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // 指數退避，最大5秒
          console.log(`⏳ ${delay}ms 後重試...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重試都失敗
    const errorMessage = lastError?.message || '未知錯誤';
    console.error('❌ 所有重試都失敗:', errorMessage);

    // 提供更友好的錯誤信息
    let friendlyMessage = '同步失敗';
    if (errorMessage.includes('網路') || errorMessage.includes('network')) {
      friendlyMessage = '網路連接問題，請檢查網路後重試';
    } else if (errorMessage.includes('超時') || errorMessage.includes('timeout')) {
      friendlyMessage = '連接超時，請稍後重試';
    } else if (errorMessage.includes('權限') || errorMessage.includes('permission')) {
      friendlyMessage = '權限不足，請聯繫管理員';
    }

    setError(`${friendlyMessage}：${errorMessage}`);
    setIsRetrying(false);
  }, [userSession, sessionData, isRetrying]);

  // 自動重連機制 - 在retrySync定義之後
  useEffect(() => {
    if (networkStatus.isOnline && error && !isRetrying) {
      console.log('🌐 網路已恢復，嘗試自動重連...');
      const autoRetryTimer = setTimeout(() => {
        if (userSession && sessionData) {
          console.log('🔄 執行自動重試同步...');
          retrySync();
        }
      }, 2000); // 等待2秒後自動重試

      return () => clearTimeout(autoRetryTimer);
    }
  }, [networkStatus.isOnline, error, isRetrying, userSession, sessionData, retrySync]);

  // 處理移除品項
  const handleRemoveItem = useCallback(async (itemInstanceId: string) => {
    if (!userSession || !sessionData) return;

    // 驗證用戶會話數據
    if (!validateUserSession(userSession)) {
      console.error('❌ 用戶會話數據不完整:', userSession);
      setError('用戶會話數據不完整，請重新登入');
      return;
    }

    // 檢查要移除的項目是否存在
    const itemToRemove = userSession.personalOrder.find(item => item.instanceId === itemInstanceId);
    if (!itemToRemove) {
      console.warn('⚠️ 要移除的項目不存在:', itemInstanceId);
      return;
    }

    try {
      // 更新本地狀態
      const updatedUserSession = {
        ...userSession,
        personalOrder: userSession.personalOrder.filter(item => item.instanceId !== itemInstanceId)
      };
      setUserSession(updatedUserSession);

      // 同步到 Firebase
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        console.log('🔄 正在同步移除項目到 Firebase...');
        const orderRef = doc(db, 'orders', userSession.orderId!);

        // 添加重試機制
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            const removeUpdateData = cleanDataForFirebase({
              [`memberOrders.${userSession.userId}`]: {
                userName: userSession.userName,
                items: updatedUserSession.personalOrder
              }
            });

            await Promise.race([
              updateDoc(orderRef, removeUpdateData),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('移除操作超時')), 10000)
              )
            ]);

            console.log('✅ 個人訂單移除已同步到 Firebase');
            break;
          } catch (retryError) {
            retryCount++;
            console.warn(`⚠️ 移除同步重試 ${retryCount}/${maxRetries}:`, retryError);

            if (retryCount >= maxRetries) {
              throw retryError;
            }

            // 等待後重試
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      } else {
        console.log('📱 離線模式：項目移除已保存到本地');
      }
    } catch (error) {
      console.error('❌ 同步個人訂單移除失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setError(`移除項目失敗：${errorMessage}。請檢查網路連接後重試。`);

      // 如果同步失敗，恢復本地狀態
      console.log('🔄 恢復本地狀態...');
      setUserSession(userSession);
    }
  }, [userSession, sessionData]);

  // 處理管理員為團隊成員點餐
  const handleAdminOrderUpdate = useCallback(async (userId: string, userName: string, items: OrderItem[]) => {
    if (!userSession || !sessionData) return;

    try {
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);
        const adminUpdateData = cleanDataForFirebase({
          [`memberOrders.${userId}`]: {
            userName: userName,
            items: items
          }
        });

        await updateDoc(orderRef, adminUpdateData);

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
      const { db, doc, runTransaction } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);

        console.log('🔄 使用事務操作切換到總結階段，確保數據一致性');

        // 🔧 修復：使用 Firebase 事務操作來確保數據一致性
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(orderRef);

          if (!docSnap.exists()) {
            throw new Error('訂單文檔不存在');
          }

          const currentData = docSnap.data() as SessionData;

          console.log('🔍 事務中獲取的當前數據:', {
            hasPhase: !!currentData.phase,
            hasMemberOrders: !!currentData.memberOrders,
            memberOrdersKeys: currentData.memberOrders ? Object.keys(currentData.memberOrders) : [],
            memberOrdersCount: currentData.memberOrders ? Object.keys(currentData.memberOrders).length : 0
          });

          // 只更新階段，保留所有現有數據
          const updateData = cleanDataForFirebase({
            ...currentData,
            phase: AppPhase.SUMMARY
          });

          transaction.update(orderRef, updateData);

          // 更新本地狀態為完整的數據
          setSessionData({
            ...currentData,
            phase: AppPhase.SUMMARY
          });

          return currentData;
        });

        console.log('✅ 管理員點餐數據已保存到 Firebase（使用事務操作）');
      }

      // 管理員進入訂單總覽階段
      const updatedUserSession = {
        ...userSession,
        currentPhase: AppPhase.SUMMARY
      };
      setUserSession(updatedUserSession);
    } catch (err) {
      console.error('更新階段失敗:', err);
      setError('更新階段失敗，請重試');
    }
  }, [userSession, sessionData]);

  // 處理餐廳點餐完成
  const handleRestaurantOrderingComplete = useCallback(async () => {
    console.log('🎯 處理餐廳點餐完成');
    if (!userSession || !sessionData) {
      console.log('❌ 沒有用戶會話或會話數據，無法完成');
      return;
    }

    try {
      // 檢查是否有選擇飲料店，以及用戶是否已經點了飲料
      const hasDrinkShop = sessionData.selectedDrinkShopId && sessionData.selectedDrinkShopId !== null;
      const hasOrderedDrinks = userSession.personalOrder.some(item => item.storeType === 'drink_shop');

      // 如果有飲料店但用戶還沒點飲料，則進入飲料點餐階段；否則直接進入個人總結
      const nextPhase = (hasDrinkShop && !hasOrderedDrinks) ? AppPhase.DRINK_ORDERING : AppPhase.PERSONAL_SUMMARY;

      console.log('🔍 餐廳點餐完成 - 階段切換調試:');
      console.log('- sessionData:', sessionData);
      console.log('- sessionData.selectedDrinkShopId:', sessionData.selectedDrinkShopId);
      console.log('- typeof selectedDrinkShopId:', typeof sessionData.selectedDrinkShopId);
      console.log('- hasDrinkShop:', hasDrinkShop);
      console.log('- hasOrderedDrinks:', hasOrderedDrinks);
      console.log('- nextPhase:', nextPhase);

      // 同步個人訂單到 Firebase
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);
        let updateData: any = {
          [`memberOrders.${userSession.userId}`]: {
            userName: userSession.userName,
            items: userSession.personalOrder
          }
        };

        // 如果是管理員，還需要更新階段
        if (userSession.role === UserRole.ADMIN) {
          updateData.phase = nextPhase;
        }

        // 清理數據
        updateData = cleanDataForFirebase(updateData);

        await updateDoc(orderRef, updateData);
        console.log('✅ 個人訂單已同步到 Firebase');

        // 如果是管理員，更新本地會話數據
        if (userSession.role === UserRole.ADMIN) {
          setSessionData(prev => prev ? {
            ...prev,
            phase: nextPhase
          } : null);
        }
      }

      const updatedUserSession = {
        ...userSession,
        currentPhase: nextPhase
      };
      console.log('更新用戶會話到:', updatedUserSession);
      setUserSession(updatedUserSession);
    } catch (err) {
      console.error('完成餐廳點餐失敗:', err);
      setError('完成點餐失敗，請重試');
    }
  }, [userSession, sessionData]);

  // 處理飲料點餐完成
  const handleDrinkOrderingComplete = useCallback(async () => {
    console.log('🎯 處理飲料點餐完成');
    if (!userSession || !sessionData) {
      console.log('❌ 沒有用戶會話或會話數據，無法完成');
      return;
    }

    // 驗證用戶會話數據
    if (!validateUserSession(userSession)) {
      console.error('❌ 用戶會話數據不完整:', userSession);
      setError('用戶會話數據不完整，請重新登入');
      return;
    }

    try {
      console.log('📊 當前用戶會話:', userSession);
      console.log('📊 當前會話數據:', sessionData);
      console.log('👤 用戶角色:', userSession.role, '是否為管理員:', userSession.role === UserRole.ADMIN);

      // 同步個人訂單到 Firebase
      const { db, doc, updateDoc } = firebaseServices;
      console.log('🔥 Firebase 服務:', { db: !!db, doc: !!doc, updateDoc: !!updateDoc });
      if (db) {
        console.log('📝 更新訂單 ID:', userSession.orderId);
        const orderRef = doc(db, 'orders', userSession.orderId!);
        let updateData: any = {
          [`memberOrders.${userSession.userId}`]: {
            userName: userSession.userName,
            items: userSession.personalOrder
          }
        };

        // 如果是管理員，還需要更新階段
        if (userSession.role === UserRole.ADMIN) {
          console.log('🔧 管理員用戶，同時更新階段');
          updateData.phase = AppPhase.PERSONAL_SUMMARY;
        }

        // 清理數據
        updateData = cleanDataForFirebase(updateData);

        // 添加重試機制
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            await Promise.race([
              updateDoc(orderRef, updateData),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('操作超時')), 15000)
              )
            ]);
            console.log('✅ 個人訂單已同步到 Firebase');
            break;
          } catch (retryError) {
            retryCount++;
            console.warn(`⚠️ 同步重試 ${retryCount}/${maxRetries}:`, retryError);

            if (retryCount >= maxRetries) {
              throw retryError;
            }

            // 等待後重試
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        // 如果是管理員，更新本地會話數據
        if (userSession.role === UserRole.ADMIN) {
          setSessionData(prev => prev ? {
            ...prev,
            phase: AppPhase.PERSONAL_SUMMARY
          } : null);
          console.log('✅ 本地會話數據更新成功');
        }
      } else {
        console.log('❌ Firebase 數據庫不可用');
      }

      const updatedUserSession = {
        ...userSession,
        currentPhase: AppPhase.PERSONAL_SUMMARY
      };
      console.log('🔄 更新用戶會話到:', updatedUserSession);
      setUserSession(updatedUserSession);
      console.log('✅ 飲料點餐完成處理成功');
    } catch (err) {
      console.error('❌ 完成飲料點餐失敗:', err);
      const errorMessage = err instanceof Error ? err.message : '未知錯誤';
      setError(`完成點餐失敗：${errorMessage}。請檢查網路連接後重試。`);
    }
  }, [userSession, sessionData]);

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

  // 處理非管理員點餐完成
  const handleMemberOrderingComplete = useCallback(async () => {
    console.log('🎯 處理非管理員點餐完成');
    if (!userSession || !sessionData) return;

    try {
      // 檢查當前階段，決定下一步
      let nextPhase: AppPhase;

      if (userSession.currentPhase === AppPhase.RESTAURANT_ORDERING) {
        // 如果當前在餐廳點餐階段，檢查是否有飲料店以及用戶是否已經點了飲料
        const hasDrinkShop = sessionData.selectedDrinkShopId && sessionData.selectedDrinkShopId !== null;
        const hasOrderedDrinks = userSession.personalOrder.some(item => item.storeType === 'drink_shop');

        // 如果有飲料店但用戶還沒點飲料，則進入飲料點餐階段；否則直接進入個人總結
        nextPhase = (hasDrinkShop && !hasOrderedDrinks) ? AppPhase.DRINK_ORDERING : AppPhase.PERSONAL_SUMMARY;

        console.log('🔍 餐廳點餐完成 - 非管理員:');
        console.log('- sessionData:', sessionData);
        console.log('- sessionData.selectedDrinkShopId:', sessionData.selectedDrinkShopId);
        console.log('- typeof selectedDrinkShopId:', typeof sessionData.selectedDrinkShopId);
        console.log('- hasDrinkShop:', hasDrinkShop);
        console.log('- hasOrderedDrinks:', hasOrderedDrinks);
        console.log('- nextPhase:', nextPhase);
      } else if (userSession.currentPhase === AppPhase.DRINK_ORDERING) {
        // 如果當前在飲料點餐階段，直接進入個人總結
        nextPhase = AppPhase.PERSONAL_SUMMARY;
      } else {
        // 其他情況，直接進入個人總結
        nextPhase = AppPhase.PERSONAL_SUMMARY;
      }

      // 同步個人訂單到 Firebase
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);
        const memberUpdateData = cleanDataForFirebase({
          [`memberOrders.${userSession.userId}`]: {
            userName: userSession.userName,
            items: userSession.personalOrder
          }
        });

        await updateDoc(orderRef, memberUpdateData);
        console.log('✅ 個人訂單已同步到 Firebase');
      }

      // 轉到下一階段
      const updatedUserSession = {
        ...userSession,
        currentPhase: nextPhase
      };
      console.log('🔄 非管理員用戶會話更新到:', nextPhase);
      setUserSession(updatedUserSession);
    } catch (error) {
      console.error('❌ 完成點餐失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setError(`完成點餐失敗：${errorMessage}。請檢查網路連接後重試。`);
    }
  }, [userSession, sessionData]);

  // 處理編輯訂單
  const handleEditOrder = useCallback(() => {
    if (!userSession || !sessionData) return;

    console.log('🔄 編輯訂單 - 調試信息:');
    console.log('- sessionData.selectedRestaurantId:', sessionData.selectedRestaurantId);
    console.log('- sessionData.selectedDrinkShopId:', sessionData.selectedDrinkShopId);
    console.log('- restaurants.length:', restaurants.length);
    console.log('- drinkShops.length:', drinkShops.length);

    // 確保店家數據已加載
    if (restaurants.length === 0 || drinkShops.length === 0) {
      console.log('⚠️ 店家數據尚未加載完成，稍後重試');
      setError('店家數據加載中，請稍候...');
      return;
    }

    // 管理員和非管理員都回到統一點餐介面
    // 優先選擇餐廳，如果沒有餐廳則選擇飲料店
    let firstPhase: AppPhase;
    if (sessionData.selectedRestaurantId) {
      firstPhase = AppPhase.RESTAURANT_ORDERING;
    } else if (sessionData.selectedDrinkShopId) {
      firstPhase = AppPhase.DRINK_ORDERING;
    } else {
      // 如果都沒有，這是一個錯誤狀態
      console.error('❌ 編輯訂單失敗：沒有找到選擇的店家');
      setError('編輯訂單失敗：沒有找到選擇的店家');
      return;
    }

    console.log('🔄 編輯訂單 - 切換到階段:', firstPhase);

    const updatedUserSession = {
      ...userSession,
      currentPhase: firstPhase
    };
    setUserSession(updatedUserSession);
  }, [userSession, sessionData, restaurants.length, drinkShops.length]);

  // 處理查看所有人的訂單（僅管理員）
  const handleViewAllOrders = useCallback(async () => {
    if (!userSession || !sessionData || userSession.role !== UserRole.ADMIN) return;

    try {
      // 更新 Firebase 中的階段到 SUMMARY
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);
        const viewAllUpdateData = cleanDataForFirebase({
          phase: AppPhase.SUMMARY
        });

        await updateDoc(orderRef, viewAllUpdateData);

        // 更新本地會話數據
        setSessionData(prev => prev ? {
          ...prev,
          phase: AppPhase.SUMMARY
        } : null);
      }

      // 更新用戶會話到總結階段
      const updatedUserSession = {
        ...userSession,
        currentPhase: AppPhase.SUMMARY
      };
      setUserSession(updatedUserSession);
    } catch (error) {
      console.error('❌ 查看所有訂單失敗:', error);
      setError('查看所有訂單失敗，請重試');
    }
  }, [userSession, sessionData]);

  // 處理提早收單（僅管理員）
  const handleCloseOrder = useCallback(async () => {
    if (!userSession || !sessionData || userSession.role !== UserRole.ADMIN) return;

    try {
      // 更新 Firebase 中的訂單狀態
      const { db, doc, updateDoc } = firebaseServices;
      if (db) {
        const orderRef = doc(db, 'orders', userSession.orderId!);
        const closeOrderUpdateData = cleanDataForFirebase({
          isOrderClosed: true,
          phase: AppPhase.SUMMARY
        });

        await updateDoc(orderRef, closeOrderUpdateData);

        // 更新本地會話數據
        setSessionData(prev => prev ? {
          ...prev,
          isOrderClosed: true,
          phase: AppPhase.SUMMARY
        } : null);
      }

      // 更新用戶會話到總結階段
      const updatedUserSession = {
        ...userSession,
        currentPhase: AppPhase.SUMMARY
      };
      setUserSession(updatedUserSession);
    } catch (error) {
      console.error('❌ 提早收單失敗:', error);
      setError('提早收單失敗，請重試');
    }
  }, [userSession, sessionData]);

  // 獲取當前店家
  const selectedRestaurant = sessionData?.selectedRestaurantId
    ? restaurants.find(r => r.id === sessionData.selectedRestaurantId) || null
    : null;

  const selectedDrinkShop = sessionData?.selectedDrinkShopId
    ? drinkShops.find(d => d.id === sessionData.selectedDrinkShopId) || null
    : null;

  // 調試信息
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 店家數據調試:');
    console.log('- restaurants.length:', restaurants.length);
    console.log('- drinkShops.length:', drinkShops.length);
    console.log('- sessionData?.selectedRestaurantId:', sessionData?.selectedRestaurantId);
    console.log('- sessionData?.selectedDrinkShopId:', sessionData?.selectedDrinkShopId);
    console.log('- selectedRestaurant:', selectedRestaurant);
    console.log('- selectedDrinkShop:', selectedDrinkShop);
  }





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
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="mb-6">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">同步失敗</h2>
            <div className="text-red-600 mb-4 text-sm bg-red-50 p-3 rounded border-l-4 border-red-400">
              <p className="font-medium">錯誤詳情：</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {userSession && sessionData && (
              <Button
                onClick={retrySync}
                disabled={isRetrying}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    重試中...
                  </span>
                ) : (
                  '🔄 重試同步'
                )}
              </Button>
            )}

            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white"
            >
              🔄 重新載入頁面
            </Button>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200">
            <p className="font-semibold mb-2 flex items-center">
              💡 解決建議：
            </p>
            <ul className="text-left space-y-2">
              <li className="flex items-center">
                <span className="mr-2">•</span>
                檢查網路連接 {networkStatus.isOnline ? '✅' : '❌'}
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                網路類型: {networkStatus.connectionType}
              </li>
              {networkStatus.isSlowConnection && (
                <li className="flex items-center text-yellow-700">
                  <span className="mr-2">⚠️</span>
                  網路連接較慢，請耐心等待
                </li>
              )}
              <li className="flex items-center">
                <span className="mr-2">•</span>
                嘗試重新整理頁面
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                如果問題持續，請聯繫技術支援
              </li>
            </ul>
          </div>

          {/* 顯示當前時間，幫助用戶了解錯誤發生時間 */}
          <div className="mt-4 text-xs text-gray-500">
            錯誤時間：{new Date().toLocaleString('zh-TW')}
          </div>
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
        // 管理員和非管理員都使用相同的個人點餐介面
        // 如果用戶也選擇了飲料店，同時顯示餐廳和飲料店菜單
        return (
          <MemberOrderingInterface
            restaurant={selectedRestaurant}
            drinkShop={selectedDrinkShop}
            personalOrder={userSession.personalOrder}
            userName={userSession.userName}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onComplete={userSession.role === UserRole.ADMIN ? handleRestaurantOrderingComplete : handleMemberOrderingComplete}
            deadline={deadline}
            isDeadlineReached={isDeadlineReached}
          />
        );

      case AppPhase.DRINK_ORDERING:
        // 管理員和非管理員都使用相同的個人點餐介面
        // 如果用戶也選擇了餐廳，同時顯示餐廳和飲料店菜單
        return (
          <MemberOrderingInterface
            restaurant={selectedRestaurant}
            drinkShop={selectedDrinkShop}
            personalOrder={userSession.personalOrder}
            userName={userSession.userName}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onComplete={userSession.role === UserRole.ADMIN ? handleDrinkOrderingComplete : handleMemberOrderingComplete}
            deadline={deadline}
            isDeadlineReached={isDeadlineReached}
          />
        );

      case AppPhase.MEMBER_ORDERING:
        // 調試信息（可在生產環境中移除）
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 MEMBER_ORDERING 階段調試:');
          console.log('- sessionData:', sessionData);
          console.log('- selectedRestaurantId:', sessionData?.selectedRestaurantId);
          console.log('- selectedDrinkShopId:', sessionData?.selectedDrinkShopId);
          console.log('- selectedRestaurant:', selectedRestaurant);
          console.log('- selectedDrinkShop:', selectedDrinkShop);
        }

        return (
          <MemberOrderingInterface
            restaurant={selectedRestaurant}
            drinkShop={selectedDrinkShop}
            personalOrder={userSession.personalOrder}
            userName={userSession.userName}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onComplete={handleMemberOrderingComplete}
            deadline={deadline}
            isDeadlineReached={isDeadlineReached}
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
            onViewAllOrders={userSession.role === UserRole.ADMIN ? handleViewAllOrders : undefined}
            onCloseOrder={userSession.role === UserRole.ADMIN ? handleCloseOrder : undefined}
          />
        );

      case AppPhase.SUMMARY:
        // 只有管理員可以查看所有人的訂單統計
        if (userSession.role === UserRole.ADMIN) {
          // 調試：檢查 sessionData 和 memberOrders
          console.log('🔍 SummaryDisplay 調試 - sessionData:', sessionData);
          console.log('🔍 SummaryDisplay 調試 - memberOrders:', sessionData?.memberOrders);

          // 確保 memberOrders 存在且不為空
          const memberOrders = sessionData?.memberOrders || {};
          console.log('🔍 SummaryDisplay 調試 - 詳細 memberOrders:', JSON.stringify(memberOrders, null, 2));

          const orders = Object.entries(memberOrders)
            .filter(([memberId, memberData]) => {
              const hasItems = memberData && memberData.items && memberData.items.length > 0;
              console.log(`🔍 檢查成員 ${memberId}:`, {
                memberData,
                hasItems,
                itemsLength: memberData?.items?.length || 0
              });
              return hasItems;
            })
            .map(([memberId, memberData]) => ({
              memberId,
              items: memberData.items || []
            }));

          console.log('🔍 SummaryDisplay 調試 - 轉換後的 orders:', orders);
          console.log('🔍 SummaryDisplay 調試 - orders 總數量:', orders.length);

          // 如果沒有任何訂單數據，顯示提示信息
          if (orders.length === 0) {
            console.log('⚠️ 沒有找到任何訂單數據');
            console.log('🔍 可用的 memberOrders 鍵:', Object.keys(memberOrders));
          }

          return (
            <SummaryDisplay
              orders={orders}
              memberNameMap={new Map(Object.entries(memberOrders).map(([memberId, memberData]) => [memberId, memberData?.userName || '未知成員']))}
              onStartOver={() => {}}
              onBack={() => {
                const updatedUserSession = {
                  ...userSession,
                  currentPhase: AppPhase.PERSONAL_SUMMARY
                };
                setUserSession(updatedUserSession);
              }}
              orderDate={sessionData?.orderDate || new Date().toISOString()}
              orderId={userSession.orderId!}
              restaurantName={selectedRestaurant?.name}
              drinkShopName={selectedDrinkShop?.name}
            />
          );
        } else {
          // 非管理員用戶顯示個人訂單總結
          return (
            <PersonalOrderSummary
              personalOrder={userSession.personalOrder}
              userName={userSession.userName}
              userRole={userSession.role}
              orderId={userSession.orderId!}
              deadline={deadline}
              isDeadlineReached={isDeadlineReached}
              isOrderClosed={true}
              restaurantName={selectedRestaurant?.name}
              drinkShopName={selectedDrinkShop?.name}
              onEditOrder={() => {}}
            />
          );
        }

      default:
        return <div>未知階段</div>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 font-sans" data-testid="app-container">
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
    </ErrorBoundary>
  );
};

export default NewApp;
