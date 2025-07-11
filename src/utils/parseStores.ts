import { Store, MenuCategory, Topping } from '../types';

export const parseStoresFromMarkdown = (
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

  const parseToppings = (itemName: string): string[] => {
    const toppings: string[] = [];
    let remaining = itemName;
    
    for (const topping of KNOWN_TOPPINGS) {
      if (remaining.includes(topping)) {
        toppings.push(topping);
        remaining = remaining.replace(new RegExp(topping, 'g'), '');
      }
    }
    
    // Handle + separated toppings
    const plusSeparated = remaining.split('+').map(t => t.trim()).filter(t => t.length > 0);
    toppings.push(...plusSeparated);
    
    return [...new Set(toppings)]; // Remove duplicates
  };

  for (const block of storeBlocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0) continue;
    
    const storeName = lines[0].trim();
    if (!storeName) continue;
    
    const menu: MenuCategory[] = [];
    const storeToppings: Topping[] = [];
    let currentCategory: MenuCategory = { name: '', items: [] };
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('##')) {
        // Save previous category if it has items
        if (currentCategory.name !== '' || currentCategory.items.length > 0) {
          if (currentCategory.items.length > 0) {
            menu.push(currentCategory);
          }
        }
        
        // Start new category
        const categoryName = line.replace(/^##\s*/, '').trim();
        currentCategory = { name: categoryName, items: [] };
      } else if (line.startsWith('-') || line.match(/^[^#\s].+\s+[\$\d]/)) {
        // Parse menu item - handle multiple formats
        let match = null;

        // Format 1: "- item .......... $price"
        match = line.match(/^-\s*(.+?)\s*\.+\s*\$(\d+(?:\.\d+)?)/);

        // Format 2: "- item $price" (without dots)
        if (!match) {
          match = line.match(/^-\s*(.+?)\s*\$(\d+(?:\.\d+)?)/);
        }

        // Format 3: "item .......... price" (drinks.md format, no $ symbol)
        if (!match) {
          match = line.match(/^(.+?)\s*\.+\s*(\d+(?:\.\d+)?)$/);
        }

        // Format 4: "item price" (without dots or $)
        if (!match) {
          match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
        }

        const isToppingCategory = TOPPING_CATEGORY_KEYWORDS.some(keyword =>
          currentCategory.name.includes(keyword)
        );

        if (match) {
          // Remove dots from item name
          const itemName = match[1].replace(/\.+/g, '').trim();
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
    }
    
    // Add the last category if it has items
    if (currentCategory.name !== '' || currentCategory.items.length > 0) {
      if (currentCategory.items.length > 0) {
        menu.push(currentCategory);
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

// 添加"其他選項"到餐廳菜單
const addOtherOptionsToRestaurants = (stores: Store[]): Store[] => {
  return stores.map(store => {
    if (store.type === 'restaurant') {
      // 為餐廳添加"其他選項"分類
      const otherOptionsCategory: MenuCategory = {
        name: '其他選項',
        items: [
          {
            id: 99999, // 使用特殊ID來標識其他選項
            name: '其他選項（請在備註中說明需求和價格）',
            price: 0 // 預設價格為0，用戶需要自行輸入
          }
        ]
      };

      return {
        ...store,
        menu: [...store.menu, otherOptionsCategory]
      };
    }
    return store;
  });
};

// 解析餐廳和飲料店數據的主函數
export const parseStores = (text: string): Store[] => {
  const idCounters = { store: 1, item: 101 };

  // 分別解析餐廳和飲料店
  const restaurants = parseStoresFromMarkdown(text, 'restaurant', idCounters);
  const drinkShops = parseStoresFromMarkdown(text, 'drink_shop', idCounters);

  // 為餐廳添加"其他選項"
  const restaurantsWithOtherOptions = addOtherOptionsToRestaurants(restaurants);

  return [...restaurantsWithOtherOptions, ...drinkShops];
};

export const loadStoresData = async (): Promise<Store[]> => {
  try {
    console.log('開始載入餐廳數據...');

    // 首先嘗試載入 JSON 文件
    try {
      const jsonResponse = await fetch('/restaurants.json');
      console.log('restaurants.json 請求狀態:', jsonResponse.status, jsonResponse.ok);

      if (jsonResponse.ok) {
        const data = await jsonResponse.json();
        console.log('restaurants.json 內容:', data);

        if (data.stores && Array.isArray(data.stores)) {
          console.log('成功載入 JSON 餐廳數據:', data.stores.length, '家店');
          return data.stores;
        }
      }
    } catch (jsonError) {
      console.warn('JSON 載入失敗:', jsonError);
    }

    // 如果 JSON 失敗，嘗試載入 MD 文件
    console.log('JSON 載入失敗，嘗試載入 restaurants.md...');
    const response = await fetch('/restaurants.md');
    console.log('restaurants.md 請求狀態:', response.status, response.ok);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log('restaurants.md 內容長度:', text.length);

    const stores = parseStores(text);
    console.log('成功解析 MD 餐廳數據:', stores.length, '家店');
    return stores;

  } catch (error) {
    console.error('Failed to load restaurant data:', error);
    console.log('使用預設餐廳數據');

    // 返回預設數據
    return [
      {
        id: 'default-1',
        name: '預設餐廳',
        type: 'restaurant',
        items: [
          { id: 'default-item-1', name: '預設餐點', price: 100 }
        ]
      }
    ];
  }
};
