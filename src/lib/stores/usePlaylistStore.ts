import { create } from 'zustand';
import { getPlaylists } from '@/lib/api/playlists';
import { createPaginatedStoreActions } from '@/lib/stores/actions';
import type { PlaylistSearchParams, PlaylistSummary } from '@/lib/types';
import type { PaginatedStore } from '@/lib/stores/types';

const usePlaylistStore = create<PaginatedStore<PlaylistSummary, PlaylistSearchParams>>((set, get) =>
  createPaginatedStoreActions<PlaylistSummary, PlaylistSearchParams>({
    set,
    get,
    fetchApi: getPlaylists,
    initialData: {
      params: { limit: 20, sortBy: 'createdAt', sortDirection: 'DESCENDING' },
    },
  })
);

export default usePlaylistStore;
