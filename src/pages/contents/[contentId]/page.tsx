import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import useContentStore from '@/lib/stores/useContentStore';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ContentInfo from './components/ContentInfo';
import ContentRelatedSections from './components/ContentRelatedSections';
import CastCarousel from './components/CastCarousel';
import EpisodeShelf from './components/EpisodeShelf';
import SportDetail from './components/SportDetail';
import type { ReviewDto } from '@/lib/types';

export default function ContentDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contentId } = useParams<{ contentId: string }>();
  const { data: content, loading, updateParams, clear } = useContentDetailStore();
  const selectedReview = (location.state as {selectedReview?: ReviewDto} | null)?.selectedReview;

  const handleBrowseContents = () => {
    if ((location.state as { contentCreateReturn?: 'restore' | 'fresh' } | null)?.contentCreateReturn === 'fresh') {
      useContentStore.getState().prepareFreshBrowse();
    }
    navigate('/contents');
  };

  useEffect(() => {
    if (contentId) updateParams({ contentId });
    return () => clear();
  }, [contentId, updateParams, clear]);

  if (loading && (!content || content.id !== contentId)) {
    return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center"><LoadingSpinner /></div>;
  }

  if (!content) {
    return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center"><p className="text-body2-m text-gray-500">콘텐츠를 찾을 수 없습니다.</p></div>;
  }

  const reviewToOpen = selectedReview?.contentId === content.id ? selectedReview : undefined;

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10 xl:px-[54px] xl:py-10">
      <div className="mx-auto max-w-[1320px]">
        <button type="button" onClick={handleBrowseContents} className="mb-6 flex items-center gap-2 text-body3-sb text-gray-400 transition hover:text-white"><ArrowLeft className="size-4" />콘텐츠 둘러보기</button>
        {content.type === 'sport' ? <SportDetail content={content} selectedReview={reviewToOpen} /> : <div className={`grid items-start gap-6 ${content.type === 'tvSeason' ? 'xl:grid-cols-[400px_minmax(0,1fr)]' : 'xl:grid-cols-[440px_minmax(0,1fr)]'}`}>
          <div className={`${content.type === 'tvSeason' ? 'space-y-4' : 'space-y-6'} xl:sticky xl:top-6`}><ContentInfo content={content} selectedReview={reviewToOpen} /><CastCarousel cast={content.cast} compact={content.type === 'tvSeason'} />{content.type === 'tvSeason' && <EpisodeShelf seasonId={content.id} />}</div>
          <ContentRelatedSections content={content} />
        </div>}
      </div>
    </main>
  );
}
