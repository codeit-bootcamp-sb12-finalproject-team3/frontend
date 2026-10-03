import { create } from 'zustand';
import {
  cancelWatchPartyReminder,
  getScheduledWatchPartiesByMe,
  isReminderAlreadyInState,
  setWatchPartyReminder,
} from '@/lib/api/watch-parties';

interface WatchPartyReminderStore {
  userId: string | null;
  scheduledPartyIds: Set<string>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  mutatingPartyIds: Set<string>;
  fetch: (userId: string, force?: boolean) => Promise<void>;
  setReminder: (userId: string, partyId: string) => Promise<void>;
  cancelReminder: (userId: string, partyId: string) => Promise<void>;
}

let requestSequence = 0;

const useWatchPartyReminderStore = create<WatchPartyReminderStore>((set, get) => {
  const fetch = async (userId: string, force = false) => {
    const current = get();
    if (!force && current.userId === userId && (current.loaded || current.loading)) return;

    const sequence = ++requestSequence;
    set({
      userId,
      loading: true,
      error: null,
      ...(current.userId === userId ? {} : { scheduledPartyIds: new Set(), loaded: false }),
    });

    try {
      const parties = await getScheduledWatchPartiesByMe();
      if (sequence !== requestSequence || get().userId !== userId) return;
      set({ scheduledPartyIds: new Set(parties.map((party) => party.id)), loaded: true });
    } catch (error) {
      if (sequence !== requestSequence || get().userId !== userId) return;
      console.error(error);
      set({ error: '리마인더 상태를 불러오지 못했습니다.' });
    } finally {
      if (sequence === requestSequence && get().userId === userId) set({ loading: false });
    }
  };

  const mutate = async (
    userId: string,
    partyId: string,
    request: (partyId: string) => Promise<void>,
    registered: boolean,
  ) => {
    if (get().mutatingPartyIds.has(partyId)) return;
    set((state) => ({ mutatingPartyIds: new Set(state.mutatingPartyIds).add(partyId) }));
    try {
      try {
        await request(partyId);
      } catch (error) {
        // 이미 원하던 상태면 성공으로 보고 아래로 진행, 아니면 그대로 에러
        if (!isReminderAlreadyInState(error, registered)) throw error;
      }
      set((state) => {
        const next = new Set(state.scheduledPartyIds);
        if (registered) next.add(partyId);
        else next.delete(partyId);
        return { scheduledPartyIds: next };
      });
      await fetch(userId, true);
    } finally {
      set((state) => {
        const next = new Set(state.mutatingPartyIds);
        next.delete(partyId);
        return { mutatingPartyIds: next };
      });
    }
  };

  return {
    userId: null,
    scheduledPartyIds: new Set(),
    loaded: false,
    loading: false,
    error: null,
    mutatingPartyIds: new Set(),
    fetch,
    setReminder: (userId, partyId) => mutate(userId, partyId, setWatchPartyReminder, true),
    cancelReminder: (userId, partyId) => mutate(userId, partyId, cancelWatchPartyReminder, false),
  };
});

export default useWatchPartyReminderStore;
