import { getDmCounterpart } from '@/utils/chat-message-layout';

const ME = 'me';
const THEM = 'them';

describe('getDmCounterpart', () => {
  it('returns the participant who is not the current user', () => {
    const participants = [{ user_id: ME }, { user_id: THEM }];

    expect(getDmCounterpart(participants, ME)).toEqual({ user_id: THEM });
  });

  it('falls back to the first participant', () => {
    expect(getDmCounterpart([{ user_id: ME }], ME)).toEqual({ user_id: ME });
  });

  it('handles a missing participant list', () => {
    expect(getDmCounterpart(undefined, ME)).toBeUndefined();
  });
});
