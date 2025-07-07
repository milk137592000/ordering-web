// 全新方法：Firebase 在 index.html 中初始化並掛載到 window。
// 這個檔案作為一個橋樑，讓這些服務可以透過標準的 ES6 模組導入方式被應用程式的其他部分使用，
// 而無需更改任何其他檔案。

// 型別斷言，告知 TypeScript 我們全域物件的結構。
interface FirebaseServices {
  db: any; // 理想情況下會導入真實型別，但此處 'any' 是安全的。
  doc: (...args: any[]) => any;
  setDoc: (...args: any[]) => Promise<void>;
  onSnapshot: (...args: any[]) => () => void; // 返回一個取消訂閱的函式
  getDoc: (...args: any[]) => Promise<any>;
}

const services = (window as any).firebaseServices as FirebaseServices;

if (!services || !services.db) {
  // 如果 index.html 中的初始化腳本失敗，這個錯誤會非常明顯。
  // 請確認您已在 index.html 中填入您自己的 firebaseConfig。
  throw new Error("在 window 物件上找不到 Firebase 服務。index.html 中的初始化可能已失敗。");
}

export const { db, doc, setDoc, onSnapshot, getDoc } = services;