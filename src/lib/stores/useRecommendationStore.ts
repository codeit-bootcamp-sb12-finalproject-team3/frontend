import { create } from 'zustand';
import {
  getNewContents,
  getRecommendedContents,
  getRecommendedPlaylists,
  getTrendingContents,
} from '@/lib/api/recommendations';
import type { ContentSummaryResponse, PlaylistSummary } from '@/lib/types';

export type RecommendationSectionKey =
  | 'contents'
  | 'playlists'
  | 'trending'
  | 'newContents';

interface SectionState<T> {
  data: T[];
  loading: boolean;
  error?: string;
}

interface RecommendationStore {
  contents: SectionState<ContentSummaryResponse>;
  playlists: SectionState<PlaylistSummary>;
  trending: SectionState<ContentSummaryResponse>;
  newContents: SectionState<ContentSummaryResponse>;
  initialized: boolean;
  fetchAll: () => Promise<void>;
  retry: (section: RecommendationSectionKey) => Promise<void>;
}

const initialSection = <T>(): SectionState<T> => ({
  data: [],
  loading: false,
});

const errorMessage = '목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

const useRecommendationStore = create<RecommendationStore>((set, get) => ({
  contents: initialSection<ContentSummaryResponse>(),
  playlists: initialSection<PlaylistSummary>(),
  trending: initialSection<ContentSummaryResponse>(),
  newContents: initialSection<ContentSummaryResponse>(),
  initialized: false,

  fetchAll: async () => {
    if (get().initialized) return;

    set({
      initialized: true,
      contents: { data: [], loading: true },
      playlists: { data: [], loading: true },
      trending: { data: [], loading: true },
      newContents: { data: [], loading: true },
    });

    const [contents, playlists, trending, newContents] = await Promise.allSettled([
      getRecommendedContents(),
      getRecommendedPlaylists(),
      getTrendingContents(),
      getNewContents(),
    ]);

    set({
      contents: contents.status === 'fulfilled'
        ? { data: contents.value.data, loading: false }
        : { data: [], loading: false, error: errorMessage },
      playlists: playlists.status === 'fulfilled'
        ? { data: playlists.value.data, loading: false }
        : { data: [], loading: false, error: errorMessage },
      trending: trending.status === 'fulfilled'
        ? { data: trending.value.data, loading: false }
        : { data: [], loading: false, error: errorMessage },
      newContents: newContents.status === 'fulfilled'
        ? { data: newContents.value.data, loading: false }
        : { data: [], loading: false, error: errorMessage },
    });
  },

  retry: async (section) => {
    if (section === 'contents') {
      set((state) => ({ contents: { ...state.contents, loading: true, error: undefined } }));
      try {
        const response = await getRecommendedContents();
        set({ contents: { data: response.data, loading: false } });
      } catch {
        set({ contents: { data: [], loading: false, error: errorMessage } });
      }
      return;
    }

    if (section === 'playlists') {
      set((state) => ({ playlists: { ...state.playlists, loading: true, error: undefined } }));
      try {
        const response = await getRecommendedPlaylists();
        set({ playlists: { data: response.data, loading: false } });
      } catch {
        set({ playlists: { data: [], loading: false, error: errorMessage } });
      }
      return;
    }

    if (section === 'trending') {
      set((state) => ({ trending: { ...state.trending, loading: true, error: undefined } }));
      try {
        const response = await getTrendingContents();
        set({ trending: { data: response.data, loading: false } });
      } catch {
        set({ trending: { data: [], loading: false, error: errorMessage } });
      }
      return;
    }

    set((state) => ({ newContents: { ...state.newContents, loading: true, error: undefined } }));
    try {
      const response = await getNewContents();
      set({ newContents: { data: response.data, loading: false } });
    } catch {
      set({ newContents: { data: [], loading: false, error: errorMessage } });
    }
  },
}));

export default useRecommendationStore;
