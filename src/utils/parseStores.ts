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
      } else if (line.startsWith('-')) {
        // Parse menu item
        const match = line.match(/^-\s*(.+?)\s*\$(\d+(?:\.\d+)?)/);
        const isToppingCategory = TOPPING_CATEGORY_KEYWORDS.some(keyword => 
          currentCategory.name.includes(keyword)
        );

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
