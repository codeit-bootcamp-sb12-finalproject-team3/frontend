import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { ArrowUp } from 'lucide-react';
import useContentStore from '@/lib/stores/useContentStore';
import useUIStore from '@/lib/stores/useUIStore';
import type { ContentTypeFilter } from '@/lib/types';
import FilterTabs from './components/FilterTabs';
import CategoryFilter from './components/CategoryFilter';
import SearchBar from './components/SearchBar';
import SortDropdown, { type SortOption } from './components/SortDropdown';
import ContentGrid from './components/ContentGrid';

export default function ContentsPage() {
  const { data, params, cursorState, loading, error, scrollPosition, shouldRestoreScroll, fetch, fetchMore, hasNext, updateParams, markScrollRestored } = useContentStore();
  const sideMenuCollapsed = useUIStore((state) => state.sideMenuCollapsed);
  const [selectedType, setSelectedType] = useState<ContentTypeFilter | 'ALL'>(() => useContentStore.getState().params.typeEqual ?? 'ALL');
  const [sortValue, setSortValue] = useState(() => useContentStore.getState().params.sortBy ?? 'rating');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
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

  useEffect(() => {
    const updateScrollTopVisibility = () => setShowScrollTop(window.scrollY > 240);
    updateScrollTopVisibility();
    window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollTopVisibility);
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasNext() && !loading) {
      void fetchMore();
    }
  }, [inView, hasNext, loading, fetchMore]);

  // Handle filter change
  const handleTypeChange = useCallback(
    (type: ContentTypeFilter | 'ALL') => {
      window.scrollTo({ top: 0, behavior: 'auto' });
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
      window.scrollTo({ top: 0, behavior: 'auto' });
      updateParams({
        keywordLike: keywordLike || undefined,
        ...(keywordLike ? { genreIdEqual: undefined, sportTypeEqual: undefined } : {}),
      });
    },
    [updateParams]
  );

  const handleCategoryChange = useCallback((value?: string) => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    updateParams({
      genreIdEqual: selectedType === 'sport' ? undefined : value,
      sportTypeEqual: selectedType === 'sport' ? value : undefined,
      keywordLike: undefined,
    });
    setSearchResetKey((key) => key + 1);
  }, [selectedType, updateParams]);

  const handleSportTypeSuggestion = useCallback((code: string) => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setSelectedType('sport');
    updateParams({ typeEqual: 'sport', sportTypeEqual: code, genreIdEqual: undefined, keywordLike: undefined });
    setSearchResetKey((key) => key + 1);
  }, [updateParams]);

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
      <div className="sticky top-0 z-40 -mx-5 flex flex-col gap-4 border-b border-gray-800 bg-background/95 px-5 py-4 shadow-lg shadow-black/10 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:flex-row lg:items-center lg:justify-between lg:px-10 xl:-mx-[54px] xl:px-[54px]">
        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs selectedType={selectedType} onTypeChange={handleTypeChange} />
          {selectedType !== 'ALL' && (
            <CategoryFilter
              key={selectedType}
              type={selectedType}
              value={selectedType === 'sport' ? params.sportTypeEqual : params.genreIdEqual}
              onChange={handleCategoryChange}
            />
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <SearchBar key={searchResetKey} onSearch={handleSearch} onSportTypeSelect={handleSportTypeSuggestion} initialValue={useContentStore.getState().params.keywordLike ?? ''} autocomplete="content" />
          <SortDropdown value={sortValue} onValueChange={handleSortChange} />
        </div>
      </div>

      {selectedType !== 'ALL' && (params.keywordLike || params.genreIdEqual || params.sportTypeEqual) && (
        <p className="-mt-6 text-caption1-m text-gray-500">
          {params.keywordLike
            ? `${selectedType === 'sport' ? '종목' : '장르'}을 선택하면 검색어가 지워집니다.`
            : `검색어를 입력하면 선택한 ${selectedType === 'sport' ? '종목' : '장르'}가 해제됩니다.`}
        </p>
      )}

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
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="맨 위로 이동"
          style={{ left: sideMenuCollapsed ? 'calc(50% + 40px)' : 'calc(50% + 120px)' }}
          className="fixed bottom-6 z-50 flex size-12 -translate-x-1/2 items-center justify-center rounded-full border border-gray-700 bg-gray-900/95 text-white shadow-lg transition-[left,background-color,border-color] duration-300 hover:border-pink-500 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
