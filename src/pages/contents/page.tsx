import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import useContentStore from '@/lib/stores/useContentStore';
import type { ContentTypeFilter } from '@/lib/types';
import FilterTabs from './components/FilterTabs';
import SearchBar from './components/SearchBar';
import SortDropdown, { type SortOption } from './components/SortDropdown';
import ContentGrid from './components/ContentGrid';

export default function ContentsPage() {
  const { data, params, cursorState, loading, error, scrollPosition, shouldRestoreScroll, fetch, fetchMore, hasNext, updateParams, markScrollRestored } = useContentStore();
  const [selectedType, setSelectedType] = useState<ContentTypeFilter | 'ALL'>(() => useContentStore.getState().params.typeEqual ?? 'ALL');
  const [sortValue, setSortValue] = useState(() => useContentStore.getState().params.sortBy ?? 'latest');
  const initialLoadStarted = useRef(false);

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    if (!shouldRestoreScroll || data.length === 0) void fetch();
  }, [data.length, fetch, shouldRestoreScroll]);

  useLayoutEffect(() => {
    if (!shouldRestoreScroll || data.length === 0 || loading) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPosition, behavior: 'auto' });
        markScrollRestored();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [data.length, loading, markScrollRestored, scrollPosition, shouldRestoreScroll]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasNext() && !loading) {
      void fetchMore();
    }
  }, [inView, hasNext, loading, fetchMore]);

  // Handle filter change
  const handleTypeChange = useCallback(
    (type: ContentTypeFilter | 'ALL') => {
      setSelectedType(type);
      updateParams({
        typeEqual: type === 'ALL' ? undefined : type,
        genreIdEqual: undefined,
        sportTypeEqual: undefined,
      });
    },
    [updateParams]
  );

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      const keywordLike = query.trim().slice(0, 100);
      updateParams({ keywordLike: keywordLike || undefined });
    },
    [updateParams]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (option: SortOption) => {
      setSortValue(option.sortBy);
      updateParams({ sortBy: option.sortBy });
    },
    [updateParams]
  );

  return (
    <div className="flex flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10 xl:px-[54px] xl:py-10">
      {/* Page Title */}
      <div>
        <p className="text-caption1-sb uppercase tracking-[0.12em] text-pink-300">CONTENTS</p>
        <h1 className="mt-1 text-header1-b text-white">콘텐츠 둘러보기</h1>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs selectedType={selectedType} onTypeChange={handleTypeChange} />

        <div className="flex items-center gap-2.5">
          <SearchBar onSearch={handleSearch} initialValue={useContentStore.getState().params.keywordLike ?? ''} autocomplete="content" />
          <SortDropdown value={sortValue} onValueChange={handleSortChange} />
        </div>
      </div>

      {params.keywordLike && !error && (
        <p className="-mt-4 text-body3-m text-gray-400" aria-live="polite">
          <strong className="text-gray-100">‘{params.keywordLike}’</strong> 검색 결과 {cursorState.totalCount.toLocaleString()}개
        </p>
      )}

      {/* Content Grid */}
      <ContentGrid contents={data} loading={loading} error={error} />
      {error && data.length > 0 && (
        <p className="text-center text-body3-m text-red-notification">{error}</p>
      )}

      {/* Infinite Scroll Sentinel */}
      {!loading && hasNext() && (
        <div ref={sentinelRef} className="h-10 flex items-center justify-center">

        </div>
      )}
      {loading && data.length > 0 && (
        <div className="flex h-12 items-center justify-center" role="status" aria-label="콘텐츠 추가 조회 중">
          <div className="size-8 animate-spin rounded-full border-4 border-gray-700 border-t-pink-500" />
          <span className="sr-only">콘텐츠를 더 불러오는 중입니다.</span>
        </div>
      )}
    </div>
  );
}
