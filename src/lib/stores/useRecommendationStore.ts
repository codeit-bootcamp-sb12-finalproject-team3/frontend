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
  initializedUserId: string | null;
  fetchAll: (userId: string) => Promise<void>;
  pollPersonalized: (userId: string) => Promise<PersonalizedRecommendationReadiness>;
  retry: (section: RecommendationSectionKey) => Promise<void>;
}

interface PersonalizedRecommendationReadiness {
  contentsReady: boolean;
  playlistsReady: boolean;
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
  initializedUserId: null,

  fetchAll: async (userId) => {
    if (get().initializedUserId === userId) return;

    set({
      initializedUserId: userId,
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

    // 계정 전환 중 이전 사용자의 요청이 늦게 끝난 경우 결과를 반영하지 않는다.
    if (get().initializedUserId !== userId) return;

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

  pollPersonalized: async (userId) => {
    const currentState = get();
    if (currentState.initializedUserId !== userId) {
      return { contentsReady: false, playlistsReady: false };
    }

    const shouldFetchContents = currentState.contents.data.length === 0;
    const shouldFetchPlaylists = currentState.playlists.data.length === 0;

    const [contentsResult, playlistsResult] = await Promise.allSettled([
      shouldFetchContents ? getRecommendedContents() : undefined,
      shouldFetchPlaylists ? getRecommendedPlaylists() : undefined,
    ]);

    if (get().initializedUserId !== userId) {
      return { contentsReady: false, playlistsReady: false };
    }

    set((state) => ({
      contents: shouldFetchContents && contentsResult.status === 'fulfilled'
        ? { data: contentsResult.value?.data ?? [], loading: false }
        : state.contents,
      playlists: shouldFetchPlaylists && playlistsResult.status === 'fulfilled'
        ? { data: playlistsResult.value?.data ?? [], loading: false }
        : state.playlists,
    }));

    const updatedState = get();
    return {
      contentsReady: updatedState.contents.data.length > 0,
      playlistsReady: updatedState.playlists.data.length > 0,
    };
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
