import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import useContentStore from '@/lib/stores/useContentStore';
import type { ContentTypeFilter } from '@/lib/types';
import FilterTabs from './components/FilterTabs';
import SearchBar from './components/SearchBar';
import SortDropdown, { type SortOption } from './components/SortDropdown';
import ContentGrid from './components/ContentGrid';

export default function ContentsPage() {
  const { data, loading, error, fetch, fetchMore, hasNext, updateParams } = useContentStore();
  const [selectedType, setSelectedType] = useState<ContentTypeFilter | 'ALL'>('ALL');
  const [sortValue, setSortValue] = useState('latest');

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    void fetch();
  }, [fetch]);

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
    <div className="flex flex-col gap-10 px-[70px] py-10">
      {/* Page Title */}
      <h1 className="text-header1-b text-white">콘텐츠 같이 보기</h1>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between">
        <FilterTabs selectedType={selectedType} onTypeChange={handleTypeChange} />

        <div className="flex items-center gap-2.5">
          <SearchBar onSearch={handleSearch} />
          <SortDropdown value={sortValue} onValueChange={handleSortChange} />
        </div>
      </div>

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
          <div className="w-8 h-8 border-4 border-gray-700 border-t-pink-500 rounded-full animate-spin" />
      )}
    </div>
  );
}
