# MongoDB 遷移指南

## 為什麼考慮 MongoDB？

### Firebase 的問題
- 網路依賴性強，連接不穩定
- 配置複雜，容易出錯
- 有使用配額限制
- 跨域問題

### MongoDB 的優勢
- 更穩定的連接
- 更好的控制權
- 沒有配額限制（自建）
- 更適合複雜查詢

## 遷移方案

### 方案一：MongoDB + Express API + Socket.io
```
前端 ↔ Express API ↔ MongoDB
     ↕
   Socket.io (實時同步)
```

**優點：**
- 完全控制數據流
- 實時同步功能
- 更穩定的連接

**缺點：**
- 需要建立後端
- 開發工作量大

### 方案二：MongoDB Atlas + Realm (現在叫 App Services)
```
前端 ↔ MongoDB Realm ↔ MongoDB Atlas
```

**優點：**
- 類似 Firebase 的體驗
- 實時同步內建
- 較少後端工作

**缺點：**
- 仍有雲服務依賴
- 學習曲線

### 方案三：本地存儲 + 定期同步
```
前端 ↔ LocalStorage/IndexedDB
     ↕
   定期同步到後端
```

**優點：**
- 離線優先
- 用戶體驗好

**缺點：**
- 同步邏輯複雜
- 衝突處理困難

## 建議的實施步驟

### 第一階段：改善 Firebase
1. ✅ 增加重試機制
2. ✅ 改善錯誤處理
3. ✅ 添加網路狀態檢測
4. 🔄 優化連接設定
5. 🔄 添加離線模式

### 第二階段：評估遷移
1. 監控 Firebase 穩定性
2. 如果問題持續，開始 MongoDB 遷移
3. 建立簡單的 Express + MongoDB 後端
4. 實施基本的 CRUD 操作

### 第三階段：完整遷移
1. 實施實時同步 (Socket.io)
2. 數據遷移
3. 測試和優化

## 快速 MongoDB 設置

### 1. 安裝依賴
```bash
npm install express mongoose socket.io cors
npm install -D @types/express @types/cors
```

### 2. 基本後端結構
```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB 連接
mongoose.connect('mongodb://localhost:27017/ordering-system');

// 訂單模型
const OrderSchema = new mongoose.Schema({
  orderId: String,
  adminId: String,
  adminName: String,
  phase: String,
  teamMembers: Array,
  memberOrders: Object,
  // ... 其他字段
});

const Order = mongoose.model('Order', OrderSchema);

// API 路由
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id });
  res.json(order);
});

app.post('/api/orders', async (req, res) => {
  const order = new Order(req.body);
  await order.save();
  
  // 實時通知所有客戶端
  io.emit('orderUpdated', order);
  
  res.json(order);
});

// Socket.io 實時同步
io.on('connection', (socket) => {
  socket.on('joinOrder', (orderId) => {
    socket.join(orderId);
  });
  
  socket.on('updateOrder', async (data) => {
    await Order.updateOne({ orderId: data.orderId }, data);
    socket.to(data.orderId).emit('orderUpdated', data);
  });
});

server.listen(3001);
```

### 3. 前端適配
```typescript
// services/api.ts
class OrderAPI {
  private socket: any;
  
  constructor() {
    this.socket = io('http://localhost:3001');
  }
  
  async createOrder(orderData: SessionData) {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return response.json();
  }
  
  async updateOrder(orderId: string, updates: Partial<SessionData>) {
    this.socket.emit('updateOrder', { orderId, ...updates });
  }
  
  onOrderUpdate(callback: (order: SessionData) => void) {
    this.socket.on('orderUpdated', callback);
  }
  
  joinOrder(orderId: string) {
    this.socket.emit('joinOrder', orderId);
  }
}
```

## 結論

建議先完成 Firebase 的改善，如果問題持續存在，再考慮遷移到 MongoDB。遷移是一個大工程，需要仔細規劃和測試。
