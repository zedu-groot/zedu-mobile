import { ACTIONS } from '@/store/types';

export type ThreadChatType = 'dm' | 'group_dm' | 'channel';

const REPLY_THREAD_SCREEN_NAMES = [
  'ChatThreadScreen',
  'GroupChatThreadScreen',
  'ChannelThread',
] as const;

export function isOnReplyThreadScreen(routeName: string): boolean {
  return REPLY_THREAD_SCREEN_NAMES.includes(
    routeName as (typeof REPLY_THREAD_SCREEN_NAMES)[number],
  );
}

export function getThreadMessageSendUrl(
  chatType: ThreadChatType,
  channelId: string,
): string {
  switch (chatType) {
    case 'group_dm':
      return `/group-dms/messages/${channelId}`;
    case 'channel':
      return `/channels/${channelId}/messages`;
    default:
      return `/dms/messages/${channelId}`;
  }
}

// Replies are edited with a PUT to the same URL they are sent to. The
// /threads/:thread_id routes edit the parent message, not a reply.
export function getThreadMessageEditUrl(
  chatType: ThreadChatType,
  channelId: string,
): string {
  return getThreadMessageSendUrl(chatType, channelId);
}

type ReplyMessageId = string | number;

type ReplyMessageWithId = {
  id?: ReplyMessageId;
  message_id?: ReplyMessageId;
  thread_id?: ReplyMessageId;
};

// A reply's thread_id is its parent message, so it never identifies the reply.
export function getReplyMessageId(reply: ReplyMessageWithId): string | null {
  const messageId = reply.id ?? reply.message_id;
  return messageId != null ? String(messageId) : null;
}

export function getThreadReplyEditPayload(
  reply: ReplyMessageWithId,
  content: string,
) {
  const messageId = getReplyMessageId(reply);
  if (!messageId || reply.thread_id == null) return null;

  return {
    content,
    thread_id: String(reply.thread_id),
    message_id: messageId,
  };
}

export function updateReplyMessageList<T extends ReplyMessageWithId>(
  messages: T[],
  messageId: string,
  updatedMessage: Partial<T>,
): T[] {
  return messages.map(message => {
    const currentId = getReplyMessageId(message);
    return currentId === messageId
      ? { ...message, ...updatedMessage }
      : message;
  });
}

export function getThreadMessageCallbackAction(chatType: ThreadChatType) {
  return chatType === 'channel' ? ACTIONS.CHANNEL_CALLBACK : ACTIONS.CALLBACK;
}
