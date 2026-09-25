import { create } from 'zustand';
import { getWatchParties } from '@/lib/api/watch-parties';
import type {
  WatchPartySearchParams,
  WatchPartyStatus,
  WatchPartySummaryResponse,
} from '@/lib/types';

interface CursorState {
  nextCursor: string | null;
  nextIdAfter: string | null;
  hasNext: boolean;
  totalCount: number;
}

interface WatchPartyStore {
  data: WatchPartySummaryResponse[];
  status: WatchPartyStatus;
  cursor: CursorState;
  loading: boolean;
  error: string | null;
  setStatus: (status: WatchPartyStatus) => void;
  fetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PAGE_SIZE = 20;
const emptyCursor: CursorState = {
  nextCursor: null,
  nextIdAfter: null,
  hasNext: false,
  totalCount: 0,
};

let requestSequence = 0;

const uniqueParties = (items: WatchPartySummaryResponse[]) =>
  Array.from(new Map(items.map((party) => [party.id, party])).values());

const useWatchPartyStore = create<WatchPartyStore>((set, get) => {
  const request = async (append: boolean) => {
    const { loading, status, cursor, data } = get();
    if (loading || (append && !cursor.hasNext)) return;

    const sequence = ++requestSequence;
    const params: WatchPartySearchParams = {
      statusEqual: status,
      limit: PAGE_SIZE,
      sortDirection: status === 'ENDED' ? 'DESCENDING' : 'ASCENDING',
      ...(append ? { cursor: cursor.nextCursor ?? undefined, idAfter: cursor.nextIdAfter ?? undefined } : {}),
    };

    if (append && (!params.cursor || !params.idAfter)) {
      set({ error: '다음 페이지 정보를 확인할 수 없습니다.' });
      return;
    }

    set({ loading: true, error: null, ...(append ? {} : { data: [], cursor: emptyCursor }) });
    try {
      const response = await getWatchParties(params);
      if (sequence !== requestSequence) return;
      set({
        data: uniqueParties(append ? [...data, ...response.data] : response.data),
        cursor: {
          nextCursor: response.nextCursor,
          nextIdAfter: response.nextIdAfter,
          hasNext: response.hasNext,
          totalCount: response.totalCount,
        },
      });
    } catch (error) {
      if (sequence !== requestSequence) return;
      console.error(error);
      set({ error: 'Watch Party 목록을 불러오지 못했습니다.' });
    } finally {
      if (sequence === requestSequence) set({ loading: false });
    }
  };

  return {
    data: [],
    status: 'LIVE',
    cursor: emptyCursor,
    loading: false,
    error: null,
    setStatus: (status) => {
      requestSequence += 1;
      set({ status, data: [], cursor: emptyCursor, error: null, loading: false });
      void request(false);
    },
    fetch: () => request(false),
    fetchMore: () => request(true),
    refresh: () => request(false),
  };
});

export default useWatchPartyStore;
