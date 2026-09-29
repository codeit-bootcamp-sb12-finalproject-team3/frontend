import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlaylistSortBy, SortDirection } from '@/lib/types';

export type PlaylistTab = 'all' | 'ai' | 'popular';

export type SortOption = {
  label: string;
  sortBy: PlaylistSortBy;
  sortDirection: SortDirection;
};

interface PlaylistSortDropdownProps {
  tab: PlaylistTab;
  value: string;
  onValueChange: (option: SortOption) => void;
  disabled?: boolean;
}

const SORT_OPTIONS: (SortOption & { value: string })[] = [
  { value: 'latest', label: '최신순', sortBy: 'createdAt', sortDirection: 'DESCENDING' },
  { value: 'oldest', label: '오래된순', sortBy: 'createdAt', sortDirection: 'ASCENDING' },
  { value: 'popular', label: '주간 인기순', sortBy: 'weeklyPopularityScore', sortDirection: 'DESCENDING' },
  { value: 'popular-asc', label: '주간 인기 낮은순', sortBy: 'weeklyPopularityScore', sortDirection: 'ASCENDING' },
];

export default function PlaylistSortDropdown({
  tab,
  value,
  onValueChange,
  disabled = false,
}: PlaylistSortDropdownProps) {
  const options = SORT_OPTIONS.filter((option) =>
    tab === 'popular' ? option.sortBy === 'weeklyPopularityScore' : option.sortBy === 'createdAt'
  );

  const handleValueChange = (selectedValue: string) => {
    const option = options.find((item) => item.value === selectedValue);
    if (option) onValueChange(option);
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className="w-[140px] h-11 bg-gray-800 border-gray-700 text-body3-m text-gray-300">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-body3-m text-gray-300 focus:bg-gray-700 focus:text-white"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
