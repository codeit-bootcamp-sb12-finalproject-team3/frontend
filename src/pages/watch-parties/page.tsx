import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { joinWatchParty } from '@/lib/api/watch-parties';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useWatchPartyStore from '@/lib/stores/useWatchPartyStore';
import type { WatchPartySummaryResponse } from '@/lib/types';
import CreateWatchPartyDialog from './components/CreateWatchPartyDialog';
import WatchPartyCard from './components/WatchPartyCard';
import WatchPartyFilters from './components/WatchPartyFilters';

export default function WatchPartiesPage() {
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const { data, status, cursor, loading, error, setStatus, fetch, fetchMore } = useWatchPartyStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joiningPartyId, setJoiningPartyId] = useState<string | null>(null);
  const { ref: sentinelRef, inView } = useInView({ threshold: 0, rootMargin: '120px' });

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    if (inView && cursor.hasNext && !loading) void fetchMore();
  }, [inView, cursor.hasNext, loading, fetchMore]);

  const handleJoin = async (party: WatchPartySummaryResponse) => {
    if (joiningPartyId) return;
    if (party.host.userId === authentication?.userDto.id) {
      navigate(`/watch-parties/${party.id}`);
      return;
    }

    setJoiningPartyId(party.id);
    try {
      await joinWatchParty(party.id);
      navigate(`/watch-parties/${party.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Watch Party에 참여하지 못했습니다. 참여 상태와 정원을 확인해주세요.');
    } finally {
      setJoiningPartyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 px-[70px] py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-header1-b text-white">Watch Party</h1>
          <p className="mt-2 text-body3-m text-gray-400">좋아하는 콘텐츠를 다른 사용자와 함께 즐겨보세요.</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="h-11 rounded-xl bg-pink-600 px-5 text-body3-b text-white hover:bg-pink-700">
          + 파티 만들기
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <WatchPartyFilters value={status} onChange={setStatus} />
        <span className="text-body3-m text-gray-500">총 {cursor.totalCount.toLocaleString()}개</span>
      </div>

      {error && !loading && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 py-16">
          <p className="text-body2-m text-gray-300">{error}</p>
          <Button type="button" variant="outline" onClick={() => void fetch()} className="border-gray-600 text-gray-200">다시 시도</Button>
        </div>
      )}

      {!error && data.length === 0 && loading && (
        <div className="flex min-h-72 items-center justify-center"><LoadingSpinner /></div>
      )}

      {!error && data.length === 0 && !loading && (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/30">
          <p className="text-body2-m text-gray-400">해당 상태의 Watch Party가 없습니다.</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.map((party) => (
            <WatchPartyCard key={party.id} party={party} joining={joiningPartyId === party.id} onJoin={handleJoin} />
          ))}
        </div>
      )}

      {cursor.hasNext && <div ref={sentinelRef} className="flex h-14 items-center justify-center">{loading && <LoadingSpinner />}</div>}

      <CreateWatchPartyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(party) => navigate(`/watch-parties/${party.id}`)}
      />
    </div>
  );
}
