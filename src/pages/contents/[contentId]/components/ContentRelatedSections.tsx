import { useEffect, useMemo, useState } from 'react';
import { ListPlus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { ContentPlatformResponse, ContentResponse, PlaylistSummary, WatchPartyResponse, WatchPartySummaryResponse } from '@/lib/types';
import { getContentPlatforms, getContentPlaylists, getContentWatchParties } from '@/lib/api/contents';
import { getWatchPartyJoinErrorMessage, joinWatchParty } from '@/lib/api/watch-parties';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import HorizontalCarousel from '@/pages/recommendations/components/HorizontalCarousel';
import PlaylistCard from '@/pages/playlists/components/PlaylistCard';
import WatchPartyCard from '@/pages/watch-parties/components/WatchPartyCard';
import AddToPlaylistDialog from './AddToPlaylistDialog';
import CreateWatchPartyDialog from '@/pages/watch-parties/components/CreateWatchPartyDialog';

interface ContentRelatedSectionsProps { content: ContentResponse; }

export default function ContentRelatedSections({ content }: ContentRelatedSectionsProps) {
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const [platforms, setPlatforms] = useState<ContentPlatformResponse | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [parties, setParties] = useState<WatchPartySummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [joiningPartyId, setJoiningPartyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([getContentPlatforms(content.id), getContentPlaylists(content.id), getContentWatchParties(content.id)])
      .then(([platformResult, playlistResult, partyResult]) => {
        if (cancelled) return;
        setPlatforms(platformResult.status === 'fulfilled' ? platformResult.value : null);
        setPlaylists(playlistResult.status === 'fulfilled' ? playlistResult.value.data.slice(0, 20) : []);
        setParties(partyResult.status === 'fulfilled' ? partyResult.value.data.slice(0, 20) : []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [content.id, content.updatedAt]);

  const initialPartyContent = useMemo(() => ({
    id: content.id, parentContentId: content.tvSeason?.parentContentId ?? null, title: content.title, description: content.description,
    type: content.type, seasonNumber: content.tvSeason?.seasonNumber ?? null,
    episodeCount: content.tvSeason?.episodeCount ?? null, sportType: content.sport?.sportType.code ?? null,
    league: content.sport?.league ?? null, homeTeam: content.sport?.homeTeam ?? null,
    awayTeam: content.sport?.awayTeam ?? null, thumbnailUrl: content.thumbnailUrl,
    releaseDate: content.releaseDate, runtime: content.movie?.runtime ?? null,
    averageRating: content.averageRating, reviewCount: content.reviewCount, likeCount: content.likeCount,
    likedByMe: false, genres: content.genres, tags: content.tags,
  }), [content]);

  const openParty = async (party: WatchPartySummaryResponse) => {
    if (joiningPartyId) return;
    if (party.host.userId === authentication?.userDto.id) return navigate(`/watch-parties/${party.id}`);
    setJoiningPartyId(party.id);
    try {
      await joinWatchParty(party.id);
      navigate(`/watch-parties/${party.id}`);
    } catch {
      toast.error('Watch Party에 참여하지 못했습니다.');
    } finally {
      setJoiningPartyId(null);
    }
  };

  const refreshPlaylists = async () => {
    try {
      const response = await getContentPlaylists(content.id);
      setPlaylists(response.data.slice(0, 20));
    } catch (error) {
      toast.error(getWatchPartyJoinErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-white/[0.08] bg-gray-950/70 p-6">
        <div className="mb-5 flex flex-wrap items-baseline gap-2"><h2 className="text-title1-b text-white">시청 가능한 플랫폼</h2><p className="text-body3-m text-gray-500">대한민국 제공 서비스</p></div>
        {platforms?.otts.length ? (
          <HorizontalCarousel itemClassName="w-[210px]" ariaLabel="시청 가능한 플랫폼">
            {platforms.otts.map((platform) => (
              <a key={platform.platformId} href={platform.url} target="_blank" rel="noreferrer" className="flex h-[68px] items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/70 p-3 transition hover:border-pink-500/40">
                {platform.logoUrl ? <img src={platform.logoUrl} alt="" className="size-11 rounded-xl object-cover" /> : <div className="size-11 rounded-xl bg-gray-800" />}
                <span className="truncate text-body3-sb text-gray-100">{platform.name}</span>
              </a>
            ))}
          </HorizontalCarousel>
        ) : !loading && <EmptyMessage>현재 제공 중인 플랫폼이 없습니다.</EmptyMessage>}
        {platforms?.justWatchAttributionRequired && <p className="mt-4 text-caption1-m text-gray-600">스트리밍 제공 정보 출처: <a href="https://www.justwatch.com/kr" target="_blank" rel="noreferrer" className="text-gray-400 underline underline-offset-2">JustWatch</a></p>}
      </section>

      <section className="rounded-[24px] border border-white/[0.08] bg-gray-950/70 p-6">
        <SectionHeader title="플레이리스트" description="주간 인기순으로 보여드려요." primaryLabel="플레이리스트에 추가" onPrimary={() => setPlaylistDialogOpen(true)} onMore={() => navigate(`/playlists?contentIdEqual=${content.id}`)} primaryIcon={<ListPlus className="size-4" />} />
        {playlists.length ? <HorizontalCarousel itemClassName="w-[min(430px,78vw)]" ariaLabel="이 콘텐츠가 담긴 플레이리스트">{playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</HorizontalCarousel> : !loading && <EmptyMessage>아직 이 콘텐츠가 담긴 플레이리스트가 없습니다.</EmptyMessage>}
      </section>

      <section className="rounded-[24px] border border-white/[0.08] bg-gray-950/70 p-6">
        <SectionHeader title="Watch Party" primaryLabel="Watch Party 만들기" onPrimary={() => setPartyDialogOpen(true)} onMore={() => navigate(`/watch-parties?contentIdEqual=${content.id}`)} primaryIcon={<Plus className="size-4" />} />
        {parties.length ? <HorizontalCarousel itemClassName="w-[300px]" ariaLabel="이 콘텐츠의 Watch Party">{parties.map((party) => <WatchPartyCard key={party.id} party={party} joining={joiningPartyId === party.id} onJoin={openParty} />)}</HorizontalCarousel> : !loading && <EmptyMessage>예정된 Watch Party가 없습니다.</EmptyMessage>}
      </section>

      <AddToPlaylistDialog open={playlistDialogOpen} onOpenChange={setPlaylistDialogOpen} contentId={content.id} onAdded={refreshPlaylists} />
      <CreateWatchPartyDialog open={partyDialogOpen} onOpenChange={setPartyDialogOpen} initialContent={initialPartyContent} onCreated={(party: WatchPartyResponse) => navigate(`/watch-parties/${party.id}`)} />
    </div>
  );
}

function SectionHeader({ title, description, primaryLabel, primaryIcon, onPrimary, onMore }: { title: string; description?: string; primaryLabel: string; primaryIcon: React.ReactNode; onPrimary: () => void; onMore: () => void }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-baseline gap-2"><h2 className="text-title1-b text-white">{title}</h2>{description && <p className="text-body3-m text-gray-500">{description}</p>}</div><div className="flex gap-2"><Button type="button" onClick={onPrimary} className="h-10 rounded-xl bg-pink-600 px-4 text-body3-b text-white hover:bg-pink-700">{primaryIcon}{primaryLabel}</Button><Button type="button" variant="outline" onClick={onMore} className="h-10 rounded-xl border-gray-700 bg-transparent px-4 text-body3-b text-gray-200 hover:bg-gray-800 hover:text-white">더보기</Button></div></div>;
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-body3-m text-gray-500">{children}</p>;
}
