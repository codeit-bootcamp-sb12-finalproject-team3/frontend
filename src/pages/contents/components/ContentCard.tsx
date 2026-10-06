import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, Clock3, Heart, Play, Star } from 'lucide-react';
import type { ContentResponse, ContentSummaryResponse, ContentSummaryType } from '@/lib/types';
import { getSportTypeLabel } from '@/lib/sport-types';
import icMeatball from '@/assets/ic_meatball.svg';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useContentStore from '@/lib/stores/useContentStore';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import { deleteContent, likeContent, unlikeContent } from '@/lib/api/contents';
import ContentFormDialog from './ContentFormDialog';
import SportFormDialog from '@/pages/contents/[contentId]/components/SportFormDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const ContentTypeLabel: Record<ContentSummaryType, string> = {
  movie: '영화',
  tvSeason: 'TV 시즌',
  sport: '스포츠',
}

const formatReleaseDate = (releaseDate: string | null) => {
  if (!releaseDate) return null;

  const [year, month, day] = releaseDate.split('-');
  return month && day ? `${year}.${month}.${day}` : year;
};

const formatRuntime = (runtime: number | null) => {
  if (!runtime) return null;

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours > 0 ? `${hours}시간 ${minutes > 0 ? `${minutes}분` : ''}`.trim() : `${minutes}분`;
};

interface ContentCardProps {
  content: ContentSummaryResponse;
}

