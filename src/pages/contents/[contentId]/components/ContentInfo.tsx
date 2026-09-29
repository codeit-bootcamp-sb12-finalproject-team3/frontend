import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clapperboard, Heart, Settings, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentResponse } from '@/lib/types';
import { deleteContent, getContentLike, likeContent, unlikeContent } from '@/lib/api/contents';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useContentStore from '@/lib/stores/useContentStore';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ContentFormDialog from '@/pages/contents/components/ContentFormDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ReviewListDialog from './ReviewListDialog';

interface ContentInfoProps { content: ContentResponse; }

const formatRuntime = (runtime?: number | null) => {
  if (!runtime) return '러닝타임 미정';
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours ? `${hours}시간 ${minutes ? `${minutes}분` : ''}`.trim() : `${minutes}분`;
};

const formatDate = (date?: string | null) => date?.replaceAll('-', '.') || '공개일 미정';
const typeLabel = (content: ContentResponse) => content.type === 'tvSeason' ? 'TV 시즌' : content.type === 'sport' ? '스포츠' : '영화';

const formatSeasonSummary = (content: ContentResponse) => {
  const season = content.tvSeason;
  if (!season) return null;

  const summary = [
    season.seasonNumber !== null ? `시즌 ${season.seasonNumber}` : null,
    season.episodeCount !== null ? `${season.episodeCount}부작` : null,
  ].filter(Boolean);

  return summary.length > 0 ? summary.join(' · ') : null;
};

export default function ContentInfo({ content }: ContentInfoProps) {
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(content.likeCount);
  const [likeLoading, setLikeLoading] = useState(false);
  const isAdmin = authentication?.userDto.role === 'ADMIN';
  const seasonSummary = content.type === 'tvSeason' ? formatSeasonSummary(content) : null;

  useEffect(() => {
    let cancelled = false;
    setLikeCount(content.likeCount);
    void getContentLike(content.id).then((response) => {
      if (!cancelled) {
        setLiked(response.liked);
        setLikeCount(response.likeCount);
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [content.id, content.likeCount]);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const response = liked ? await unlikeContent(content.id) : await likeContent(content.id);
      setLiked(response.liked);
      setLikeCount(response.likeCount);
      useContentDetailStore.getState().update({ likeCount: response.likeCount });
      await useContentStore.getState().fetch();
    } catch {
      toast.error('좋아요 상태를 변경하지 못했습니다.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteContent(content.id);
      useContentStore.getState().delete(content.id);
      await useContentStore.getState().fetch();
      toast.success('콘텐츠가 삭제되었습니다.');
      navigate('/contents', { replace: true });
    } catch {
      toast.error('콘텐츠 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <article className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-gray-950/80 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-900">
          {content.thumbnailUrl ? <img src={content.thumbnailUrl} alt={`${content.title} 포스터`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-body2-m text-gray-500">이미지 준비 중</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-black/20 to-black/20" />
          <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-caption1-sb text-white backdrop-blur-md">{typeLabel(content)}</span>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-gray-800" aria-label="관리자 콘텐츠 설정"><Settings className="size-5" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-32 border-gray-700 bg-gray-800">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="cursor-pointer text-gray-100 focus:bg-gray-700">수정</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="cursor-pointer text-pink-300 focus:bg-gray-700 focus:text-pink-300">삭제</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className="absolute inset-x-0 bottom-0 p-6">
            {content.englishTitle && content.englishTitle !== content.title && <p className="mb-1.5 text-caption1-sb uppercase tracking-[0.12em] text-pink-300">{content.englishTitle}</p>}
            <h1 className="text-[32px] font-bold leading-tight tracking-[-0.04em] text-white">{content.title}</h1>
            {seasonSummary && <p className="mt-1.5 text-body3-m text-gray-300">{seasonSummary}</p>}
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body3-m text-gray-300">
            <button type="button" onClick={() => setIsReviewDialogOpen(true)} className="flex items-center gap-1.5 transition hover:text-pink-300" aria-label={`평점 ${content.averageRating.toFixed(1)}, 리뷰 ${content.reviewCount.toLocaleString()}개 보기`}>
              <Star className="size-[18px] text-pink-400" fill="currentColor" /><strong className="text-gray-50">{content.averageRating.toFixed(1)}</strong><span className="text-gray-500">리뷰 {content.reviewCount.toLocaleString()}</span>
            </button>
            <span className="h-3 w-px bg-gray-700" />
            <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-gray-500" />{formatDate(content.releaseDate)}</span>
            {content.type === 'movie' && <span className="flex items-center gap-1.5"><Clapperboard className="size-4 text-gray-500" />{formatRuntime(content.movie?.runtime)}</span>}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {content.genres.map((genre) => <span key={genre.id} className="rounded-full bg-gray-800 px-3 py-1.5 text-caption1-sb text-gray-200">{genre.name}</span>)}
            {content.tags.map((tag) => <span key={tag.id} className="rounded-full bg-pink-500/10 px-3 py-1.5 text-caption1-sb text-pink-300">#{tag.name}</span>)}
          </div>

          <p className="mt-6 text-body3-m-150 leading-6 text-gray-200">{content.description || '아직 등록된 작품 소개가 없습니다.'}</p>

          <div className="mt-7">
            <button type="button" onClick={handleLike} disabled={likeLoading} className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 text-body3-sb transition ${liked ? 'border-pink-500/40 bg-pink-500/10 text-pink-300' : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'}`}><Heart className="size-[18px]" fill={liked ? 'currentColor' : 'none'} />좋아요 {likeCount.toLocaleString()}</button>
          </div>
        </div>
      </article>

      <ReviewListDialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen} contentId={content.id} />
      {isAdmin && <><ContentFormDialog mode="edit" open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} initialData={content} /><ConfirmDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} title="콘텐츠 삭제" description={`'${content.title}'을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`} onConfirm={handleDelete} confirmText={deleting ? '삭제 중...' : '삭제'} cancelText="취소" variant="destructive" /></>}
    </>
  );
}
