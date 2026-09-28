import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import usePlaylistStore from '@/lib/stores/usePlaylistStore';
import PlaylistSortDropdown, { type PlaylistTab, type SortOption } from './components/PlaylistSortDropdown';
import PlaylistGrid from './components/PlaylistGrid';
import CreatePlaylistDialog from './components/CreatePlaylistDialog';
import { Button } from '@/components/ui/button';
import SearchBar from '@/pages/contents/components/SearchBar';

const TABS: { value: PlaylistTab; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'ai', label: 'AI 추천' },
  { value: 'popular', label: '주간 인기' },
];

export default function PlaylistsPage() {
  const { data, loading, error, fetch, fetchMore, hasNext, updateParams } = usePlaylistStore();
  const [activeTab, setActiveTab] = useState<PlaylistTab>('all');
  const [sortValue, setSortValue] = useState('latest');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    if (activeTab === 'all' && inView && hasNext() && !loading) {
      void fetchMore();
    }
  }, [activeTab, inView, hasNext, loading, fetchMore]);

  const handleTabChange = useCallback((tab: PlaylistTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSortValue(tab === 'popular' ? 'popular' : 'latest');
    // AI/weekly top-20 filtering is implemented in separate steps.
    // Reset the current list criteria when returning to the connected All tab.
    if (tab === 'all') {
      updateParams({
        keywordLike: undefined,
        ownerIdEqual: undefined,
        sortBy: 'createdAt',
        sortDirection: 'DESCENDING',
      });
    }
  }, [activeTab, updateParams]);

  const handleSortChange = useCallback((option: SortOption) => {
    setSortValue(
      option.sortBy === 'createdAt'
        ? option.sortDirection === 'ASCENDING' ? 'oldest' : 'latest'
        : option.sortDirection === 'ASCENDING' ? 'popular-asc' : 'popular'
    );
    if (activeTab === 'all') {
      updateParams({ sortBy: option.sortBy, sortDirection: option.sortDirection });
    }
  }, [activeTab, updateParams]);

  const handleSearch = useCallback((keyword: string) => {
    updateParams({ keywordLike: keyword.trim() || undefined });
  }, [updateParams]);

  return (
    <div className="flex flex-col gap-10 px-[70px] py-10">
      <h1 className="text-header1-b text-white">플레이리스트</h1>

      <div role="tablist" aria-label="플레이리스트 분류" className="flex items-center gap-8 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`playlist-tab-${tab.value}`}
            aria-selected={activeTab === tab.value}
            aria-controls="playlist-tab-panel"
            onClick={() => handleTabChange(tab.value)}
            className={`border-b-2 pb-4 text-body2-m transition-colors ${
              activeTab === tab.value
                ? 'border-pink-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="playlist-tab-panel" aria-labelledby={`playlist-tab-${activeTab}`} className="flex flex-col gap-10">
        <div className="flex items-center justify-between gap-4">
          {activeTab === 'all' ? (
              <SearchBar key={activeTab} onSearch={handleSearch} placeholder="플레이리스트 또는 콘텐츠 검색" />
          ) : (
            <div className="w-[331px]" />
          )}

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="h-11 rounded-lg bg-pink-600 px-4 text-body3-b text-white hover:bg-pink-700"
            >
              + 플레이리스트 만들기
            </Button>
            <PlaylistSortDropdown tab={activeTab} value={sortValue} onValueChange={handleSortChange} disabled={activeTab !== 'all'} />
          </div>
        </div>

        {activeTab === 'all' ? (
          <>
            <PlaylistGrid playlists={data} loading={loading} error={error} />
            {!loading && hasNext() && <div ref={sentinelRef} className="h-10" />}
          </>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/30 text-center">
            <p className="text-body1-m text-white">{activeTab === 'ai' ? 'AI 추천 플레이리스트' : '주간 인기 플레이리스트'}</p>
            <p className="text-body3-m text-gray-400">목록 조회 연결은 다음 단계에서 진행합니다.</p>
          </div>
        )}
      </div>

      <CreatePlaylistDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
