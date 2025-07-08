import React, { useState } from 'react';
import { TeamMember } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { UserPlusIcon, TrashIcon } from './icons';

interface TeamSetupProps {
  teamMembers: TeamMember[];
  onAddMember: (name: string) => void;
  onRemoveMember: (memberId: string) => void;
  onStartOrdering: () => void;
}

const TeamSetup: React.FC<TeamSetupProps> = ({
  teamMembers,
  onAddMember,
  onRemoveMember,
  onStartOrdering
}) => {
  const [memberName, setMemberName] = useState('');
  const [error, setError] = useState('');

  const handleAddMember = () => {
    const trimmedName = memberName.trim();

    if (!trimmedName) {
      setError('請輸入成員姓名');
      return;
    }

    if (teamMembers.some(member => member.name === trimmedName)) {
      setError('成員姓名已存在');
      return;
    }

    onAddMember(trimmedName);
    setMemberName('');
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberName(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800">團隊設定</h2>
        <p className="text-slate-500 mt-2">新增團隊成員來開始點餐</p>
      </div>

      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">新增成員</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={memberName}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="輸入成員姓名"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Button onClick={handleAddMember} disabled={!memberName.trim()}>
              <UserPlusIcon className="h-5 w-5 mr-2" />
              新增成員
            </Button>
          </div>
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </div>
      </Card>

      {teamMembers.length > 0 && (
        <Card className="mb-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">
              團隊成員 ({teamMembers.length})
            </h3>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <span className="font-medium text-slate-800">{member.name}</span>
                  <Button
                    onClick={() => onRemoveMember(member.id)}
                    variant="secondary"
                    size="small"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="text-center">
        <Button
          onClick={onStartOrdering}
          size="large"
          disabled={teamMembers.length === 0}
        >
          開始點餐
        </Button>
        {teamMembers.length === 0 && (
          <p className="text-slate-500 text-sm mt-2">
            請至少新增一位成員才能開始點餐
          </p>
        )}
      </div>
    </div>
  );
};

export default TeamSetup;