import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { Bell, BellRing, CalendarClock, Clock3, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  endWatchParty,
  getWatchParty,
  getWatchPartyChatMessages,
  getWatchPartyParticipants,
  kickWatchPartyParticipant,
  leaveWatchParty,
  startWatchParty,
} from '@/lib/api/watch-parties';
import { useWatchPartyRealtime } from '@/lib/hooks/useWatchPartyRealtime';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useWatchPartyReminderStore from '@/lib/stores/useWatchPartyReminderStore';
import type {
  WatchPartyChatMessage,
  WatchPartyParticipantChangedMessage,
  WatchPartyParticipantResponse,
  WatchPartyPlaybackState,
  WatchPartyResponse,
} from '@/lib/types';
import ChatPanel from './components/ChatPanel';
import PlaybackPanel from './components/PlaybackPanel';
import ParticipantPanel from './components/ParticipantPanel';

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

const chatMessageKey = (message: WatchPartyChatMessage) =>
  `${message.senderId}\u0000${message.sentAt}\u0000${message.content}`;

const mergeChatMessages = (
  current: WatchPartyChatMessage[],
  incoming: WatchPartyChatMessage[],
) => {
  const unique = new Map(current.map((message) => [chatMessageKey(message), message]));
  incoming.forEach((message) => unique.set(chatMessageKey(message), message));
  return [...unique.values()].sort((left, right) => left.sentAt - right.sentAt);
};

