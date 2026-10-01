import { useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getContent, getContentEpisodes } from '@/lib/api/contents';
import type { ContentResponse, EpisodeResponse } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import EpisodeCard from '../components/EpisodeCard';
import EpisodeFormDialog from '../components/EpisodeFormDialog';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { Button } from '@/components/ui/button';

export default function EpisodeListPage() {
  const navigate = useNavigate(); const { contentId } = useParams<{ contentId: string }>();
  const [season, setSeason] = useState<ContentResponse | null>(null); const [episodes, setEpisodes] = useState<EpisodeResponse[]>([]); const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false); const isAdmin = useAuthStore((state) => state.data?.userDto.role === 'ADMIN');
  const suggestedEpisodeNumber = episodes.length === 0 ? 1 : Math.max(...episodes.map(({ episodeNumber }) => episodeNumber)) + 1;
  const refresh = async () => {
    if (!contentId) return;
    const [content, items] = await Promise.all([getContent(contentId), getContentEpisodes(contentId)]);
    setSeason(content);
    setEpisodes(items);
  };
  useEffect(() => { if (!contentId) return; let cancelled = false; setLoading(true); void Promise.all([getContent(contentId), getContentEpisodes(contentId)]).then(([content, items]) => { if (!cancelled) { setSeason(content); setEpisodes(items); } }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [contentId]);
  if (loading) return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center"><LoadingSpinner /></div>;
  return <main className="px-5 py-8 sm:px-8 lg:px-10 xl:px-[54px]"><div className="mx-auto max-w-[1120px]"><button type="button" onClick={() => navigate(`/contents/${contentId}`)} className="mb-6 flex items-center gap-2 text-body3-sb text-gray-400 transition hover:text-white"><ArrowLeft className="size-4" />상세페이지</button><div className="mb-8 flex items-end justify-between gap-4"><div>{season?.englishTitle && <p className="text-body3-sb uppercase tracking-[0.12em] text-pink-300">{season.englishTitle}</p>}<h1 className="mt-1 text-[32px] font-bold text-white">{season?.title}</h1><p className="mt-2 text-body3-m text-gray-500">총 {episodes.length}개의 에피소드</p></div>{isAdmin && <Button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 rounded-xl bg-pink-500 text-white hover:bg-pink-600"><Plus className="mr-1 size-4" />에피소드 등록</Button>}</div><div className="space-y-4">{contentId && episodes.map((episode) => <EpisodeCard key={episode.id} episode={episode} seasonId={contentId} onChanged={refresh} />)}{episodes.length === 0 && <p className="rounded-2xl border border-dashed border-gray-800 py-16 text-center text-gray-500">등록된 에피소드가 없습니다.</p>}</div>{isAdmin && contentId && <EpisodeFormDialog open={createOpen} onOpenChange={setCreateOpen} seasonId={contentId} suggestedEpisodeNumber={suggestedEpisodeNumber} onSaved={refresh} />}</div></main>;
}
