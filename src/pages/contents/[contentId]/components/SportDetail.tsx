import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Flag, Globe2, Heart, ImageOff, MapPin, Settings, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentResponse, ReviewDto } from '@/lib/types';
import { getSportTypeLabel } from '@/lib/sport-types';
import { deleteContent, getContentLike, likeContent, unlikeContent } from '@/lib/api/contents';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useContentStore from '@/lib/stores/useContentStore';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ReviewListDialog from './ReviewListDialog';
import SportFormDialog from './SportFormDialog';

const valueOrPending = (value?: string | null) => value?.trim() || '미정';

const formatScheduledAt = (value?: string | null) => {
  if (!value) return '경기 일정 미정';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '경기 일정 미정';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export default function SportDetail({ content, selectedReview }: { content: ContentResponse; selectedReview?: ReviewDto }) {
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const sport = content.sport;
  const [reviewOpen, setReviewOpen] = useState(Boolean(selectedReview));
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(content.likeCount);
  const [likeLoading, setLikeLoading] = useState(false);
  const isAdmin = authentication?.userDto.role === 'ADMIN';

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

  const toggleLike = async () => {
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
      toast.success('스포츠 콘텐츠가 삭제되었습니다.');
      navigate('/contents', { replace: true });
    } catch {
      toast.error('스포츠 콘텐츠 삭제에 실패했습니다. 연결된 Watch Party가 있는지 확인해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  if (!sport) return <p className="rounded-3xl border border-gray-800 bg-gray-950/70 py-20 text-center text-gray-500">경기 정보를 불러올 수 없습니다.</p>;

  const homeTeam = valueOrPending(sport.homeTeam);
  const awayTeam = valueOrPending(sport.awayTeam);
  const sportTypeLabel = getSportTypeLabel(sport.sportType.code, sport.sportType.name);
  const hasScore = sport.homeScore !== null || sport.awayScore !== null;

  return <>
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-gray-950/80 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="관리자 스포츠 콘텐츠 설정" className="absolute right-5 top-5 z-20 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-md transition hover:bg-gray-800"><Settings className="size-5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32 border-gray-700 bg-gray-800">
              <DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer text-gray-100 focus:bg-gray-700">수정</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="cursor-pointer text-pink-300 focus:bg-gray-700 focus:text-pink-300">삭제</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="grid lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.45fr)]">
          <div className="relative min-h-[280px] overflow-hidden bg-gray-900 lg:min-h-[420px]">
            {content.thumbnailUrl ? <img src={content.thumbnailUrl} alt={`${content.title} 경기 썸네일`} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><ImageOff className="size-14 text-gray-700" /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-black/10 to-black/20 lg:bg-gradient-to-r lg:from-transparent lg:to-gray-950/80" />
            <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-caption1-sb text-white backdrop-blur-md">스포츠</span>
          </div>

          <div className="flex min-w-0 flex-col justify-center p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2 text-caption1-sb text-pink-300"><span>{sportTypeLabel}</span>{sport.league && <><span className="text-gray-700">•</span><span>{sport.league}</span></>}</div>
            <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.04em] text-white sm:text-[38px]">{content.title}</h1>
            <div className="mt-4 flex items-center gap-2 text-body3-m text-gray-300"><CalendarClock className="size-[18px] text-pink-400" /><time dateTime={sport.scheduledAt || undefined}>{formatScheduledAt(sport.scheduledAt)}</time></div>

            <div className="mt-8 rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-5 py-7 sm:px-8">
              <p className="mb-5 text-center text-caption1-sb text-gray-500">{hasScore ? '경기 스코어' : '경기 예정'}</p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-8">
                <Team name={homeTeam} side="홈" />
                <div className="flex items-center gap-3 text-center"><strong className="min-w-9 text-[34px] font-bold text-white sm:text-[42px]">{sport.homeScore ?? '-'}</strong><span className="text-body2-b text-gray-600">:</span><strong className="min-w-9 text-[34px] font-bold text-white sm:text-[42px]">{sport.awayScore ?? '-'}</strong></div>
                <Team name={awayTeam} side="원정" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setReviewOpen(true)} className="flex h-12 items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 text-body3-sb text-gray-200 transition hover:border-pink-500/40"><Star className="size-[18px] text-pink-400" fill="currentColor" /><strong>{content.averageRating.toFixed(1)}</strong><span className="text-gray-500">리뷰 {content.reviewCount.toLocaleString()}</span></button>
              <button type="button" onClick={toggleLike} disabled={likeLoading} className={`flex h-12 items-center gap-2 rounded-xl border px-4 text-body3-sb transition ${liked ? 'border-[#FF4A64]/40 bg-[#FF4A64]/10 text-[#FF8C9D]' : 'border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700'}`}><Heart className="size-[18px]" fill={liked ? 'currentColor' : 'none'} />좋아요 <span className="text-[#FF8C9D]">{likeCount.toLocaleString()}</span></button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[24px] border border-white/[0.08] bg-gray-950/70 p-6 sm:p-7"><h2 className="text-title1-b text-white">경기 소개</h2><p className="mt-5 whitespace-pre-wrap text-body3-m-150 leading-7 text-gray-300">{content.description || '등록된 경기 설명이 없습니다.'}</p></section>
        <section className="rounded-[24px] border border-white/[0.08] bg-gray-950/70 p-6 sm:p-7"><h2 className="text-title1-b text-white">경기 정보</h2><dl className="mt-5 divide-y divide-gray-800/80"><Info icon={<Trophy />} label="종목" value={sportTypeLabel} /><Info icon={<Flag />} label="리그" value={valueOrPending(sport.league)} /><Info label="시즌" value={valueOrPending(sport.season)} /><Info label="라운드" value={valueOrPending(sport.round)} /><Info icon={<CalendarClock />} label="경기 일시" value={formatScheduledAt(sport.scheduledAt)} /><Info icon={<MapPin />} label="경기장" value={valueOrPending(sport.venue)} /><Info icon={<Globe2 />} label="개최 국가" value={valueOrPending(sport.country)} /></dl></section>
      </div>
    </div>
    <ReviewListDialog open={reviewOpen} onOpenChange={setReviewOpen} contentId={content.id} selectedReview={selectedReview} />
    {isAdmin && <>
      <SportFormDialog open={editOpen} onOpenChange={setEditOpen} content={content} />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="스포츠 콘텐츠 삭제" description={`'${content.title}'을(를) 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`} confirmText={deleting ? '삭제 중...' : '삭제'} cancelText="취소" variant="destructive" onConfirm={handleDelete} />
    </>}
  </>;
}

function Team({ name, side }: { name: string; side: string }) {
  return <div className="min-w-0 text-center"><span className="text-caption1-sb text-gray-600">{side}</span><p className="mt-2 break-keep text-body1-b text-gray-100 sm:text-title1-b">{name}</p></div>;
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-3.5 first:pt-0 last:pb-0"><dt className="flex items-center gap-2 text-body3-m text-gray-500">{icon && <span className="[&_svg]:size-4">{icon}</span>}{label}</dt><dd className="text-right text-body3-sb text-gray-200">{value}</dd></div>;
}
