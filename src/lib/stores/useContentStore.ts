import { create } from 'zustand';
import { getContents } from '@/lib/api/contents';
import type { ContentSearchParams, ContentSummaryResponse } from '@/lib/types';

interface ContentCursorState {
  nextCursor: string | null;
  nextIdAfter: string | null;
  hasNext: boolean;
  totalCount: number;
}

interface ContentStore {
  data: ContentSummaryResponse[];
  params: Omit<ContentSearchParams, 'cursor' | 'idAfter'>;
  cursorState: ContentCursorState;
  loading: boolean;
  error?: string;
  scrollPosition: number;
  shouldRestoreScroll: boolean;
  updateParams: (
    params: Partial<Omit<ContentSearchParams, 'cursor' | 'idAfter'>>,
  ) => void;
  fetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
  hasNext: () => boolean;
  saveScrollPosition: (position: number) => void;
  markScrollRestored: () => void;
  prepareFreshBrowse: () => void;
  update: (id: string, data: Partial<ContentSummaryResponse>) => void;
  delete: (id: string) => void;
}

const initialCursorState: ContentCursorState = {
  nextCursor: null,
  nextIdAfter: null,
  hasNext: false,
  totalCount: 0,
};

let requestSequence = 0;

const uniqueContents = (contents: ContentSummaryResponse[]): ContentSummaryResponse[] =>
  Array.from(new Map(contents.map((content) => [content.id, content])).values());

const useContentStore = create<ContentStore>((set, get) => ({
  data: [],
  params: {
    limit: 20,
    sortBy: 'rating',
  },
  cursorState: initialCursorState,
  loading: false,
  error: undefined,
  scrollPosition: 0,
  shouldRestoreScroll: false,

  updateParams: (params) => {
    set((state) => ({
      params: { ...state.params, ...params },
      scrollPosition: 0,
      shouldRestoreScroll: false,
    }));
    void get().fetch();
  },

  fetch: async () => {
    const sequence = ++requestSequence;
    const { params, data: previousData, shouldRestoreScroll } = get();
    const targetSize = shouldRestoreScroll
      ? Math.max(previousData.length, params.limit)
      : params.limit;
    set({ loading: true, error: undefined, data: [], cursorState: initialCursorState });

    try {
      let response = await getContents(params);
      let refreshedData = uniqueContents(response.data);
      while (
        response.hasNext
        && response.nextCursor
        && response.nextIdAfter
        && refreshedData.length < targetSize
      ) {
        response = await getContents({
          ...params,
          cursor: response.nextCursor,
          idAfter: response.nextIdAfter,
        });
        refreshedData = uniqueContents([...refreshedData, ...response.data]);
      }
      if (requestSequence !== sequence) return;
      set({
        data: refreshedData,
        cursorState: {
          nextCursor: response.nextCursor,
          nextIdAfter: response.nextIdAfter,
          hasNext: response.hasNext,
          totalCount: response.totalCount,
        },
      });
    } catch (error) {
      if (requestSequence !== sequence) return;
      console.error(error);
      set({ error: '콘텐츠 목록을 불러오지 못했습니다.' });
    } finally {
      if (requestSequence === sequence) set({ loading: false });
    }
  },

  fetchMore: async () => {
    const { cursorState, loading, params, data } = get();
    if (loading || !cursorState.hasNext) return;
    if (!cursorState.nextCursor || !cursorState.nextIdAfter) {
      set({ error: '다음 페이지 정보를 확인할 수 없습니다.' });
      return;
    }

    const sequence = ++requestSequence;
    set({ loading: true, error: undefined });
    try {
      const response = await getContents({
        ...params,
        cursor: cursorState.nextCursor,
        idAfter: cursorState.nextIdAfter,
      });
      if (requestSequence !== sequence) return;
      set({
        data: uniqueContents([...data, ...response.data]),
        cursorState: {
          nextCursor: response.nextCursor,
          nextIdAfter: response.nextIdAfter,
          hasNext: response.hasNext,
          totalCount: response.totalCount,
        },
      });
    } catch (error) {
      if (requestSequence !== sequence) return;
      console.error(error);
      set({ error: '콘텐츠를 추가로 불러오지 못했습니다.' });
    } finally {
      if (requestSequence === sequence) set({ loading: false });
    }
  },

  hasNext: () => get().cursorState.hasNext,

  saveScrollPosition: (position) => {
    set({ scrollPosition: Math.max(0, position), shouldRestoreScroll: true });
  },

  markScrollRestored: () => {
    set({ shouldRestoreScroll: false });
  },

  prepareFreshBrowse: () => {
    set({
      data: [],
      params: { limit: 20, sortBy: 'rating' },
      cursorState: initialCursorState,
      scrollPosition: 0,
      shouldRestoreScroll: false,
      error: undefined,
    });
  },

  update: (id, data) => {
    set((state) => ({
      data: state.data.map((content) => content.id === id ? { ...content, ...data } : content),
    }));
  },

  delete: (id) => {
    set((state) => ({
      data: state.data.filter((content) => content.id !== id),
      cursorState: {
        ...state.cursorState,
        totalCount: Math.max(0, state.cursorState.totalCount - 1),
      },
    }));
  },
}));

export default useContentStore;
