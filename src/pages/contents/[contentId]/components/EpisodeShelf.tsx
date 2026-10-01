import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getContentEpisodes } from '@/lib/api/contents';
import type { EpisodeResponse } from '@/lib/types';
import HorizontalCarousel from '@/pages/recommendations/components/HorizontalCarousel';
import EpisodeCard from './EpisodeCard';
import useContentDetailStore from '@/lib/stores/useContentDetailStore';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import EpisodeFormDialog from './EpisodeFormDialog';

export default function EpisodeShelf({ seasonId }: { seasonId: string }) {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState<EpisodeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const isAdmin = useAuthStore((state) => state.data?.userDto.role === 'ADMIN');
  const suggestedEpisodeNumber = useMemo(() => episodes.length === 0 ? 1 : Math.max(...episodes.map(({ episodeNumber }) => episodeNumber)) + 1, [episodes]);
  const refresh = async () => {
    const [items] = await Promise.all([getContentEpisodes(seasonId), useContentDetailStore.getState().fetch({ ignoreLoading: true, throwError: true })]);
    setEpisodes(items);
  };
  useEffect(() => { let cancelled = false; setLoading(true); void getContentEpisodes(seasonId).then((data) => { if (!cancelled) setEpisodes(data); }).catch(() => { if (!cancelled) setEpisodes([]); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [seasonId]);
  return <section className="rounded-[24px] border border-white/[0.08] bg-gray-950/70 p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-body1-b text-white">에피소드</h2>{episodes.length > 0 && <p className="mt-1 truncate text-caption1-m text-gray-500">첫 화부터 회차순</p>}</div><div className="flex items-center gap-2">{isAdmin && <Button type="button" onClick={() => setCreateOpen(true)} className="h-9 shrink-0 rounded-xl bg-pink-500 px-3 text-caption1-sb text-white hover:bg-pink-600"><Plus className="mr-1 size-4" />에피소드 등록</Button>}{episodes.length > 0 && <Button type="button" variant="outline" onClick={() => navigate(`/contents/${seasonId}/episodes`)} className="h-9 shrink-0 rounded-xl border-gray-700 bg-transparent px-3 text-caption1-sb text-gray-200 hover:bg-gray-800 hover:text-white">더보기</Button>}</div></div>
    {episodes.length > 0 ? <HorizontalCarousel itemClassName="w-[292px]" ariaLabel="에피소드 목록">{episodes.map((episode) => <EpisodeCard key={episode.id} episode={episode} seasonId={seasonId} onChanged={refresh} compact />)}</HorizontalCarousel> : !loading && <p className="py-5 text-center text-body3-m text-gray-500">등록된 에피소드가 없습니다.</p>}
    {isAdmin && <EpisodeFormDialog open={createOpen} onOpenChange={setCreateOpen} seasonId={seasonId} suggestedEpisodeNumber={suggestedEpisodeNumber} onSaved={refresh} />}
  </section>;
}
