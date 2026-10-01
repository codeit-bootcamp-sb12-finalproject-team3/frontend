import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import HorizontalCarousel from './HorizontalCarousel';

interface RecommendationShelfProps {
  title: string;
  description: string;
  ariaLabel: string;
  itemClassName: string;
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyMessage: string;
  skeletonVariant?: 'content' | 'playlist';
  onRetry: () => void;
  children: ReactNode;
}

function ShelfSkeleton({ variant }: { variant: 'content' | 'playlist' }) {
  if (variant === 'playlist') {
    return (
      <div className="flex gap-[30px] overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[250px] w-[min(430px,85vw)] shrink-0 animate-pulse rounded-[24px] border border-gray-800 bg-gray-900"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-[30px] overflow-hidden">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="w-[220px] shrink-0 animate-pulse">
          <div className="aspect-[260/390] rounded-2xl bg-gray-900" />
          <div className="mt-4 h-5 w-3/4 rounded bg-gray-900" />
          <div className="mt-2 h-4 w-full rounded bg-gray-900" />
        </div>
      ))}
    </div>
  );
}

export default function RecommendationShelf({
  title,
  description,
  ariaLabel,
  itemClassName,
  loading,
  error,
  empty,
  emptyMessage,
  skeletonVariant = 'content',
  onRetry,
  children,
}: RecommendationShelfProps) {
  return (
    <section aria-labelledby={`${ariaLabel}-title`}>
      <div className="mb-6">
        <h2 id={`${ariaLabel}-title`} className="text-header1-b text-white">
          {title}
        </h2>
        <p className="mt-2 text-body3-m text-gray-500">{description}</p>
      </div>

      {loading ? (
        <ShelfSkeleton variant={skeletonVariant} />
      ) : error ? (
        <div className="flex h-[250px] flex-col items-center justify-center rounded-[24px] border border-gray-800 bg-gray-950/60 px-6 text-center">
          <p className="text-body2-m text-red-notification">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-body3-sb text-gray-200 transition hover:bg-gray-700"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            다시 불러오기
          </button>
        </div>
      ) : empty ? (
        <div className="flex h-[250px] items-center justify-center rounded-[24px] border border-dashed border-gray-800 bg-gray-950/40 px-6 text-center">
          <p className="text-body2-m text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <HorizontalCarousel itemClassName={itemClassName} ariaLabel={ariaLabel}>
          {children}
        </HorizontalCarousel>
      )}
    </section>
  );
}