export default function ContentCard({ content }: ContentCardProps) {
  const navigate = useNavigate();
  const { data: authentication } = useAuthStore();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState<ContentResponse | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [liked, setLiked] = useState(content.likedByMe);
  const [likeCount, setLikeCount] = useState(content.likeCount);
  const [likeLoading, setLikeLoading] = useState(false);
  const editOriginScrollY = useRef(0);

  const isAdmin = authentication?.userDto.role === 'ADMIN';

  useEffect(() => {
    setLiked(content.likedByMe);
    setLikeCount(content.likeCount);
  }, [content.likedByMe, content.likeCount]);

  const rememberScrollPosition = () => {
    useContentStore.getState().saveScrollPosition(window.scrollY);
  };

  const handleEdit = async () => {
    if (loadingEdit) return;
    editOriginScrollY.current = window.scrollY;
    setLoadingEdit(true);
    try {
      const detailStore = useContentDetailStore.getState();
      detailStore.updateParams({ contentId: content.id }, { autoFetch: false });
      await detailStore.fetch({ ignoreLoading: true, throwError: true });
      const detail = useContentDetailStore.getState().data;
      if (!detail) throw new Error('콘텐츠 상세 정보가 없습니다.');
      setEditContent(detail);
      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error('수정할 콘텐츠의 상세 정보를 불러오지 못했습니다.');
      console.error(error);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleEditSuccess = () => {
    navigate(`/contents/${content.id}`);
  };

  const preserveListForEditNavigation = () => {
    useContentStore.getState().saveScrollPosition(editOriginScrollY.current);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const response = liked ? await unlikeContent(content.id) : await likeContent(content.id);
      setLiked(response.liked);
      setLikeCount(response.likeCount);
      useContentStore.getState().update(content.id, {
        likedByMe: response.liked,
        likeCount: response.likeCount,
      });
      const detailStore = useContentDetailStore.getState();
      if (detailStore.params.contentId === content.id) {
        detailStore.update({ likeCount: response.likeCount });
      }
    } catch {
      toast.error('좋아요 상태를 변경하지 못했습니다.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      // Call API
      await deleteContent(content.id);
      useContentStore.getState().delete(content.id);
      await useContentStore.getState().fetch();

      toast.success('콘텐츠가 삭제되었습니다.');
    } catch (error) {
      toast.error('콘텐츠 삭제에 실패했습니다.');
      console.error(error);
    }
  };

  const visibleGenres = content.genres.slice(0, 2);
  const hiddenGenreCount = Math.max(content.genres.length - visibleGenres.length, 0);
  const visibleTag = content.tags[0];
  const hiddenTagCount = Math.max(content.tags.length - (visibleTag ? 1 : 0), 0);
  const releaseDate = formatReleaseDate(content.releaseDate);
  const runtime = formatRuntime(content.runtime);
  const detail = content.type === 'movie'
    ? runtime
    : content.type === 'tvSeason'
      ? [content.seasonNumber ? `시즌 ${content.seasonNumber}` : null, content.episodeCount ? `${content.episodeCount}부작` : null].filter(Boolean).join(' · ')
      : [content.sportType ? getSportTypeLabel(content.sportType) : null, content.league].filter(Boolean).join(' · ');

  return (
    <>
      <article className="group relative transition duration-300 hover:-translate-y-1">
        <Link
          to={`/contents/${content.id}`}
          onClick={rememberScrollPosition}
          aria-label={`${content.title} 상세 보기`}
          className="block cursor-pointer overflow-hidden rounded-[22px] border border-white/[0.07] bg-gray-950/80 shadow-[0_18px_45px_rgba(0,0,0,0.22)] transition duration-300 hover:border-pink-500/45 hover:shadow-[0_20px_55px_rgba(255,74,100,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
        {/* Thumbnail Container */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-900">
          {/* Skeleton Loader */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse" />
          )}

          {/* Thumbnail Image */}
          <img
            src={content.thumbnailUrl || '/placeholder-movie.png'}
            alt={content.title}
            className={`h-full w-full ${content.type === 'sport' ? 'object-contain' : 'object-cover'} transition duration-500 group-hover:scale-[1.04] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(event) => {
              if (!event.currentTarget.src.includes('/placeholder-movie.png')) {
                event.currentTarget.src = '/placeholder-movie.png';
              }
              setImageLoaded(true);
            }}
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/35" />

          <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-caption1-sb text-white backdrop-blur-md">
            {ContentTypeLabel[content.type]}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            {content.type === 'sport' && content.homeTeam && content.awayTeam && (
              <p className="mb-1.5 truncate text-caption1-sb text-pink-300">
                {content.homeTeam} <span className="text-gray-400">vs</span> {content.awayTeam}
              </p>
            )}
            <h3 className="line-clamp-2 text-title1-b-140 text-white drop-shadow-md">
              {content.title}
            </h3>
          </div>

        </div>

        <div className="flex min-h-[158px] flex-col p-4">
          <p className="line-clamp-2 min-h-[42px] text-body3-m-150 text-gray-300">
            {content.description ?? ''}
          </p>

          <div className="mt-3 flex min-h-4 items-center gap-2 overflow-hidden text-caption1-m text-gray-400">
            {releaseDate && <span className="flex shrink-0 items-center gap-1"><CalendarDays className="size-3.5" />{releaseDate}</span>}
            {releaseDate && detail && <span className="size-0.5 shrink-0 rounded-full bg-gray-600" />}
            {detail && <span className="flex min-w-0 items-center gap-1 truncate"><Clock3 className="size-3.5 shrink-0" />{detail}</span>}
          </div>

          <div className="mt-4 flex items-center border-t border-white/[0.07] pt-3">
            <div className="flex items-center gap-1.5" aria-label={`평점 ${content.averageRating.toFixed(1)}, 리뷰 ${content.reviewCount.toLocaleString()}개`}>
              <Star className="size-4 text-pink-400" fill="currentColor" />
              <span className="text-body3-sb text-gray-100">{content.averageRating.toFixed(1)}</span>
              <span className="text-caption1-m text-gray-500">({content.reviewCount.toLocaleString()})</span>
            </div>
          </div>

          <div className="mt-3 flex min-w-0 items-center gap-1.5 overflow-hidden">
            {visibleGenres.map((genre) => (
              <span key={genre.id} className="max-w-[30%] truncate rounded-full bg-gray-800 px-2.5 py-1 text-caption1-m text-gray-300">
                {genre.name}
              </span>
            ))}
            {hiddenGenreCount > 0 && (
              <span className="shrink-0 text-caption1-m text-gray-500" aria-label={`장르 ${hiddenGenreCount}개 더 있음`}>
                +{hiddenGenreCount}
              </span>
            )}
            {visibleTag && (
              <span className="max-w-[34%] truncate rounded-full bg-pink-500/10 px-2.5 py-1 text-caption1-sb text-pink-300">
                #{visibleTag.name}
              </span>
            )}
            {hiddenTagCount > 0 && (
              <span className="shrink-0 text-caption1-m text-pink-400/80" aria-label={`태그 ${hiddenTagCount}개 더 있음`}>
                +{hiddenTagCount}
              </span>
            )}
            <span className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-gray-300 transition group-hover:bg-pink-500 group-hover:text-white">
              <Play className="ml-0.5 size-3.5" fill="currentColor" />
            </span>
          </div>
        </div>
        </Link>

        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          {isAdmin && (
            <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex size-8 items-center justify-center rounded-full border border-gray-300 bg-white/90 shadow-lg transition-colors hover:bg-white" aria-label="콘텐츠 옵션">
                    <img src={icMeatball} alt="" className="size-5 text-gray-800" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[100px] border-gray-700 bg-gray-800">
                  <DropdownMenuItem onClick={handleEdit} disabled={loadingEdit} className="cursor-pointer text-body3-m text-gray-100 hover:bg-gray-700 focus:bg-gray-700">수정</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteClick} className="cursor-pointer text-body3-m text-red-notification hover:bg-gray-700 focus:bg-gray-700">삭제</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <button
            type="button"
            onClick={handleLike}
            disabled={likeLoading}
            aria-label={liked ? `좋아요 취소, 현재 ${likeCount.toLocaleString()}개` : `좋아요, 현재 ${likeCount.toLocaleString()}개`}
            aria-pressed={liked}
            className={`flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full border px-2.5 text-caption1-sb shadow-lg backdrop-blur-md transition disabled:cursor-wait disabled:opacity-90 ${liked ? 'border-pink-500 bg-pink-500 text-white hover:bg-pink-600' : 'border-pink-500/70 bg-black/55 text-pink-300 hover:bg-pink-500/10'}`}
          >
            <Heart className="size-4" fill={liked ? 'currentColor' : 'none'} />
            <span className={liked ? 'font-bold text-white' : ''}>
              {likeCount.toLocaleString()}
            </span>
          </button>
        </div>
      </article>

      {isAdmin && (
        <>
          {editContent?.type === 'sport' ? (
            <SportFormDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} content={editContent} onBeforeRefresh={preserveListForEditNavigation} onSuccess={handleEditSuccess} />
          ) : editContent ? (
            <ContentFormDialog mode="edit" open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} initialData={editContent} onBeforeRefresh={preserveListForEditNavigation} onSuccess={handleEditSuccess} />
          ) : null}
          <ConfirmDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            title="콘텐츠 삭제"
            description={`'${content.title}'을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`}
            onConfirm={handleDeleteConfirm}
            confirmText="삭제"
            cancelText="취소"
            variant="destructive"
          />
        </>
      )}
    </>
  );
}