export default function WatchPartyRoomPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const authentication = useAuthStore((state) => state.data);
  const scheduledPartyIds = useWatchPartyReminderStore((state) => state.scheduledPartyIds);
  const reminderLoaded = useWatchPartyReminderStore((state) => state.loaded);
  const reminderLoading = useWatchPartyReminderStore((state) => state.loading);
  const reminderMutatingPartyIds = useWatchPartyReminderStore((state) => state.mutatingPartyIds);
  const fetchReminders = useWatchPartyReminderStore((state) => state.fetch);
  const setReminder = useWatchPartyReminderStore((state) => state.setReminder);
  const cancelReminder = useWatchPartyReminderStore((state) => state.cancelReminder);
  const [party, setParty] = useState<WatchPartyResponse | null>(null);
  const [playback, setPlayback] = useState<WatchPartyPlaybackState | null>(null);
  const [messages, setMessages] = useState<WatchPartyChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [participants, setParticipants] = useState<WatchPartyParticipantResponse[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leaveRequest = useRef<Promise<void> | null>(null);
  const hasLeft = useRef(false);
  const blockedNavigationInProgress = useRef(false);
  const realtimePlaybackReceived = useRef(false);
  const requestSequence = useRef(0);
  const historyRequestSequence = useRef(0);
  const participantsRequestSequence = useRef(0);
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

  const loadChatHistory = useCallback(async () => {
    if (!partyId) return;
    const sequence = ++historyRequestSequence.current;
    setHistoryLoading(true);
    try {
      const history = await getWatchPartyChatMessages(partyId, 50);
      if (sequence !== historyRequestSequence.current) return;
      const normalized = history.flatMap<WatchPartyChatMessage>((message) => {
        if (!message.sentAt) return [];
        const sentAt = Date.parse(message.sentAt);
        return Number.isFinite(sentAt) ? [{ ...message, sentAt }] : [];
      });
      setMessages((current) => mergeChatMessages(current, normalized));
    } catch (requestError) {
      if (sequence !== historyRequestSequence.current) return;
      console.error(requestError);
      toast.error('기존 채팅 이력을 불러오지 못했습니다. 실시간 채팅은 계속 사용할 수 있습니다.');
    } finally {
      if (sequence === historyRequestSequence.current) setHistoryLoading(false);
    }
  }, [partyId]);

  const loadParticipants = useCallback(async () => {
    if (!partyId) return;
    const sequence = ++participantsRequestSequence.current;
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const response = await getWatchPartyParticipants(partyId);
      if (sequence !== participantsRequestSequence.current) return;
      setParticipants(response);
    } catch (requestError) {
      if (sequence !== participantsRequestSequence.current) return;
      console.error(requestError);
      setParticipantsError('참여자 목록을 불러오지 못했습니다.');
    } finally {
      if (sequence === participantsRequestSequence.current) setParticipantsLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    hasLeft.current = false;
    blockedNavigationInProgress.current = false;
    realtimePlaybackReceived.current = false;
    setParty(null);
    setPlayback(null);
    setMessages([]);
    setParticipants([]);
    void loadParty();
    void loadChatHistory();
    void loadParticipants();
    return () => {
      requestSequence.current += 1;
      historyRequestSequence.current += 1;
      participantsRequestSequence.current += 1;
      if (startRefreshTimer.current !== null) window.clearTimeout(startRefreshTimer.current);
    };
  }, [loadChatHistory, loadParticipants, loadParty]);

  useEffect(() => {
    const currentUserId = authentication?.userDto.id;
    if (currentUserId) void fetchReminders(currentUserId);
  }, [authentication?.userDto.id, fetchReminders]);

  const handlePlayback = useCallback((state: WatchPartyPlaybackState) => {
    realtimePlaybackReceived.current = true;
    setPlayback((current) => !current || state.updatedAt >= current.updatedAt ? state : current);
  }, []);

  const handleChat = useCallback((message: WatchPartyChatMessage) => {
    setMessages((current) => mergeChatMessages(current, [message]));
  }, []);

  const handleParticipantChanged = useCallback((message: WatchPartyParticipantChangedMessage) => {
    const currentUserId = useAuthStore.getState().data?.userDto.id;
    if (message.status === 'KICKED' && message.userId === currentUserId) {
      hasLeft.current = true;
      toast.error('Watch Party에서 강퇴되었습니다.');
      navigate('/watch-parties', { replace: true });
      return;
    }
    void loadParticipants();
  }, [loadParticipants, navigate]);

  const handleServerError = useCallback((message: string) => {
    toast.error(message || '실시간 요청을 처리하지 못했습니다.');
  }, []);

  const { connected, connecting, sendChat, controlPlayback } = useWatchPartyRealtime({
    partyId: party?.id,
    accessToken: authentication?.accessToken,
    onPlayback: handlePlayback,
    onChat: handleChat,
    onParticipantChanged: handleParticipantChanged,
    onServerError: handleServerError,
  });

  const isHost = Boolean(party && authentication?.userDto.id === party.host.userId);

  const leaveParty = useCallback(() => {
    if (!partyId || isHost || hasLeft.current) return Promise.resolve();
    if (leaveRequest.current) return leaveRequest.current;

    setLeaving(true);
    const request = leaveWatchParty(partyId)
      .then(() => {
        hasLeft.current = true;
      })
      .finally(() => {
        leaveRequest.current = null;
        setLeaving(false);
      });
    leaveRequest.current = request;
    return request;
  }, [isHost, partyId]);

  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) =>
    Boolean(
      party
      && !isHost
      && !hasLeft.current
      && currentLocation.pathname !== nextLocation.pathname,
    ),
  );

  useEffect(() => {
    if (navigationBlocker.state !== 'blocked' || blockedNavigationInProgress.current) return;
    blockedNavigationInProgress.current = true;

    void leaveParty()
      .then(() => navigationBlocker.proceed())
      .catch((requestError) => {
        blockedNavigationInProgress.current = false;
        console.error(requestError);
        toast.error('Watch Party에서 퇴장하지 못했습니다. 다시 시도해주세요.');
        navigationBlocker.reset();
      });
  }, [leaveParty, navigationBlocker]);

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
    try {
      await leaveParty();
      toast.success('Watch Party에서 퇴장했습니다.');
      navigate('/watch-parties');
    } catch (requestError) {
      console.error(requestError);
      toast.error('Watch Party에서 퇴장하지 못했습니다.');
    }
  };

  const handleKick = async (userId: string) => {
    if (!partyId || !isHost || userId === authentication?.userDto.id || kickingUserId) return;
    setKickingUserId(userId);
    try {
      await kickWatchPartyParticipant(partyId, userId);
      await loadParticipants();
      toast.success('참여자를 강퇴했습니다.');
    } catch (requestError) {
      console.error(requestError);
      toast.error('참여자를 강퇴하지 못했습니다.');
    } finally {
      setKickingUserId(null);
    }
  };

  const handleReminder = async () => {
    const currentUserId = authentication?.userDto.id;
    if (!partyId || !currentUserId || isHost || party?.status !== 'SCHEDULED') return;
    const registered = scheduledPartyIds.has(partyId);
    try {
      if (registered) {
        await cancelReminder(currentUserId, partyId);
        toast.success('Watch Party 알림을 해제했습니다.');
      } else {
        await setReminder(currentUserId, partyId);
        toast.success('Watch Party 알림을 등록했습니다.');
      }
    } catch (requestError) {
      console.error(requestError);
      toast.error(registered ? '알림을 해제하지 못했습니다.' : '알림을 등록하지 못했습니다.');
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
  const participantCount = participantsError || (participantsLoading && participants.length === 0)
    ? party.currentParticipantCount
    : participants.length;
  const reminderRegistered = scheduledPartyIds.has(party.id);
  const reminderMutating = reminderMutatingPartyIds.has(party.id);

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
          {!isHost && party.status === 'SCHEDULED' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleReminder()}
              disabled={reminderLoading || !reminderLoaded || reminderMutating}
              className="gap-2 border-gray-600 text-gray-200"
            >
              {reminderRegistered ? <BellRing className="size-4" /> : <Bell className="size-4" />}
              {reminderMutating ? '처리 중...' : reminderRegistered ? '알림 받는 중' : '알림 받기'}
            </Button>
          )}
          {isHost && party.status === 'SCHEDULED' && <Button onClick={handleStart} disabled={statusChanging} className="bg-pink-600 text-white hover:bg-pink-700">{statusChanging ? '처리 중...' : '파티 시작'}</Button>}
          {isHost && party.status === 'LIVE' && <Button variant="destructive" onClick={handleEnd} disabled={statusChanging}>{statusChanging ? '처리 중...' : '파티 종료'}</Button>}
          {!isHost && party.status !== 'ENDED' && <Button variant="outline" onClick={handleLeave} disabled={leaving} className="border-gray-600 text-gray-200">{leaving ? '퇴장 중...' : '파티 퇴장'}</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(360px,1fr)_minmax(360px,1.1fr)]">
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
                <p className="flex items-center gap-2"><Users className="h-4 w-4" />함께 보는 중 {participantCount}명 / 최대 {party.maxParticipants}명</p>
              </div>
              {party.startEpisode !== null && <p className="rounded-xl bg-gray-800 px-4 py-3 text-body3-m text-gray-300">에피소드 {party.startEpisode} ~ {party.endEpisode}</p>}
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <PlaybackPanel state={playback} isHost={isHost} connected={connected} onControl={controlPlayback} />
          <ParticipantPanel
            host={party.host}
            participants={participants}
            currentUserId={authentication?.userDto.id}
            isHost={isHost}
            loading={participantsLoading}
            error={participantsError}
            kickingUserId={kickingUserId}
            onRetry={() => void loadParticipants()}
            onKick={(userId) => void handleKick(userId)}
          />
        </div>
        <ChatPanel
          key={party.id}
          messages={messages}
          currentUserId={authentication?.userDto.id}
          connected={connected}
          disabled={chatDisabled}
          historyLoading={historyLoading}
          onSend={(content) => sendChat({ content })}
        />
      </div>

      {connecting && <p className="mt-4 text-center text-caption1-m text-gray-500">실시간 서버에 연결하는 중입니다.</p>}
    </div>
  );
}
