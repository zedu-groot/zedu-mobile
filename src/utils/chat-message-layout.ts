/** The other person in a 1:1 DM, falling back to the first participant. */
export const getDmCounterpart = <T extends { user_id?: string }>(
  participants: T[] | null | undefined,
  currentUserId?: string,
): T | undefined => {
  const list = Array.isArray(participants) ? participants : [];
  return list.find(p => String(p.user_id) !== String(currentUserId)) || list[0];
};
