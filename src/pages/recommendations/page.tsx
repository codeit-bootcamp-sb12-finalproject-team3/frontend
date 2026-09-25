import { useEffect } from 'react';
import ContentCard from '@/pages/contents/components/ContentCard';
import PlaylistCard from '@/pages/playlists/components/PlaylistCard';
import useRecommendationStore from '@/lib/stores/useRecommendationStore';
import RecommendationShelf from './components/RecommendationShelf';

const contentItemClassName = 'w-[210px] sm:w-[230px] xl:w-[250px]';
const playlistItemClassName = 'w-[min(430px,calc(100vw-120px))] min-w-[300px]';

export default function RecommendationsPage() {
  const { contents, playlists, trending, newContents, fetchAll, retry } =
    useRecommendationStore();

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-16 overflow-hidden px-5 py-10 sm:px-8 xl:px-[70px]">
      <header>
        <h1 className="text-header1-b text-white">맞춤 추천</h1>
        <p className="mt-3 text-body2-m text-gray-400">
          내 취향과 지금의 인기를 바탕으로 골라봤어요.
        </p>
      </header>

      <RecommendationShelf
        title="콘텐츠 추천"
        description="내가 좋아한 콘텐츠와 활동을 바탕으로 추천해요."
        ariaLabel="개인화 콘텐츠 추천"
        itemClassName={contentItemClassName}
        loading={contents.loading}
        error={contents.error}
        empty={contents.data.length === 0}
        emptyMessage="추천 결과가 아직 없어요. 좋아하는 콘텐츠를 평가해 보세요."
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
        loading={playlists.loading}
        error={playlists.error}
        empty={playlists.data.length === 0}
        emptyMessage="추천할 플레이리스트가 아직 없어요."
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
