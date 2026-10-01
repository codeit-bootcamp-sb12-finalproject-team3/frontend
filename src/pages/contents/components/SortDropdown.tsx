import type { ContentSort } from '@/lib/types';

export type SortOption = {
  label: string;
  sortBy: ContentSort;
};

interface SortDropdownProps {
  value: string;
  onValueChange: (option: SortOption) => void;
}

const SORT_OPTIONS: (SortOption & { value: string })[] = [
  { value: 'latest', label: '최신순', sortBy: 'latest' },
  { value: 'rating', label: '평점순', sortBy: 'rating' },
];

export default function SortDropdown({ value, onValueChange }: SortDropdownProps) {
  return (
    <div className="flex h-11 items-center rounded-full border border-gray-700 bg-gray-800/70 p-1" role="group" aria-label="콘텐츠 정렬">
      {SORT_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(option)}
            className={`h-9 rounded-full px-4 text-body3-sb transition-colors ${selected ? 'bg-gray-100 text-gray-950 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
