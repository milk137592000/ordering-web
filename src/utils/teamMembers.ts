import { TeamMember } from '../../types';

// 預設團隊成員列表
const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: 'member-1', name: '誠' },
  { id: 'member-2', name: '麟' },
  { id: 'member-3', name: '銘' },
  { id: 'member-4', name: '弘' },
  { id: 'member-5', name: '佳' },
  { id: 'member-6', name: '昌' },
  { id: 'member-7', name: '毅' },
  { id: 'member-8', name: '鈞' },
  { id: 'member-9', name: '昇' }
];

/**
 * 載入團隊成員列表
 * 優先順序：JSON 文件 > MD 文件 > 預設列表
 */
export const loadTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    console.log('開始載入團隊成員列表...');
    
    // 首先嘗試載入 JSON 文件
    try {
      const response = await fetch('/team-members.json');
      console.log('team-members.json 請求狀態:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('team-members.json 內容:', data);
        
        if (data.members && Array.isArray(data.members)) {
          const members = data.members
            .filter(Boolean)
            .map((name: string, index: number) => ({ 
              id: `member-${index + 1}`, 
              name: name.trim() 
            }));
          
          if (members.length > 0) {
            console.log('成功載入 JSON 成員列表:', members);
            return members;
          }
        }
      }
    } catch (jsonError) {
      console.warn('JSON 載入失敗:', jsonError);
    }
    
    // 如果 JSON 失敗，嘗試載入 .md 文件
    try {
      console.log('JSON 載入失敗，嘗試載入 mate.md...');
      const response = await fetch('/mate.md');
      console.log('mate.md 請求狀態:', response.status, response.ok);
      
      if (response.ok) {
        const mateText = await response.text();
        console.log('mate.md 內容:', mateText);
        
        const members = mateText.trim().split('\n')
          .map(name => name.trim())
          .filter(Boolean)
          .map((name, index) => ({ id: `member-${index + 1}`, name }));

        if (members.length > 0) {
          console.log('成功載入 MD 成員列表:', members);
          return members;
        }
      }
    } catch (mdError) {
      console.warn('MD 載入失敗:', mdError);
    }
    
    // 如果都失敗，使用預設列表
    throw new Error('所有載入方式都失敗');
    
  } catch (error) {
    console.error('無法載入團隊成員列表:', error);
    console.log('使用預設成員列表:', DEFAULT_TEAM_MEMBERS);
    return DEFAULT_TEAM_MEMBERS;
  }
};

/**
 * 獲取預設團隊成員列表
 */
export const getDefaultTeamMembers = (): TeamMember[] => {
  return [...DEFAULT_TEAM_MEMBERS];
};
