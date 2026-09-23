import type { WatchPartyStatus } from '@/lib/types';

const FILTERS: { value: WatchPartyStatus; label: string }[] = [
  { value: 'LIVE', label: '진행 중' },
  { value: 'SCHEDULED', label: '예정' },
  { value: 'ENDED', label: '종료' },
];

interface WatchPartyFiltersProps {
  value: WatchPartyStatus;
  onChange: (status: WatchPartyStatus) => void;
}

export default function WatchPartyFilters({ value, onChange }: WatchPartyFiltersProps) {
  return (
    <div className="flex rounded-full bg-gray-900 p-1">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`rounded-full px-5 py-2 text-body3-sb transition-colors ${
            value === filter.value
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
