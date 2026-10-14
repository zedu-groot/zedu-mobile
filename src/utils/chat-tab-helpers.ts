import { Chat } from '@/types/chats';

/**
 * Returns formatted category label with count if count > 0, otherwise just the base name.
 */
export function getCategoryLabel(baseName: string, count: number): string {
  if (count > 0) {
    return `${baseName} ${count}`;
  }
  return baseName;
}

/**
 * Determines whether the counterpart in a direct message is online.
 */
export function getDmUserStatus(item: Chat, currentUserId?: string): boolean {
  if (item.participants && item.participants.length > 0) {
    const otherParticipant = item.participants.find(
      p => p.user_id !== currentUserId,
    );
    if (otherParticipant) {
      return Boolean(otherParticipant.online);
    }
    return Boolean(item.participants[0]?.online);
  }
  return Boolean((item as Chat & { online?: boolean }).online);
}
