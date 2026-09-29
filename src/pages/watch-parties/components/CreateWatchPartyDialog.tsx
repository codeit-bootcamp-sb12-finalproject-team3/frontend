import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { createWatchParty } from '@/lib/api/watch-parties';
import { getContents } from '@/lib/api/contents';
import type {
  ContentSummaryResponse,
  CursorResponseContentSummary,
  WatchPartyResponse,
} from '@/lib/types';

interface CreateWatchPartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (party: WatchPartyResponse) => void;
}

interface ContentPages {
  movie: CursorResponseContentSummary | null;
  tvSeries: CursorResponseContentSummary | null;
}

const PAGE_SIZE = 20;
const inputClassName = 'h-11 rounded-xl border border-gray-700 bg-gray-900/60 px-4 text-body2-m text-white outline-none focus:border-pink-600';

const mergeContents = (...groups: ContentSummaryResponse[][]) =>
  Array.from(
    new Map(
      groups
        .flat()
        .filter((content) => content.type === 'movie' || content.type === 'tvSeason')
        .map((content) => [content.id, content]),
    ).values(),
  );

const toLocalDateTimeMin = () => {
  const date = new Date(Date.now() + 60_000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function CreateWatchPartyDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateWatchPartyDialogProps) {
  const requestSequence = useRef(0);
  const [contents, setContents] = useState<ContentSummaryResponse[]>([]);
  const [pages, setPages] = useState<ContentPages>({ movie: null, tvSeries: null });
  const [selectedContent, setSelectedContent] = useState<ContentSummaryResponse | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('');
  const [startEpisode, setStartEpisode] = useState('');
  const [endEpisode, setEndEpisode] = useState('');
  const [loadingContents, setLoadingContents] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchKeyword(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open) return;
    const sequence = ++requestSequence.current;
    setLoadingContents(true);
    Promise.all([
      getContents({ typeEqual: 'movie', keywordLike: searchKeyword || undefined, limit: PAGE_SIZE, sortBy: 'latest' }),
      getContents({ typeEqual: 'tvSeries', keywordLike: searchKeyword || undefined, limit: PAGE_SIZE, sortBy: 'latest' }),
    ])
      .then(([movie, tvSeries]) => {
        if (requestSequence.current !== sequence) return;
        setContents(mergeContents(movie.data, tvSeries.data));
        setPages({ movie, tvSeries });
      })
      .catch((error) => {
        if (requestSequence.current !== sequence) return;
        console.error(error);
        setContents([]);
        setPages({ movie: null, tvSeries: null });
        toast.error('콘텐츠 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (requestSequence.current === sequence) setLoadingContents(false);
      });
  }, [open, searchKeyword]);

  const isSeason = selectedContent?.type === 'tvSeason';
  const hasNext = Boolean(pages.movie?.hasNext || pages.tvSeries?.hasNext);
  const validationMessage = useMemo(() => {
    if (!selectedContent) return '같이 볼 콘텐츠를 선택해주세요.';
    if (!title.trim()) return '파티 제목을 입력해주세요.';
    if (title.trim().length > 100) return '파티 제목은 100자 이하로 입력해주세요.';
    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) return '미래의 시작 날짜와 시간을 입력해주세요.';
    if (!Number.isInteger(Number(maxParticipants)) || Number(maxParticipants) <= 0) return '최대 참여 인원을 1명 이상 입력해주세요.';
    if (!Number.isInteger(Number(sessionDurationMinutes)) || Number(sessionDurationMinutes) <= 0) return '세션 예정 시간을 1분 이상 입력해주세요.';
    if (isSeason) {
      if (startEpisode === '' || endEpisode === '') return '시작 및 종료 에피소드를 입력해주세요.';
      const start = Number(startEpisode);
      const end = Number(endEpisode);
      if (!Number.isInteger(start) || start < 0 || !Number.isInteger(end) || end < start) {
        return '에피소드 범위를 올바르게 입력해주세요.';
      }
    }
    return null;
  }, [selectedContent, title, scheduledAt, maxParticipants, sessionDurationMinutes, isSeason, startEpisode, endEpisode]);

  const reset = () => {
    requestSequence.current += 1;
    setContents([]);
    setPages({ movie: null, tvSeries: null });
    setSelectedContent(null);
    setSearchInput('');
    setSearchKeyword('');
    setTitle('');
    setDescription('');
    setScheduledAt('');
    setMaxParticipants('');
    setSessionDurationMinutes('');
    setStartEpisode('');
    setEndEpisode('');
    setLoadingContents(false);
    setLoadingMore(false);
    setCreating(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && creating) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleLoadMore = async () => {
    if (!hasNext || loadingMore) return;
    const sequence = requestSequence.current;
    setLoadingMore(true);
    try {
      const requests = (['movie', 'tvSeries'] as const).flatMap((typeEqual) => {
        const page = pages[typeEqual];
        if (!page?.hasNext || !page.nextCursor || !page.nextIdAfter) return [];
        return [getContents({
          typeEqual,
          keywordLike: searchKeyword || undefined,
          cursor: page.nextCursor,
          idAfter: page.nextIdAfter,
          limit: PAGE_SIZE,
          sortBy: 'latest',
        }).then((response) => ({ typeEqual, response }))];
      });
      const responses = await Promise.all(requests);
      if (requestSequence.current !== sequence) return;
      setContents((current) => mergeContents(current, ...responses.map(({ response }) => response.data)));
      setPages((current) => {
        const next = { ...current };
        responses.forEach(({ typeEqual, response }) => { next[typeEqual] = response; });
        return next;
      });
    } catch (error) {
      console.error(error);
      toast.error('콘텐츠를 추가로 불러오지 못했습니다.');
    } finally {
      if (requestSequence.current === sequence) setLoadingMore(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (validationMessage || !selectedContent) return;

    setCreating(true);
    try {
      const party = await createWatchParty({
        contentId: selectedContent.id,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        scheduledAt: new Date(scheduledAt).toISOString(),
        maxParticipants: Number(maxParticipants),
        sessionDurationMinutes: Number(sessionDurationMinutes),
        ...(isSeason ? { startEpisode: Number(startEpisode), endEpisode: Number(endEpisode) } : {}),
      });
      toast.success('Watch Party를 만들었습니다.');
      onCreated(party);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Watch Party 생성에 실패했습니다. 입력 내용을 확인해주세요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideCloseButton className="max-h-[92vh] max-w-[820px] overflow-hidden rounded-3xl border-gray-700 bg-gray-800/95 p-0 backdrop-blur-[25px]">
        <form onSubmit={handleSubmit} className="flex max-h-[92vh] flex-col">
          <div className="flex items-start justify-between border-b border-gray-700 px-8 py-6">
            <div className="space-y-2">
              <DialogTitle className="text-title1-b">Watch Party 만들기</DialogTitle>
              <DialogDescription>같이 볼 영화 또는 TV 시즌과 파티 정보를 입력해주세요.</DialogDescription>
            </div>
            <button type="button" onClick={() => handleOpenChange(false)} disabled={creating} className="rounded-full p-1 text-gray-300 hover:bg-gray-700" aria-label="닫기">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto px-8 py-6">
            <section className="space-y-3">
              <h3 className="text-body2-b text-white">콘텐츠 선택</h3>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="영화 또는 TV 시즌 검색" className={`${inputClassName} w-full pl-11`} />
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900/40 p-2">
                {loadingContents ? (
                  <p className="py-8 text-center text-body3-m text-gray-400">콘텐츠를 불러오는 중입니다.</p>
                ) : contents.length === 0 ? (
                  <p className="py-8 text-center text-body3-m text-gray-400">선택할 수 있는 콘텐츠가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {contents.map((content) => (
                      <button key={content.id} type="button" onClick={() => setSelectedContent(content)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selectedContent?.id === content.id ? 'border-pink-500 bg-pink-500/10' : 'border-transparent bg-gray-800 hover:border-gray-600'}`}>
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-gray-700">
                          {content.thumbnailUrl && <img src={content.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-body3-sb text-white">{content.title}</p>
                          <p className="text-caption1-m text-gray-400">{content.type === 'tvSeason' ? `TV 시즌${content.seasonNumber !== null ? ` ${content.seasonNumber}` : ''}` : '영화'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {hasNext && !loadingContents && (
                  <Button type="button" variant="ghost" onClick={handleLoadMore} disabled={loadingMore} className="mt-2 w-full text-gray-300">
                    {loadingMore ? '불러오는 중...' : '콘텐츠 더 보기'}
                  </Button>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-body3-sb text-gray-200">파티 제목
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className={inputClassName} placeholder="파티 제목" />
              </label>
              <label className="flex flex-col gap-2 text-body3-sb text-gray-200">시작 날짜/시간
                <input type="datetime-local" min={toLocalDateTimeMin()} value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className={inputClassName} />
              </label>
              <label className="flex flex-col gap-2 text-body3-sb text-gray-200">최대 참여 인원
                <input type="number" min="1" step="1" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} className={inputClassName} placeholder="예: 10" />
              </label>
              <label className="flex flex-col gap-2 text-body3-sb text-gray-200">세션 예정 시간(분)
                <input type="number" min="1" step="1" value={sessionDurationMinutes} onChange={(event) => setSessionDurationMinutes(event.target.value)} className={inputClassName} placeholder="예: 120" />
              </label>
              {isSeason && (
                <>
                  <label className="flex flex-col gap-2 text-body3-sb text-gray-200">시작 에피소드
                    <input type="number" min="0" step="1" value={startEpisode} onChange={(event) => setStartEpisode(event.target.value)} className={inputClassName} />
                  </label>
                  <label className="flex flex-col gap-2 text-body3-sb text-gray-200">종료 에피소드
                    <input type="number" min="0" step="1" value={endEpisode} onChange={(event) => setEndEpisode(event.target.value)} className={inputClassName} />
                  </label>
                </>
              )}
            </section>
            <label className="flex flex-col gap-2 text-body3-sb text-gray-200">설명 (선택)
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-body2-m text-white outline-none focus:border-pink-600" placeholder="파티를 소개해주세요." />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-gray-700 px-8 py-5">
            <p className="text-caption1-m text-gray-400">{validationMessage ?? '입력한 내용으로 Watch Party를 생성할 수 있습니다.'}</p>
            <Button type="submit" disabled={Boolean(validationMessage) || creating} className="h-11 rounded-xl bg-pink-600 px-6 text-white hover:bg-pink-700">
              {creating ? '생성 중...' : '생성'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
