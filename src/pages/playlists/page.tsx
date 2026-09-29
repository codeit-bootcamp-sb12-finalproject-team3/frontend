import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import usePlaylistStore from '@/lib/stores/usePlaylistStore';
import useAiPlaylistStore from '@/lib/stores/useAiPlaylistStore';
import { getPlaylists } from '@/lib/api/playlists';
import type { PlaylistSummary } from '@/lib/types';
import PlaylistSortDropdown, { type PlaylistTab, type SortOption } from './components/PlaylistSortDropdown';
import PlaylistGrid from './components/PlaylistGrid';
import CreatePlaylistDialog from './components/CreatePlaylistDialog';
import { Button } from '@/components/ui/button';
import SearchBar from '@/pages/contents/components/SearchBar';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TABS: { value: PlaylistTab; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'ai', label: 'AI 추천' },
  { value: 'popular', label: '주간 인기' },
];

export default function PlaylistsPage() {
  const { data, loading, error, fetchMore, hasNext, updateParams } = usePlaylistStore();
  const aiList = useAiPlaylistStore();
  const [activeTab, setActiveTab] = useState<PlaylistTab>('all');
  const [sortValue, setSortValue] = useState('latest');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [popularPlaylists, setPopularPlaylists] = useState<PlaylistSummary[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [popularError, setPopularError] = useState<string>();
  const [popularKeyword, setPopularKeyword] = useState('');
  const navigate = useNavigate();
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

  useEffect(() => {
    if (activeTab === 'ai') {
      void aiList.fetch();
    }
  }, [activeTab, aiList.fetch]);

  // Select the top 20 first. Reversing the display must never request the bottom 20.
  useEffect(() => {
    if (activeTab !== 'popular') return;
    let cancelled = false;
    setPopularLoading(true);
    setPopularError(undefined);
    void getPlaylists({ limit: 20, sortBy: 'weeklyPopularityScore', sortDirection: 'DESCENDING' })
      .then((result) => {
        if (!cancelled) setPopularPlaylists(result.data);
      })
      .catch(() => {
        if (!cancelled) setPopularError('주간 인기 플레이리스트를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setPopularLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  useEffect(() => {
    if (!inView) return;
    if (activeTab === 'all' && hasNext() && !loading) void fetchMore();
    if (activeTab === 'ai' && aiList.hasNext() && !aiList.loading) void aiList.fetchMore();
  }, [activeTab, inView, hasNext, loading, fetchMore, aiList.hasNext, aiList.loading, aiList.fetchMore]);

  const handleTabChange = useCallback((tab: PlaylistTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSortValue(tab === 'popular' ? 'popular' : 'latest');
    setPopularKeyword('');
    if (tab === 'ai') {
      aiList.clearData();
    }
    // Reset the current list criteria when returning to the connected All tab.
    if (tab === 'all') {
      updateParams({
        keywordLike: undefined,
        ownerIdEqual: undefined,
        sortBy: 'createdAt',
        sortDirection: 'DESCENDING',
      });
    }
  }, [activeTab, updateParams, aiList.clearData]);

  const handleSortChange = useCallback((option: SortOption) => {
    setSortValue(
      option.sortBy === 'createdAt'
        ? option.sortDirection === 'ASCENDING' ? 'oldest' : 'latest'
        : option.sortDirection === 'ASCENDING' ? 'popular-asc' : 'popular'
    );
    if (activeTab === 'all') {
      updateParams({ sortBy: option.sortBy, sortDirection: option.sortDirection });
    } else if (activeTab === 'ai') {
      aiList.updateParams({ sortBy: option.sortBy, sortDirection: option.sortDirection });
    }
  }, [activeTab, updateParams, aiList.updateParams]);

  const handleSearch = useCallback((keyword: string) => {
    if (activeTab === 'all') updateParams({ keywordLike: keyword.trim() || undefined });
    if (activeTab === 'ai') aiList.updateParams({ keywordLike: keyword.trim() || undefined });
    if (activeTab === 'popular') setPopularKeyword(keyword.trim().toLocaleLowerCase());
  }, [activeTab, updateParams, aiList.updateParams]);

  const filteredPopularPlaylists = popularPlaylists.filter((playlist) => {
    if (!popularKeyword) return true;
    return [playlist.title, playlist.description, ...playlist.previewContents.map((content) => content.title)]
      .some((value) => value?.toLocaleLowerCase().includes(popularKeyword));
  });

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
          <SearchBar key={activeTab} onSearch={handleSearch} placeholder={activeTab === 'popular' ? '인기 상위 20개 검색' : '플레이리스트 또는 콘텐츠 검색'} />

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="h-11 rounded-lg bg-pink-600 px-4 text-body3-b text-white hover:bg-pink-700"
            >
              + 플레이리스트 만들기
            </Button>
            <PlaylistSortDropdown tab={activeTab} value={sortValue} onValueChange={handleSortChange}  />
          </div>
        </div>

        {activeTab === 'all' ? (
          <>
            <PlaylistGrid playlists={data} loading={loading} error={error} />
            {!loading && hasNext() && <div ref={sentinelRef} className="h-10" />}
          </>
        ) : activeTab === 'ai' ? (
          <>
            <PlaylistGrid playlists={aiList.data} loading={aiList.loading} error={aiList.error} />
            {!aiList.loading && aiList.hasNext() && <div ref={sentinelRef} className="h-10" />}
          </>
        ) : (
          <PlaylistGrid
            playlists={sortValue === 'popular-asc' ? [...filteredPopularPlaylists].reverse() : filteredPopularPlaylists}
            loading={popularLoading}
            error={popularError}
          />
        )}
      </div>

      <CreatePlaylistDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
