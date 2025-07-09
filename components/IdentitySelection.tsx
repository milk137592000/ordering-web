import React, { useState, useEffect } from 'react';
import { UserRole, TeamMember } from '../types';
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');

  // 載入團隊成員列表
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        console.log('開始載入團隊成員列表...');
        const mateResponse = await fetch('/mate.md');
        console.log('mate.md 請求狀態:', mateResponse.status, mateResponse.ok);

        if (!mateResponse.ok) {
          throw new Error(`HTTP error! status: ${mateResponse.status}`);
        }

        const mateText = await mateResponse.text();
        console.log('mate.md 內容:', mateText);

        const members = mateText.trim().split('\n')
          .map(name => name.trim())
          .filter(Boolean)
          .map((name, index) => ({ id: `member-${index + 1}`, name }));

        if (members.length === 0) {
          members.push({ id: 'member-1', name: '預設成員' });
        }

        console.log('解析的成員列表:', members);
        setTeamMembers(members);
      } catch (error) {
        console.error('無法載入團隊成員列表:', error);
        const defaultMembers = [{ id: 'member-1', name: '預設成員' }];
        console.log('使用預設成員列表:', defaultMembers);
        setTeamMembers(defaultMembers);
      }
    };

    loadTeamMembers();
  }, []);

  const handleUserNameChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true);
      setUserName('');
    } else {
      setShowCustomInput(false);
      setUserName(value);
      setCustomName('');
    }
  };

  const handleCustomNameSubmit = () => {
    if (customName.trim()) {
      setUserName(customName.trim());
      setShowCustomInput(false);
    }
  };

  const handleSubmit = () => {
    const finalUserName = showCustomInput ? customName.trim() : userName.trim();

    if (!finalUserName) {
      alert('請選擇或輸入您的姓名');
      return;
    }

    if (selectedRole === UserRole.MEMBER && !orderId.trim()) {
      alert('請輸入訂單ID');
      return;
    }

    onSelectRole(selectedRole!, finalUserName, selectedRole === UserRole.MEMBER ? orderId.trim() : undefined);
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
              <select
                value={showCustomInput ? 'custom' : userName}
                onChange={(e) => handleUserNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">請選擇您的姓名...</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
                <option value="custom">+ 自訂姓名</option>
              </select>
            </div>

            {/* 自訂姓名輸入 */}
            {showCustomInput && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  自訂姓名
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="請輸入您的姓名"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCustomNameSubmit();
                      }
                    }}
                  />
                  <Button onClick={handleCustomNameSubmit} disabled={!customName.trim()}>
                    確認
                  </Button>
                </div>
              </div>
            )}

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
            disabled={
              !selectedRole ||
              (!showCustomInput && !userName.trim()) ||
              (showCustomInput && !customName.trim()) ||
              (selectedRole === UserRole.MEMBER && !orderId.trim())
            }
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
