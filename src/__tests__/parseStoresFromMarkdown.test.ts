import { parseStoresFromMarkdown } from '../utils/parseStores';

describe('parseStoresFromMarkdown', () => {
  let idCounters: { store: number; item: number };

  beforeEach(() => {
    idCounters = { store: 1, item: 101 };
  });

  describe('Restaurant parsing', () => {
    it('should parse basic restaurant markdown correctly', () => {
      const markdown = `
# 測試餐廳
## 主餐
- 牛肉麵 $120
- 雞肉飯 $80
## 湯品
- 玉米濃湯 $40
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: '測試餐廳',
        type: 'restaurant',
        menu: [
          {
            name: '主餐',
            items: [
              { id: 101, name: '牛肉麵', price: 120 },
              { id: 102, name: '雞肉飯', price: 80 }
            ]
          },
          {
            name: '湯品',
            items: [
              { id: 103, name: '玉米濃湯', price: 40 }
            ]
          }
        ],
        toppings: []
      });
    });

    it('should handle multiple restaurants', () => {
      const markdown = `
# 第一間餐廳
## 主餐
- 牛肉麵 $120

# 第二間餐廳
## 主餐
- 雞肉飯 $80
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('第一間餐廳');
      expect(result[1].name).toBe('第二間餐廳');
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should handle empty categories gracefully', () => {
      const markdown = `
# 測試餐廳
## 主餐
- 牛肉麵 $120
## 空分類
## 湯品
- 玉米濃湯 $40
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0].menu).toHaveLength(2);
      expect(result[0].menu[0].name).toBe('主餐');
      expect(result[0].menu[1].name).toBe('湯品');
    });

    it('should handle invalid price formats', () => {
      const markdown = `
# 測試餐廳
## 主餐
- 牛肉麵 $120
- 無效價格 $abc
- 雞肉飯 $80
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0].menu[0].items).toHaveLength(2);
      expect(result[0].menu[0].items[0].name).toBe('牛肉麵');
      expect(result[0].menu[0].items[1].name).toBe('雞肉飯');
    });
  });

  describe('Drink shop parsing', () => {
    it('should parse drink shop with toppings correctly', () => {
      const markdown = `
# 測試飲料店
## 茶類
- 珍珠奶茶 $50
- 紅茶 $30
## 加料
- 珍珠 $10
- 椰果 $10
- 波霸 $15
      `;

      const result = parseStoresFromMarkdown(markdown, 'drink_shop', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: '測試飲料店',
        type: 'drink_shop',
        menu: [
          {
            name: '茶類',
            items: [
              { id: 101, name: '珍珠奶茶', price: 50 },
              { id: 102, name: '紅茶', price: 30 }
            ]
          }
        ],
        toppings: [
          { name: '珍珠', price: 10 },
          { name: '椰果', price: 10 },
          { name: '波霸', price: 15 }
        ]
      });
    });

    it('should handle complex topping names', () => {
      const markdown = `
# 測試飲料店
## 茶類
- 奶茶 $40
## 加料
- 黃金珍珠+波霸+椰果 $15
- 烘烏龍茶凍 $10
      `;

      const result = parseStoresFromMarkdown(markdown, 'drink_shop', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0].toppings).toEqual([
        { name: '黃金珍珠', price: 15 },
        { name: '波霸', price: 15 },
        { name: '椰果', price: 15 },
        { name: '烘烏龍茶凍', price: 10 }
      ]);
    });

    it('should identify topping categories by keywords', () => {
      const markdown = `
# 測試飲料店
## 茶類
- 奶茶 $40
## 口感加點
- 珍珠 $10
## 選料
- 椰果 $10
      `;

      const result = parseStoresFromMarkdown(markdown, 'drink_shop', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0].menu).toHaveLength(1);
      expect(result[0].menu[0].name).toBe('茶類');
      expect(result[0].toppings).toEqual([
        { name: '珍珠', price: 10 },
        { name: '椰果', price: 10 }
      ]);
    });

    it('should handle dots in item names and remove them', () => {
      const markdown = `
# 測試餐廳
## 主餐
- 三日野菜 .......... $200
- 牛肉麵 .......... $120
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0].menu[0].items).toEqual([
        { id: 101, name: '三日野菜', price: 200 },
        { id: 102, name: '牛肉麵', price: 120 }
      ]);
    });

    it('should handle drinks.md format without dashes', () => {
      const markdown = `
# 鶴茶樓 飲料店菜單
## 私藏古法茶
鶴頂紅茶 .......... 35
綠夢紅茶 .......... 40
## 加料
珍珠 .......... 10
椰果 .......... 10
      `;

      const result = parseStoresFromMarkdown(markdown, 'drink_shop', idCounters);

      expect(result).toHaveLength(1);
      expect(result[0].menu).toHaveLength(1);
      expect(result[0].menu[0].items).toEqual([
        { id: 101, name: '鶴頂紅茶', price: 35 },
        { id: 102, name: '綠夢紅茶', price: 40 }
      ]);
      expect(result[0].toppings).toEqual([
        { name: '珍珠', price: 10 },
        { name: '椰果', price: 10 }
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty markdown', () => {
      const result = parseStoresFromMarkdown('', 'restaurant', idCounters);
      expect(result).toHaveLength(0);
    });

    it('should handle markdown with no valid stores', () => {
      const markdown = `
# 
## 
- 
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);
      expect(result).toHaveLength(0);
    });

    it('should handle stores with no menu items', () => {
      const markdown = `
# 空餐廳
## 主餐
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);
      expect(result).toHaveLength(0);
    });

    it('should increment ID counters correctly', () => {
      const markdown = `
# 餐廳一
## 主餐
- 餐點一 $100
- 餐點二 $200

# 餐廳二
## 主餐
- 餐點三 $300
      `;

      const result = parseStoresFromMarkdown(markdown, 'restaurant', idCounters);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[0].menu[0].items[0].id).toBe(101);
      expect(result[0].menu[0].items[1].id).toBe(102);
      expect(result[1].menu[0].items[0].id).toBe(103);
      expect(idCounters.store).toBe(3);
      expect(idCounters.item).toBe(104);
    });
  });
});
