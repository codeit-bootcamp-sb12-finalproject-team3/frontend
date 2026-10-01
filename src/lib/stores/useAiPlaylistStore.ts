import { create } from 'zustand';
import { getAiPlaylists } from '@/lib/api/playlists';
import { createPaginatedStoreActions } from '@/lib/stores/actions';
import type { PlaylistSearchParams, PlaylistSummary } from '@/lib/types';
import type { PaginatedStore } from '@/lib/stores/types';

const useAiPlaylistStore = create<PaginatedStore<PlaylistSummary, PlaylistSearchParams>>((set, get) =>
  createPaginatedStoreActions<PlaylistSummary, PlaylistSearchParams>({
    set,
    get,
    fetchApi: getAiPlaylists,
    initialData: {
      params: {
        limit: 20,
        sortBy: 'createdAt',
        sortDirection: 'DESCENDING',
      },
    },
  })
);

export default useAiPlaylistStore;
