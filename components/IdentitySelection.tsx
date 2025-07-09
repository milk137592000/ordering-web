import React, { useState } from 'react';
import { UserRole } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { UserIcon, PlusIcon } from './icons';

interface IdentitySelectionProps {
  onSelectRole: (role: UserRole, userName: string, orderId?: string) => void;
}

const IdentitySelection: React.FC<IdentitySelectionProps> = ({ onSelectRole }) => {
  const [userName, setUserName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleSubmit = () => {
    if (!userName.trim()) {
      alert('請輸入您的姓名');
      return;
    }

    if (selectedRole === UserRole.MEMBER && !orderId.trim()) {
      alert('請輸入訂單ID');
      return;
    }

    onSelectRole(selectedRole!, userName.trim(), selectedRole === UserRole.MEMBER ? orderId.trim() : undefined);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-6">
            <UserIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">選擇身份</h2>
            <p className="text-slate-600">請選擇您的身份以開始點餐</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                您的姓名
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="請輸入您的姓名"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedRole(UserRole.ADMIN)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedRole === UserRole.ADMIN
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center">
                  <PlusIcon className="h-6 w-6 mr-3 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold">我要發起新的點餐</h3>
                    <p className="text-sm text-slate-600">設定截止時間和選擇店家</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole(UserRole.MEMBER)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedRole === UserRole.MEMBER
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center">
                  <UserIcon className="h-6 w-6 mr-3 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold">我要加入現有點餐</h3>
                    <p className="text-sm text-slate-600">輸入訂單ID來加入點餐</p>
                  </div>
                </div>
              </button>
            </div>

            {selectedRole === UserRole.MEMBER && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  訂單ID
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="請輸入訂單ID"
                />
                <p className="text-xs text-slate-500 mt-1">
                  請向發起點餐的人索取訂單ID
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || !userName.trim() || (selectedRole === UserRole.MEMBER && !orderId.trim())}
            className="w-full"
            size="large"
          >
            {selectedRole === UserRole.ADMIN ? '開始設定點餐' : '加入點餐'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default IdentitySelection;
