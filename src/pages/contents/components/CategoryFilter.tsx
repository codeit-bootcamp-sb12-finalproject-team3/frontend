import { useEffect, useState } from 'react';
import { getContentGenres, getContentSportTypes } from '@/lib/api/contents';
import { getSportTypeLabel } from '@/lib/sport-types';
import type { ContentTypeFilter } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryFilterProps {
  type: ContentTypeFilter;
  value?: string;
  onChange: (value?: string) => void;
}

interface CategoryOption {
  value: string;
  label: string;
}

export default function CategoryFilter({ type, value, onChange }: CategoryFilterProps) {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const isSport = type === 'sport';
  const label = isSport ? '종목' : '장르';

  useEffect(() => {
    let cancelled = false;
    setOptions([]);
    setLoading(true);
    setError(false);

    const request = type === 'sport'
      ? getContentSportTypes().then((items) => items.map((item) => ({ value: item.code, label: getSportTypeLabel(item.code, item.name) })))
      : getContentGenres(type).then((items) => items.map((item) => ({ value: item.id, label: item.name })));

    void request.then((items) => {
      if (!cancelled) setOptions(items.sort((a, b) => a.label.localeCompare(b.label, 'ko')));
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [type, retryKey]);

  if (error) {
    return <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="h-[22px] rounded-full border border-red-400/40 px-3 text-body3-b text-red-300 hover:bg-red-400/10">{label} 다시 불러오기</button>;
  }

  return (
    <Select value={value ?? 'all'} onValueChange={(next) => onChange(next === 'all' ? undefined : next)} disabled={loading || options.length === 0}>
      <SelectTrigger aria-label={`${label} 선택`} className="h-[22px] w-[150px] rounded-full border-gray-700 bg-gray-800/70 px-3 py-0 text-body3-b text-gray-100 sm:w-[180px]">
        <SelectValue placeholder={loading ? `${label} 불러오는 중` : `전체 ${label}`} />
      </SelectTrigger>
      <SelectContent position="item-aligned" className="max-h-80 min-w-[180px] border-gray-700 bg-gray-900 text-gray-100">
        <SelectItem value="all" className="focus:bg-gray-800 focus:text-white">전체 {label}</SelectItem>
        {options.map((option) => <SelectItem key={option.value} value={option.value} className="focus:bg-gray-800 focus:text-white">{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
