import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, Clock3, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { endWatchParty, getWatchParty, leaveWatchParty, startWatchParty } from '@/lib/api/watch-parties';
import { useWatchPartyRealtime } from '@/lib/hooks/useWatchPartyRealtime';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import type {
  WatchPartyChatMessage,
  WatchPartyPlaybackState,
  WatchPartyResponse,
} from '@/lib/types';
import ChatPanel from './components/ChatPanel';
import PlaybackPanel from './components/PlaybackPanel';

const STATUS_LABELS = {
  SCHEDULED: '예정',
  LIVE: '진행 중',
  ENDED: '종료',
} as const;

const toPlaybackState = (party: WatchPartyResponse): WatchPartyPlaybackState | null => {
  if (!party.playbackStatus || party.startedAt === null) return null;
  return {
    status: party.playbackStatus,
    startedAt: party.startedAt,
    accumulatedPauseMs: party.accumulatedPauseMs ?? 0,
    pausedAt: party.pausedAt,
    startEpisode: party.startEpisode,
    endEpisode: party.endEpisode,
    hostId: party.host.userId,
    updatedAt: Date.now(),
  };
};

export default function WatchPartyRoomPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const [party, setParty] = useState<WatchPartyResponse | null>(null);
  const [playback, setPlayback] = useState<WatchPartyPlaybackState | null>(null);
  const [messages, setMessages] = useState<WatchPartyChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const realtimePlaybackReceived = useRef(false);
  const requestSequence = useRef(0);
  const startRefreshTimer = useRef<number | null>(null);

  const loadParty = useCallback(async () => {
    if (!partyId) return;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getWatchParty(partyId);
      if (sequence !== requestSequence.current) return;
      setParty(response);
      if (!realtimePlaybackReceived.current) setPlayback(toPlaybackState(response));
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      console.error(requestError);
      setError('Watch Party 정보를 불러오지 못했습니다.');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    realtimePlaybackReceived.current = false;
    setParty(null);
    setPlayback(null);
    setMessages([]);
    void loadParty();
    return () => {
      requestSequence.current += 1;
      if (startRefreshTimer.current !== null) window.clearTimeout(startRefreshTimer.current);
    };
  }, [loadParty]);

  const handlePlayback = useCallback((state: WatchPartyPlaybackState) => {
    realtimePlaybackReceived.current = true;
    setPlayback((current) => !current || state.updatedAt >= current.updatedAt ? state : current);
  }, []);

  const handleChat = useCallback((message: WatchPartyChatMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const handleServerError = useCallback((message: string) => {
    toast.error(message || '실시간 요청을 처리하지 못했습니다.');
  }, []);

  const { connected, connecting, sendChat, controlPlayback } = useWatchPartyRealtime({
    partyId: party?.id,
    accessToken: authentication?.accessToken,
    onPlayback: handlePlayback,
    onChat: handleChat,
    onServerError: handleServerError,
  });

  const isHost = Boolean(party && authentication?.userDto.id === party.host.userId);

  const handleStart = async () => {
    if (!partyId || !isHost || statusChanging) return;
    setStatusChanging(true);
    try {
      await startWatchParty(partyId);
      setParty((current) => current ? { ...current, status: 'LIVE' } : current);
      toast.success('Watch Party를 시작했습니다.');
      startRefreshTimer.current = window.setTimeout(() => {
        startRefreshTimer.current = null;
        void loadParty();
      }, 500);
    } catch (requestError) {
      console.error(requestError);
      toast.error('Watch Party를 시작하지 못했습니다.');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleEnd = async () => {
    if (!partyId || !isHost || statusChanging) return;
    setStatusChanging(true);
    try {
      await endWatchParty(partyId);
      const now = Date.now();
      setParty((current) => current ? { ...current, status: 'ENDED', endedAt: new Date(now).toISOString() } : current);
      setPlayback((current) => current ? { ...current, status: 'ENDED', updatedAt: now } : current);
      toast.success('Watch Party를 종료했습니다.');
    } catch (requestError) {
      console.error(requestError);
      toast.error('Watch Party를 종료하지 못했습니다.');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleLeave = async () => {
    if (!partyId || isHost || leaving) return;
    setLeaving(true);
    try {
      await leaveWatchParty(partyId);
      toast.success('Watch Party에서 퇴장했습니다.');
      navigate('/watch-parties');
    } catch (requestError) {
      console.error(requestError);
      toast.error('Watch Party에서 퇴장하지 못했습니다.');
    } finally {
      setLeaving(false);
    }
  };

  if (loading && !party) {
    return <div className="flex min-h-[70vh] items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error || !party) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-8">
        <p className="text-body2-m text-gray-300">{error ?? 'Watch Party를 찾을 수 없습니다.'}</p>
        <Button variant="outline" onClick={() => void loadParty()} className="border-gray-600 text-gray-200">다시 시도</Button>
      </div>
    );
  }

  const chatDisabled = !connected || party.status === 'ENDED';

  return (
    <div className="px-8 py-8 xl:px-[50px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-pink-600/15 px-3 py-1 text-caption1-b text-pink-300">{STATUS_LABELS[party.status]}</span>
            <span className="text-body3-m text-gray-500">방장 {party.host.name}</span>
          </div>
          <h1 className="mt-3 text-header1-b text-white">{party.title}</h1>
          {party.description && <p className="mt-2 max-w-3xl text-body2-m text-gray-400">{party.description}</p>}
        </div>
        <div className="flex gap-3">
          {isHost && party.status === 'SCHEDULED' && <Button onClick={handleStart} disabled={statusChanging} className="bg-pink-600 text-white hover:bg-pink-700">{statusChanging ? '처리 중...' : '파티 시작'}</Button>}
          {isHost && party.status === 'LIVE' && <Button variant="destructive" onClick={handleEnd} disabled={statusChanging}>{statusChanging ? '처리 중...' : '파티 종료'}</Button>}
          {!isHost && party.status !== 'ENDED' && <Button variant="outline" onClick={handleLeave} disabled={leaving} className="border-gray-600 text-gray-200">{leaving ? '퇴장 중...' : '파티 퇴장'}</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(360px,1fr)_minmax(360px,1.1fr)]">
        <aside className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
            <div className="aspect-[16/9] bg-gray-800">
              {party.content.thumbnailUrl ? <img src={party.content.thumbnailUrl} alt={party.content.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-500">이미지 없음</div>}
            </div>
            <div className="space-y-4 p-6">
              <div><p className="text-caption1-m text-gray-500">함께 보는 콘텐츠</p><h2 className="mt-1 text-title2-b text-white">{party.content.title}</h2></div>
              <div className="space-y-3 text-body3-m text-gray-400">
                <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4" />{new Date(party.scheduledAt).toLocaleString('ko-KR')}</p>
                <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" />예정 시간 {party.sessionDurationMinutes}분</p>
                <p className="flex items-center gap-2"><Users className="h-4 w-4" />함께 보는 중 {party.currentParticipantCount}명 / 최대 {party.maxParticipants}명</p>
              </div>
              {party.startEpisode !== null && <p className="rounded-xl bg-gray-800 px-4 py-3 text-body3-m text-gray-300">에피소드 {party.startEpisode} ~ {party.endEpisode}</p>}
            </div>
          </section>
          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-title2-b text-white">참여 현황</h2>
            <p className="mt-3 text-body2-m text-gray-300">함께 보는 중 {party.currentParticipantCount}명</p>
            <p className="mt-2 text-caption1-m text-gray-500">참여자 상세 목록은 현재 서버에서 제공하지 않습니다.</p>
          </section>
        </aside>

        <PlaybackPanel state={playback} isHost={isHost} connected={connected} onControl={controlPlayback} />
        <ChatPanel messages={messages} currentUserId={authentication?.userDto.id} connected={connected} disabled={chatDisabled} onSend={(content) => sendChat({ content })} />
      </div>

      {connecting && <p className="mt-4 text-center text-caption1-m text-gray-500">실시간 서버에 연결하는 중입니다.</p>}
    </div>
  );
}
