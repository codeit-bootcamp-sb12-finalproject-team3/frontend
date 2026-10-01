import { useCallback, useEffect, useRef, useState } from 'react';
import { getContentAutocomplete } from '@/lib/api/contents';
import type { ContentSearchSuggestion } from '@/lib/types';
import { getSportTypeCode, getSportTypeLabel } from '@/lib/sport-types';
import { X } from 'lucide-react';
import icSearch from '@/assets/ic_search.svg';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  maxLength?: number;
  initialValue?: string;
  autocomplete?: 'content' | 'none';
  onSportTypeSelect?: (code: string) => void;
}

const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  title: '제목',
  cast: '출연진',
  genre: '장르',
  tag: '태그',
  sportType: '종목',
  league: '리그',
  season: '시즌',
  team: '팀',
};

export default function SearchBar({
                                    onSearch,
                                    placeholder = '검색어를 입력하세요',
                                    maxLength = 100,
                                    initialValue = '',
                                    autocomplete = 'none',
                                    onSportTypeSelect,
                                  }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<ContentSearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastSubmittedValue = useRef(initialValue);
  const initialRender = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleSuggestions = suggestions.filter((suggestion, index, items) => {
    if (suggestion.type !== 'sportType') return true;
    const code = getSportTypeCode(suggestion.text);
    return !code || items.findIndex((item) => item.type === 'sportType' && getSportTypeCode(item.text) === code) === index;
  });

  const submit = useCallback((nextValue: string) => {
    if (lastSubmittedValue.current === nextValue) return;
    lastSubmittedValue.current = nextValue;
    onSearch(nextValue);
  }, [onSearch]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (lastSubmittedValue.current === value) return;
      submit(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, submit]);

  useEffect(() => {
    const query = value.trim();
    setActiveIndex(-1);
    if (autocomplete !== 'content' || query.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSuggestionsLoading(true);
      void getContentAutocomplete(query, controller.signal)
        .then((response) => setSuggestions(response.suggestions))
        .catch((error) => {
          if (error instanceof Error && error.name !== 'CanceledError' && error.name !== 'AbortError') {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSuggestionsLoading(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [autocomplete, value]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const selectSuggestion = (suggestion: ContentSearchSuggestion) => {
    const sportCode = suggestion.type === 'sportType' ? getSportTypeCode(suggestion.text) : undefined;
    if (sportCode && onSportTypeSelect) {
      setValue('');
      setFocused(false);
      setSuggestions([]);
      onSportTypeSelect(sportCode);
      return;
    }
    setValue(suggestion.text);
    setFocused(false);
    setSuggestions([]);
    submit(suggestion.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (autocomplete === 'content' && e.key === 'ArrowDown' && visibleSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((current) => (current + 1) % visibleSuggestions.length);
      return;
    }
    if (autocomplete === 'content' && e.key === 'ArrowUp' && visibleSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((current) => current <= 0 ? visibleSuggestions.length - 1 : current - 1);
      return;
    }
    if (e.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      if (activeIndex >= 0 && visibleSuggestions[activeIndex]) {
        e.preventDefault();
        selectSuggestion(visibleSuggestions[activeIndex]);
        return;
      }
      submit(value);
      setFocused(false);
    }
  };

  const showSuggestions = autocomplete === 'content' && focused && value.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-[380px]">
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role={autocomplete === 'content' ? 'combobox' : 'searchbox'}
        aria-label={autocomplete === 'content' ? '콘텐츠 검색' : '검색'}
        aria-autocomplete={autocomplete === 'content' ? 'list' : undefined}
        aria-expanded={autocomplete === 'content' ? showSuggestions : undefined}
        aria-controls={autocomplete === 'content' ? 'content-search-suggestions' : undefined}
        aria-activedescendant={autocomplete === 'content' && activeIndex >= 0 ? `content-search-suggestion-${activeIndex}` : undefined}
        className={`w-full h-[42px] pl-5 ${value ? 'pr-20' : 'pr-12'} py-1 rounded-full bg-gray-800/50 text-body3-m text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-700 transition-all`}
      />
      <button
        type="button"
        onClick={() => {
          submit(value);
          setFocused(false);
        }}
        aria-label="검색"
        className={`absolute ${value ? 'right-10' : 'right-2'} top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500`}
      >
        <img src={icSearch} alt="" className="size-6" />
      </button>
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('');
            setFocused(false);
            setSuggestions([]);
            setActiveIndex(-1);
            submit('');
          }}
          aria-label="검색어 지우기"
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
      {showSuggestions && (
        <div id="content-search-suggestions" role="listbox" className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-2 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
          {suggestionsLoading ? (
            <p className="px-3 py-4 text-center text-body3-m text-gray-500">검색 후보를 불러오는 중입니다.</p>
          ) : visibleSuggestions.length > 0 ? visibleSuggestions.map((suggestion, index) => (
            <button
              id={`content-search-suggestion-${index}`}
              key={`${suggestion.type}-${suggestion.text}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${activeIndex === index ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
            >
              <span className="min-w-0 truncate text-body3-m">{suggestion.type === 'sportType' ? getSportTypeLabel(suggestion.text) : suggestion.text}</span>
              <span className="shrink-0 rounded-full bg-pink-500/10 px-2 py-1 text-caption1-sb text-pink-300">{SUGGESTION_TYPE_LABELS[suggestion.type] || suggestion.type}</span>
            </button>
          )) : (
            <p className="px-3 py-4 text-center text-body3-m text-gray-500">일치하는 검색 후보가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
