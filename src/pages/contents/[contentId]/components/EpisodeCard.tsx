import { useState } from 'react';
import { Clock3, ImageOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { EpisodeResponse } from '@/lib/types';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { deleteContentEpisode } from '@/lib/api/contents';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import EpisodeFormDialog from './EpisodeFormDialog';

const runtimeLabel = (runtime: number | null) => runtime ? `${runtime}분` : '러닝타임 미정';

interface Props {
  episode: EpisodeResponse;
  seasonId: string;
  compact?: boolean;
  onChanged: () => Promise<void> | void;
}

export default function EpisodeCard({ episode, seasonId, compact = false, onChanged }: Props) {
  const authentication = useAuthStore((state) => state.data);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = authentication?.userDto.role === 'ADMIN';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteContentEpisode(seasonId, episode.id);
      await onChanged();
      toast.success('에피소드가 삭제되었습니다.');
    } catch (error) {
      console.error(error);
      toast.error('에피소드를 삭제하지 못했습니다. 진행 중인 Watch Party가 있는지 확인해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  return <>
    <article className={`relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70 ${compact ? '' : 'flex min-h-[168px]'}`}>
    <div className={compact ? 'aspect-video bg-gray-800' : 'w-[240px] shrink-0 bg-gray-800'}>
      {episode.thumbnailUrl ? <img src={episode.thumbnailUrl} alt={`${episode.episodeNumber}화 썸네일`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageOff className="size-8 text-gray-600" /></div>}
    </div>
    <div className={`min-w-0 ${compact ? 'p-3.5' : 'p-4'}`}>
      <div className="flex items-center gap-2"><span className="rounded-full bg-pink-500/10 px-2.5 py-1 text-caption1-sb text-pink-300">{episode.episodeNumber}화</span><span className="flex items-center gap-1 text-caption1-m text-gray-500"><Clock3 className="size-3.5" />{runtimeLabel(episode.runtime)}</span></div>
      <h3 className={`${compact ? 'mt-2 text-body3-sb' : 'mt-3 text-body1-sb'} truncate text-gray-100`}>{episode.title || `${episode.episodeNumber}화`}</h3>
      <p className={`${compact ? 'mt-1.5 line-clamp-2 text-caption1-m leading-5' : 'mt-2 line-clamp-3 text-body3-m leading-6'} text-gray-400`}>{episode.description || '등록된 에피소드 설명이 없습니다.'}</p>
    </div>
    {isAdmin && <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`${episode.episodeNumber}화 설정`} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border border-white/10 bg-gray-950/85 text-white shadow-lg backdrop-blur transition hover:bg-gray-800"><Settings className="size-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-28 border-gray-700 bg-gray-800"><DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer text-gray-100 focus:bg-gray-700">수정</DropdownMenuItem><DropdownMenuItem onClick={() => setDeleteOpen(true)} className="cursor-pointer text-pink-300 focus:bg-gray-700 focus:text-pink-300">삭제</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
  </article>
  {isAdmin && <><EpisodeFormDialog open={editOpen} onOpenChange={setEditOpen} seasonId={seasonId} episode={episode} onSaved={onChanged} /><ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="에피소드 삭제" description={`'${episode.title || `${episode.episodeNumber}화`}'을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`} confirmText={deleting ? '삭제 중...' : '삭제'} cancelText="취소" variant="destructive" onConfirm={handleDelete} /></>}
  </>;
}
