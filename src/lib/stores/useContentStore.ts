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
  updateParams: (
    params: Partial<Omit<ContentSearchParams, 'cursor' | 'idAfter'>>,
  ) => void;
  fetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
  hasNext: () => boolean;
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
  },
  cursorState: initialCursorState,
  loading: false,
  error: undefined,

  updateParams: (params) => {
    set((state) => ({ params: { ...state.params, ...params } }));
    void get().fetch();
  },

  fetch: async () => {
    const sequence = ++requestSequence;
    const params = get().params;
    set({ loading: true, error: undefined, data: [], cursorState: initialCursorState });

    try {
      const response = await getContents(params);
      if (requestSequence !== sequence) return;
      set({
        data: uniqueContents(response.data),
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
