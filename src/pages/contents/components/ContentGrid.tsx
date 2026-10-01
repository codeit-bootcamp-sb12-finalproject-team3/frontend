import type { ContentSummaryResponse } from '@/lib/types';
import ContentCard from './ContentCard';

interface ContentGridProps {
  contents: ContentSummaryResponse[];
  loading?: boolean;
  error?: string;
}

export default function ContentGrid({ contents, loading, error }: ContentGridProps) {
  if (loading && contents.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 30 }).map((_, index) => (
          <ContentCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error && contents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-body2-m text-red-notification">{error}</p>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-body2-m text-gray-400">콘텐츠가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {contents.map((content) => (
        <ContentCard key={content.id} content={content} />
      ))}
    </div>
  );
}

function ContentCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[22px] border border-white/[0.07] bg-gray-950/80">
      {/* Thumbnail Skeleton */}
      <div className="aspect-[2/3] w-full bg-gray-800" />

      {/* Info Skeleton */}
      <div className="flex min-h-[158px] flex-col gap-3 p-4">
        <div className="h-5 bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-800 rounded w-full" />
        <div className="h-4 bg-gray-800 rounded w-5/6" />
      </div>

      {/* Rating Skeleton */}
      <div className="flex items-center gap-0.5 pb-1">
        <div className="w-4 h-4 bg-gray-800 rounded" />
        <div className="h-3 bg-gray-800 rounded w-16" />
      </div>

      {/* Tags Skeleton */}
      <div className="flex gap-1.5">
        <div className="h-[26px] bg-gray-800 rounded-full w-16" />
        <div className="h-[26px] bg-gray-800 rounded-full w-12" />
      </div>
    </div>
  );
}
