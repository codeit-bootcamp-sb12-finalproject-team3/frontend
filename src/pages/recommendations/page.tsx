import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ContentCard from '@/pages/contents/components/ContentCard';
import PlaylistCard from '@/pages/playlists/components/PlaylistCard';
import {
  clearRecommendationPreparation,
  hasPendingRecommendationPreparation,
} from '@/lib/recommendation-preparation';
import useRecommendationStore from '@/lib/stores/useRecommendationStore';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import RecommendationShelf from './components/RecommendationShelf';

const contentItemClassName = 'w-[210px] sm:w-[230px] xl:w-[250px]';
const playlistItemClassName = 'w-[min(430px,calc(100vw-120px))] min-w-[300px]';
const POLL_INTERVAL_MS = 3_000;
const MAX_ADDITIONAL_POLL_ATTEMPTS = 9;

type PreparationState = 'idle' | 'polling' | 'checking' | 'timedOut';

export default function RecommendationsPage() {
  const userId = useAuthStore((state) => state.data?.userDto.id);
  const {
    contents: storedContents,
    playlists: storedPlaylists,
    trending: storedTrending,
    newContents: storedNewContents,
    initializedUserId,
    fetchAll,
    pollPersonalized,
    retry,
  } = useRecommendationStore();
  const [preparationState, setPreparationState] = useState<PreparationState>('idle');
  const isCurrentUser = initializedUserId === userId;
  const contents = isCurrentUser
    ? storedContents
    : { data: [], loading: true };
  const playlists = isCurrentUser
    ? storedPlaylists
    : { data: [], loading: true };
  const trending = isCurrentUser
    ? storedTrending
    : { data: [], loading: true };
  const newContents = isCurrentUser
    ? storedNewContents
    : { data: [], loading: true };

  useEffect(() => {
    if (!userId) return;

    void fetchAll(userId);
  }, [fetchAll, userId]);

  useEffect(() => {
    if (!userId || !hasPendingRecommendationPreparation(userId)) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    setPreparationState('polling');

    const poll = async () => {
      const readiness = await pollPersonalized(userId);
      if (cancelled) return;

      if (readiness.contentsReady && readiness.playlistsReady) {
        clearRecommendationPreparation(userId);
        setPreparationState('idle');
        return;
      }

      attempts += 1;
      if (attempts >= MAX_ADDITIONAL_POLL_ATTEMPTS) {
        clearRecommendationPreparation(userId);
        setPreparationState('timedOut');
        return;
      }

      timeoutId = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    timeoutId = setTimeout(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pollPersonalized, userId]);

  useEffect(() => {
    if (
      preparationState === 'polling'
      && contents.data.length > 0
      && playlists.data.length > 0
      && userId
    ) {
      clearRecommendationPreparation(userId);
      setPreparationState('idle');
    }
  }, [contents.data.length, playlists.data.length, preparationState, userId]);

  const checkAgain = useCallback(async () => {
    if (!userId || preparationState === 'checking') return;

    setPreparationState('checking');
    const readiness = await pollPersonalized(userId);
    setPreparationState(
      readiness.contentsReady && readiness.playlistsReady ? 'idle' : 'timedOut',
    );
  }, [pollPersonalized, preparationState, userId]);

  const isPreparing = preparationState === 'polling' || preparationState === 'checking';
  const pendingEmptyMessage = '추천 결과를 아직 불러오지 못했어요.';

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-16 overflow-hidden px-5 py-10 sm:px-8 xl:px-[70px]">
      <header>
        <h1 className="text-header1-b text-white">맞춤 추천</h1>
        <p className="mt-3 text-body2-m text-gray-400">
          내 취향과 지금의 인기를 바탕으로 골라봤어요.
        </p>
      </header>

      {preparationState !== 'idle' && (
        <div
          className="flex flex-col items-center justify-between gap-4 rounded-[24px] border border-gray-800 bg-gray-950/60 px-6 py-5 text-center sm:flex-row sm:text-left"
        >
          <div className="flex items-center gap-4">
            {isPreparing && <LoadingSpinner size="sm" />}
            <div role="status" aria-live="polite">
              <p className="text-body2-b text-white">
                {isPreparing
                  ? '추천 목록을 생성하고 있어요.'
                  : '추천 생성에 시간이 조금 더 걸리고 있어요.'}
              </p>
              <p className="mt-1 text-body3-m text-gray-400">
                {isPreparing
                  ? '준비된 추천부터 자동으로 보여드릴게요.'
                  : '잠시 후 다시 확인해 주세요.'}
              </p>
            </div>
          </div>
          {preparationState === 'timedOut' && (
            <Button
              type="button"
              onClick={() => void checkAgain()}
              className="rounded-full bg-gray-800 px-5 text-gray-100 hover:bg-gray-700"
            >
              <RotateCcw aria-hidden="true" />
              다시 확인
            </Button>
          )}
        </div>
      )}

      <RecommendationShelf
        title="콘텐츠 추천"
        description="내가 좋아한 콘텐츠와 활동을 바탕으로 추천해요."
        ariaLabel="개인화 콘텐츠 추천"
        itemClassName={contentItemClassName}
        loading={contents.loading || (isPreparing && contents.data.length === 0)}
        error={contents.error}
        empty={contents.data.length === 0}
        emptyMessage={preparationState === 'timedOut'
          ? pendingEmptyMessage
          : '추천 결과가 아직 없어요. 좋아하는 콘텐츠를 평가해 보세요.'}
        onRetry={() => void retry('contents')}
      >
        {contents.data.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </RecommendationShelf>

      <RecommendationShelf
        title="플레이리스트 추천"
        description="내 취향과 어울리는 다른 사용자의 플레이리스트예요."
        ariaLabel="개인화 플레이리스트 추천"
        itemClassName={playlistItemClassName}
        loading={playlists.loading || (isPreparing && playlists.data.length === 0)}
        error={playlists.error}
        empty={playlists.data.length === 0}
        emptyMessage={preparationState === 'timedOut'
          ? pendingEmptyMessage
          : '추천할 플레이리스트가 아직 없어요.'}
        skeletonVariant="playlist"
        onRetry={() => void retry('playlists')}
      >
        {playlists.data.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </RecommendationShelf>

      <RecommendationShelf
        title="실시간 트렌딩"
        description="최근 24시간 동안 MOPL에서 가장 주목받은 콘텐츠예요."
        ariaLabel="실시간 인기 콘텐츠"
        itemClassName={contentItemClassName}
        loading={trending.loading}
        error={trending.error}
        empty={trending.data.length === 0}
        emptyMessage="아직 집계된 인기 콘텐츠가 없어요."
        onRetry={() => void retry('trending')}
      >
        {trending.data.map((content, index) => (
          <div key={content.id} className="relative">
            <span className="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-pink-500 text-body1-b text-white shadow-lg">
              {index + 1}
            </span>
            <ContentCard content={content} />
          </div>
        ))}
      </RecommendationShelf>

      <RecommendationShelf
        title="신규 콘텐츠"
        description="최근 한 달 안에 새롭게 등록된 콘텐츠예요."
        ariaLabel="신규 콘텐츠"
        itemClassName={contentItemClassName}
        loading={newContents.loading}
        error={newContents.error}
        empty={newContents.data.length === 0}
        emptyMessage="최근 등록된 신규 콘텐츠가 없어요."
        onRetry={() => void retry('newContents')}
      >
        {newContents.data.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </RecommendationShelf>
    </div>
  );
}
