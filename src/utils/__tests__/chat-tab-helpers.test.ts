import { getCategoryLabel, getDmUserStatus } from '../chat-tab-helpers';
import { Chat } from '@/types/chats';

describe('chat-tab-helpers', () => {
  describe('getCategoryLabel', () => {
    it('returns base label when count is 0', () => {
      expect(getCategoryLabel('Unread', 0)).toBe('Unread');
      expect(getCategoryLabel('Groups', 0)).toBe('Groups');
    });

    it('returns base label with count when count is positive', () => {
      expect(getCategoryLabel('Unread', 1)).toBe('Unread 1');
      expect(getCategoryLabel('Unread', 9)).toBe('Unread 9');
      expect(getCategoryLabel('Groups', 3)).toBe('Groups 3');
    });

    it('returns base label when count is negative or invalid', () => {
      expect(getCategoryLabel('Unread', -1)).toBe('Unread');
    });
  });

  describe('getDmUserStatus', () => {
    it('returns true when other participant is online', () => {
      const mockChat = {
        channel_type: 'dm',
        participants: [
          { user_id: 'me', online: false },
          { user_id: 'other', online: true },
        ],
      } as unknown as Chat;
      expect(getDmUserStatus(mockChat, 'me')).toBe(true);
    });

    it('returns false when other participant is offline/away', () => {
      const mockChat = {
        channel_type: 'dm',
        participants: [
          { user_id: 'me', online: true },
          { user_id: 'other', online: false },
        ],
      } as unknown as Chat;
      expect(getDmUserStatus(mockChat, 'me')).toBe(false);
    });

    it('falls back to chat.online if participants is empty', () => {
      const mockChat = {
        channel_type: 'dm',
        online: true,
      } as unknown as Chat;
      expect(getDmUserStatus(mockChat, 'me')).toBe(true);
    });
  });
});
