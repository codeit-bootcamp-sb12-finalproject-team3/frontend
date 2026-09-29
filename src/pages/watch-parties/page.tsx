import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { joinWatchParty } from '@/lib/api/watch-parties';
import { getContent } from '@/lib/api/contents';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useWatchPartyStore from '@/lib/stores/useWatchPartyStore';
import type { ContentResponse, ContentSummaryResponse, WatchPartySummaryResponse } from '@/lib/types';
import CreateWatchPartyDialog from './components/CreateWatchPartyDialog';
import WatchPartyCard from './components/WatchPartyCard';
import WatchPartyFilters from './components/WatchPartyFilters';

const toContentSummary = (content: ContentResponse): ContentSummaryResponse => ({
  id: content.id,
  parentContentId: content.tvSeason?.parentContentId ?? null,
  title: content.title,
  description: content.description,
  type: content.type,
  seasonNumber: content.tvSeason?.seasonNumber ?? null,
  episodeCount: content.tvSeason?.episodeCount ?? null,
  sportType: content.sport?.sportType.code ?? null,
  league: content.sport?.league ?? null,
  homeTeam: content.sport?.homeTeam ?? null,
  awayTeam: content.sport?.awayTeam ?? null,
  thumbnailUrl: content.thumbnailUrl,
  releaseDate: content.releaseDate,
  runtime: content.movie?.runtime ?? null,
  averageRating: content.averageRating,
  reviewCount: content.reviewCount,
  likeCount: content.likeCount,
  likedByMe: false,
  genres: content.genres,
  tags: content.tags,
});

export default function WatchPartiesPage() {
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const { data, status, cursor, loading, error, setStatus, setContentIdEqual, fetchMore } = useWatchPartyStore();
  const [searchParams] = useSearchParams();
  const contentIdEqual = searchParams.get('contentIdEqual') || undefined;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [initialPartyContent, setInitialPartyContent] = useState<ContentSummaryResponse | undefined>();
  const [loadingInitialContent, setLoadingInitialContent] = useState(false);
  const [joiningPartyId, setJoiningPartyId] = useState<string | null>(null);
  const { ref: sentinelRef, inView } = useInView({ threshold: 0, rootMargin: '120px' });

  useEffect(() => {
    setContentIdEqual(contentIdEqual);
  }, [contentIdEqual, setContentIdEqual]);

  useEffect(() => {
    let cancelled = false;
    if (!contentIdEqual) {
      setInitialPartyContent(undefined);
      setLoadingInitialContent(false);
      return;
    }
    setInitialPartyContent(undefined);
    setLoadingInitialContent(true);
    void getContent(contentIdEqual)
      .then((content) => {
        if (!cancelled && (content.type === 'movie' || content.type === 'tvSeason')) {
          setInitialPartyContent(toContentSummary(content));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setInitialPartyContent(undefined);
        toast.error('Watch Party 생성에 사용할 콘텐츠 정보를 불러오지 못했습니다.');
      })
      .finally(() => { if (!cancelled) setLoadingInitialContent(false); });
    return () => { cancelled = true; };
  }, [contentIdEqual]);

  useEffect(() => {
    if (inView && cursor.hasNext && !loading) void fetchMore();
  }, [inView, cursor.hasNext, loading, fetchMore]);

  const handleJoin = async (party: WatchPartySummaryResponse) => {
    if (joiningPartyId) return;
    if (party.host.userId === authentication?.userDto.id) {
      navigate(`/watch-parties/${party.id}`);
      return;
    }

    setJoiningPartyId(party.id);
    try {
      await joinWatchParty(party.id);
      navigate(`/watch-parties/${party.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Watch Party에 참여하지 못했습니다. 참여 상태와 정원을 확인해주세요.');
    } finally {
      setJoiningPartyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 px-[70px] py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {contentIdEqual && (
            <button type="button" onClick={() => navigate(`/contents/${contentIdEqual}`)} className="mb-6 flex items-center gap-2 text-body3-sb text-gray-400 transition hover:text-white">
              <ArrowLeft className="size-4" />상세페이지
            </button>
          )}
          <h1 className="text-header1-b text-white">Watch Party</h1>
          <p className="mt-2 text-body3-m text-gray-400">좋아하는 콘텐츠를 다른 사용자와 함께 즐겨보세요.</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} disabled={Boolean(contentIdEqual) && (loadingInitialContent || !initialPartyContent)} className="h-11 rounded-xl bg-pink-600 px-5 text-body3-b text-white hover:bg-pink-700">
          {loadingInitialContent ? '콘텐츠 확인 중...' : '+ 파티 만들기'}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <WatchPartyFilters value={status} onChange={setStatus} />
        <span className="text-body3-m text-gray-500">총 {cursor.totalCount.toLocaleString()}개</span>
      </div>

      {error && !loading && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 py-16">
          <p className="text-body2-m text-gray-300">{error}</p>
          <Button type="button" variant="outline" onClick={() => setContentIdEqual(contentIdEqual)} className="border-gray-600 text-gray-200">다시 시도</Button>
        </div>
      )}

      {!error && data.length === 0 && loading && (
        <div className="flex min-h-72 items-center justify-center"><LoadingSpinner /></div>
      )}

      {!error && data.length === 0 && !loading && (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/30">
          <p className="text-body2-m text-gray-400">해당 상태의 Watch Party가 없습니다.</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.map((party) => (
            <WatchPartyCard key={party.id} party={party} joining={joiningPartyId === party.id} onJoin={handleJoin} />
          ))}
        </div>
      )}

      {cursor.hasNext && <div ref={sentinelRef} className="flex h-14 items-center justify-center">{loading && <LoadingSpinner />}</div>}

      <CreateWatchPartyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        initialContent={initialPartyContent}
        onCreated={(party) => navigate(`/watch-parties/${party.id}`)}
      />
    </div>
  );
}
