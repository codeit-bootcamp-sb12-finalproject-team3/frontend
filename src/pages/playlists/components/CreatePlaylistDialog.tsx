import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { getContents } from '@/lib/api/contents';
import { createPlaylist, getPlaylistErrorCode } from '@/lib/api/playlists';
import type {
  ContentSummaryResponse,
  ContentTypeFilter,
  CursorResponseContentSummary,
} from '@/lib/types';

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContentPageState {
  movie: CursorResponseContentSummary | null;
  tvSeries: CursorResponseContentSummary | null;
}

const CONTENT_FILTERS: Extract<ContentTypeFilter, 'movie' | 'tvSeries'>[] = [
  'movie',
  'tvSeries',
];
const PAGE_SIZE = 20;

const mergeUniqueContents = (
  ...groups: ContentSummaryResponse[][]
): ContentSummaryResponse[] => {
  const contents = new Map<string, ContentSummaryResponse>();
  groups.flat().forEach((content) => contents.set(content.id, content));
  return Array.from(contents.values());
};

export default function CreatePlaylistDialog({
  open,
  onOpenChange,
}: CreatePlaylistDialogProps) {
  const navigate = useNavigate();
  const requestSequence = useRef(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [contents, setContents] = useState<ContentSummaryResponse[]>([]);
  const [pages, setPages] = useState<ContentPageState>({ movie: null, tvSeries: null });
  const [selectedContents, setSelectedContents] = useState<Map<string, ContentSummaryResponse>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchKeyword(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open) return;

    const sequence = ++requestSequence.current;
    setLoading(true);

    Promise.all(
      CONTENT_FILTERS.map((typeEqual) => getContents({
        typeEqual,
        keywordLike: searchKeyword || undefined,
        limit: PAGE_SIZE,
        sortBy: 'latest',
      })),
    )
      .then(([movie, tvSeries]) => {
        if (requestSequence.current !== sequence) return;
        setContents(mergeUniqueContents(movie.data, tvSeries.data));
        setPages({ movie, tvSeries });
      })
      .catch(() => {
        if (requestSequence.current !== sequence) return;
        setContents([]);
        setPages({ movie: null, tvSeries: null });
        toast.error('콘텐츠 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (requestSequence.current === sequence) setLoading(false);
      });
  }, [open, searchKeyword]);

  const selected = useMemo(() => Array.from(selectedContents.values()), [selectedContents]);
  const hasNext = Boolean(pages.movie?.hasNext || pages.tvSeries?.hasNext);
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const canCreate = trimmedTitle.length > 0
    && trimmedTitle.length <= 100
    && trimmedDescription.length > 0
    && selectedContents.size >= 4
    && !creating;
  const validationMessage = trimmedTitle.length === 0
    ? '제목을 입력해주세요.'
    : trimmedTitle.length > 100
      ? '제목은 100자 이하로 입력해주세요.'
      : trimmedDescription.length === 0
        ? '설명을 입력해주세요.'
        : selectedContents.size < 4
          ? '콘텐츠를 최소 4개 선택해주세요.'
          : null;

  const reset = () => {
    requestSequence.current += 1;
    setTitle('');
    setDescription('');
    setSearchInput('');
    setSearchKeyword('');
    setContents([]);
    setPages({ movie: null, tvSeries: null });
    setSelectedContents(new Map());
    setLoading(false);
    setLoadingMore(false);
    setCreating(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && creating) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const toggleContent = (content: ContentSummaryResponse) => {
    setSelectedContents((current) => {
      const next = new Map(current);
      if (next.has(content.id)) next.delete(content.id);
      else next.set(content.id, content);
      return next;
    });
  };

  const handleLoadMore = async () => {
    if (!hasNext || loadingMore) return;

    const sequence = requestSequence.current;
    setLoadingMore(true);
    try {
      const requests = CONTENT_FILTERS.flatMap((typeEqual) => {
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

      setContents((current) => mergeUniqueContents(
        current,
        ...responses.map(({ response }) => response.data),
      ));
      setPages((current) => {
        const next = { ...current };
        responses.forEach(({ typeEqual, response }) => {
          next[typeEqual] = response;
        });
        return next;
      });
    } catch {
      if (requestSequence.current === sequence) {
        toast.error('콘텐츠를 추가로 불러오지 못했습니다.');
      }
    } finally {
      if (requestSequence.current === sequence) setLoadingMore(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;

    const contentIds = Array.from(selectedContents.keys());
    if (new Set(contentIds).size < 4) return;

    setCreating(true);
    try {
      const playlist = await createPlaylist({
        title: trimmedTitle,
        description: trimmedDescription,
        contentIds,
      });
      toast.success('플레이리스트를 만들었습니다.');
      setCreating(false);
      handleOpenChange(false);
      navigate(`/playlists/${playlist.id}`);
    } catch (error) {
      const code = getPlaylistErrorCode(error);
      const messages: Record<string, string> = {
        VALIDATION_ERROR: '입력 내용을 다시 확인해주세요.',
        INVALID_PLAYLIST_CONTENT_REQUEST: '중복된 콘텐츠를 선택할 수 없습니다.',
        PLAYLIST_MINIMUM_CONTENT_REQUIRED: '서로 다른 콘텐츠를 최소 4개 선택해주세요.',
        CONTENT_TYPE_NOT_SUPPORTED: '영화와 TV 시즌만 선택할 수 있습니다.',
        CONTENT_NOT_FOUND: '선택한 콘텐츠 중 존재하지 않는 항목이 있습니다.',
        USER_NOT_FOUND: '로그인 사용자 정보를 찾을 수 없습니다.',
      };
      toast.error(code ? messages[code] ?? '플레이리스트 생성에 실패했습니다.' : '플레이리스트 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-[760px] max-h-[90vh] overflow-hidden bg-gray-800/90 backdrop-blur-[25px] border border-gray-700 rounded-3xl p-0"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between border-b border-gray-700 px-8 py-6">
            <div className="space-y-2">
              <DialogTitle className="text-title1-b">플레이리스트 만들기</DialogTitle>
              <DialogDescription>제목과 설명을 입력하고 콘텐츠를 4개 이상 선택해주세요.</DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={creating}
              className="rounded-full p-1 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto px-8 py-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-body3-sb text-gray-200">
                제목
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={100}
                  placeholder="플레이리스트 제목"
                  className="h-11 rounded-xl border border-gray-700 bg-gray-900/60 px-4 text-body2-m text-white outline-none focus:border-pink-600"
                />
                <span className="text-right text-caption1-m text-gray-400">{title.length}/100</span>
              </label>
              <label className="flex flex-col gap-2 text-body3-sb text-gray-200">
                설명
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="플레이리스트 설명"
                  className="h-[76px] resize-none rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-body2-m text-white outline-none focus:border-pink-600"
                />
              </label>
            </div>

            <section className="space-y-3">
              <div>
                <h3 className="text-body1-b text-white">콘텐츠 선택</h3>
                <p className="text-body3-m text-gray-400">영화와 TV 시즌 중 최소 4개를 선택해주세요.</p>
              </div>
              <div className="relative">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  maxLength={100}
                  placeholder="콘텐츠 검색"
                  className="h-11 w-full rounded-full border border-gray-700 bg-gray-900/60 pl-4 pr-11 text-body3-m text-white outline-none placeholder:text-gray-400 focus:border-pink-600"
                />
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>

              <div className="max-h-[260px] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900/30 p-2">
                {loading ? (
                  <div className="flex h-28 items-center justify-center text-body3-m text-gray-400">
                    콘텐츠를 불러오는 중입니다.
                  </div>
                ) : contents.length === 0 ? (
                  <div className="flex h-28 items-center justify-center text-body3-m text-gray-400">
                    선택할 수 있는 콘텐츠가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {contents.map((content) => {
                      const checked = selectedContents.has(content.id);
                      return (
                        <label
                          key={content.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                            checked ? 'bg-pink-600/15' : 'hover:bg-gray-700/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleContent(content)}
                            className="h-4 w-4 accent-pink-600"
                          />
                          <img
                            src={content.thumbnailUrl || '/placeholder-movie.png'}
                            alt=""
                            className="h-12 w-9 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body3-sb text-gray-100">{content.title}</p>
                            <p className="text-caption1-m text-gray-400">
                              {content.type === 'movie'
                                ? '영화'
                                : `TV 시즌${content.seasonNumber ? ` ${content.seasonNumber}` : ''}`}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                    {hasNext && (
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="mt-2 h-10 w-full rounded-lg text-body3-sb text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
                      >
                        {loadingMore ? '불러오는 중...' : '더 보기'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-body2-sb text-gray-100">선택한 콘텐츠</h3>
                <span className="text-body3-sb text-pink-400">{selected.length}개 선택됨</span>
              </div>
              {selected.length > 0 ? (
                <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                  {selected.map((content) => (
                    <button
                      key={content.id}
                      type="button"
                      onClick={() => toggleContent(content)}
                      className="flex max-w-[220px] items-center gap-1 rounded-full bg-gray-700 px-3 py-1.5 text-caption1-m text-gray-100 hover:bg-gray-600"
                    >
                      <span className="truncate">{content.title}</span>
                      <X className="h-3 w-3 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-body3-m text-gray-400">선택한 콘텐츠가 없습니다.</p>
              )}
              {selected.length < 4 && (
                <p className="text-caption1-m text-pink-400">
                  최소 4개의 콘텐츠가 필요합니다. {4 - selected.length}개 더 선택해주세요.
                </p>
              )}
            </section>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-gray-700 px-8 py-5">
            <p className="text-caption1-m text-gray-400">{validationMessage}</p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={creating}
                className="border-gray-600 bg-transparent text-gray-200 hover:bg-gray-700"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={!canCreate}
                className="bg-pink-600 text-white hover:bg-pink-700"
              >
                {creating ? '만드는 중...' : '만들기'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
