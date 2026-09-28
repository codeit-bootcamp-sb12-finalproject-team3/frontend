import { Check } from 'lucide-react';
import type { ContentSummaryResponse } from '@/lib/types';
import icStarFull from '@/assets/ic_star_full.svg';
import { cn } from '@/lib/utils';

interface PreferenceContentCardProps {
  content: ContentSummaryResponse;
  selected: boolean;
  onToggle: () => void;
}

const typeLabels: Record<ContentSummaryResponse['type'], string> = {
  movie: '영화',
  tvSeason: 'TV 시즌',
  sport: '스포츠',
};

export default function PreferenceContentCard({
  content,
  selected,
  onToggle,
}: PreferenceContentCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${content.title}${selected ? ' 선택 해제' : ' 선택'}`}
      onClick={onToggle}
      className="group min-w-0 text-left"
    >
      <div
        className={cn(
          'relative aspect-[260/390] overflow-hidden rounded-2xl bg-gray-900 ring-2 transition duration-200',
          selected
            ? 'scale-[0.98] ring-pink-500'
            : 'ring-transparent group-hover:-translate-y-1 group-hover:ring-gray-700',
        )}
      >
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-body3-m text-gray-600">
            이미지 준비 중
          </div>
        )}
        <div
          className={cn(
            'absolute inset-0 transition-colors',
            selected ? 'bg-pink-950/35' : 'bg-black/10 group-hover:bg-black/20',
          )}
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-caption1-sb text-gray-200 backdrop-blur">
          {typeLabels[content.type]}
        </span>
        <span
          className={cn(
            'absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border transition',
            selected
              ? 'border-pink-500 bg-pink-500 text-white'
              : 'border-white/40 bg-black/35 text-transparent backdrop-blur',
          )}
        >
          <Check className="size-5" strokeWidth={3} aria-hidden="true" />
        </span>
      </div>

      <h2 className="mt-3 truncate text-body2-b text-gray-50">{content.title}</h2>
      <div className="mt-1.5 flex items-center gap-1 text-body3-m text-gray-500">
        <img src={icStarFull} alt="" className="size-4" />
        <span>{content.averageRating.toFixed(1)}</span>
        <span>({content.reviewCount.toLocaleString()})</span>
      </div>
    </button>
  );
}
