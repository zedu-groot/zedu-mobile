import {
  getThreadMessageEditUrl,
  getThreadReplyEditPayload,
  updateReplyMessageList,
} from '../src/utils/thread-message';

describe('thread message editing', () => {
  it.each([
    ['dm', '/dms/messages/channel-1'],
    ['group_dm', '/group-dms/messages/channel-1'],
    ['channel', '/channels/channel-1/messages'],
  ] as const)('uses the %s reply edit endpoint', (chatType, expectedUrl) => {
    expect(getThreadMessageEditUrl(chatType, 'channel-1')).toBe(expectedUrl);
  });

  it('identifies the reply by its own id, not the parent thread id', () => {
    expect(
      getThreadReplyEditPayload(
        { id: 'reply-1', thread_id: 'root-1' },
        '<p>Edited</p>',
      ),
    ).toEqual({
      content: '<p>Edited</p>',
      thread_id: 'root-1',
      message_id: 'reply-1',
    });
  });

  it('falls back to message_id when the reply has no id', () => {
    expect(
      getThreadReplyEditPayload(
        { message_id: 'reply-1', thread_id: 'root-1' },
        '<p>Edited</p>',
      )?.message_id,
    ).toBe('reply-1');
  });

  it('refuses to edit when the reply has no id of its own', () => {
    expect(
      getThreadReplyEditPayload({ thread_id: 'root-1' }, '<p>Edited</p>'),
    ).toBeNull();
  });

  it('updates only the matching reply in the thread', () => {
    const replies = [
      {
        id: 'reply-1',
        thread_id: 'root-1',
        message: '<p>Old reply</p>',
        edited: false,
      },
      {
        id: 'reply-2',
        thread_id: 'root-1',
        message: '<p>Other reply</p>',
        edited: false,
      },
    ];

    expect(
      updateReplyMessageList(replies, 'reply-1', {
        message: '<p>Edited reply</p>',
        edited: true,
      }),
    ).toEqual([
      {
        id: 'reply-1',
        thread_id: 'root-1',
        message: '<p>Edited reply</p>',
        edited: true,
      },
      replies[1],
    ]);
  });

  it('does not match replies by their shared parent thread id', () => {
    const replies = [
      { thread_id: 'root-1', message: '<p>A</p>' },
      { thread_id: 'root-1', message: '<p>B</p>' },
    ];

    expect(
      updateReplyMessageList(replies, 'root-1', { message: '<p>X</p>' }),
    ).toEqual(replies);
  });
});
