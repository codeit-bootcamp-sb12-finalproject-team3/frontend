import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import usePlaylistStore from '@/lib/stores/usePlaylistStore';
import PlaylistSortDropdown, { type SortOption } from './components/PlaylistSortDropdown';
import PlaylistGrid from './components/PlaylistGrid';
import CreatePlaylistDialog from './components/CreatePlaylistDialog';
import { Button } from '@/components/ui/button';
import SearchBar from '@/pages/contents/components/SearchBar';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { data, loading, error, fetchMore, hasNext, updateParams } = usePlaylistStore();
  const [sortValue, setSortValue] = useState('latest');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const contentIdEqual = searchParams.get('contentIdEqual') || undefined;

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (contentIdEqual) {
      updateParams({ contentIdEqual, sortBy: 'weeklyPopularityScore', sortDirection: 'DESCENDING' });
      setSortValue('popular');
    } else {
      updateParams({ contentIdEqual: undefined });
    }
  }, [contentIdEqual, updateParams]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasNext() && !loading) {
      fetchMore();
    }
  }, [inView, hasNext, loading, fetchMore]);

  // Handle sort change
  const handleSortChange = useCallback(
    (option: SortOption) => {
      setSortValue(
          option.sortBy === 'createdAt'
              ? option.sortDirection === 'ASCENDING' ? 'oldest' : 'latest'
              : option.sortDirection === 'ASCENDING' ? 'popular-asc' : 'popular'
      );
      updateParams({
        sortBy: option.sortBy,
        sortDirection: option.sortDirection,
      });
    },
    [updateParams]
  );

  const handleSearch = useCallback(
      (keyword: string) => {
        updateParams({ keywordLike: keyword.trim() || undefined });
      },
      [updateParams]
  );

  return (
    <div className="flex flex-col gap-10 px-[70px] py-10">
      {/* Page Title */}
      <div>
        {contentIdEqual && (
          <button type="button" onClick={() => navigate(`/contents/${contentIdEqual}`)} className="mb-6 flex items-center gap-2 text-body3-sb text-gray-400 transition hover:text-white">
            <ArrowLeft className="size-4" />상세페이지
          </button>
        )}
        <h1 className="text-header1-b text-white">플레이리스트</h1>
      </div>

      {/* Search and Sort Bar */}
      <div className="flex items-center justify-between gap-4">
        <SearchBar
            onSearch={handleSearch}
            placeholder="플레이리스트 또는 콘텐츠 검색"
            maxLength={100}
            autocomplete="none"
        />

        <div className="flex items-center gap-2.5">
          <Button
              onClick={() => setCreateDialogOpen(true)}
              className="h-11 rounded-lg bg-pink-600 px-4 text-body3-b text-white hover:bg-pink-700"
          >
            + 플레이리스트 만들기
          </Button>
          <PlaylistSortDropdown value={sortValue} onValueChange={handleSortChange} />
        </div>
      </div>

      {/* Playlist Grid */}
      <PlaylistGrid playlists={data} loading={loading} error={error} />

      {/* Infinite Scroll Sentinel */}
      {hasNext() && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
      {loading && data.length > 0 && (
        <div className="flex h-12 items-center justify-center" role="status" aria-label="플레이리스트 추가 조회 중">
          <div className="size-8 animate-spin rounded-full border-4 border-gray-700 border-t-pink-500" />
          <span className="sr-only">플레이리스트를 더 불러오는 중입니다.</span>
        </div>
      )}

      <CreatePlaylistDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
