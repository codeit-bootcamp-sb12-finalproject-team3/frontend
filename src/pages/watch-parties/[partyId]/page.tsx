import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, BellRing, CalendarClock, Clock3, Users, } from 'lucide-react';
import { toast } from 'sonner';
import icProfileDefault from '@/assets/ic_profile_default.svg';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  endWatchParty,
  getWatchParty,
  getWatchPartyChatMessages,
  getWatchPartyJoinErrorMessage,
  getWatchPartyParticipants,
  joinWatchParty,
  kickWatchPartyParticipant,
  leaveWatchParty,
  startWatchParty,
} from '@/lib/api/watch-parties';
import { useWatchPartyRealtime } from '@/lib/hooks/useWatchPartyRealtime';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useWatchPartyReminderStore from '@/lib/stores/useWatchPartyReminderStore';
import type {
  WatchPartyChatMessage,
  WatchPartyHostSummary,
  WatchPartyParticipantChangedMessage,
  WatchPartyParticipantResponse,
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
    // REST 스냅샷은 순서 비교 기준이 없으므로 0 → 이후 실시간(서버 시각) 메시지가 항상 덮어씀
    updatedAt: 0,
  };
};

const chatMessageKey = (message: WatchPartyChatMessage) =>
  `${message.senderId}\u0000${message.sentAt}\u0000${message.content}`;

const mergeChatMessages = (
  current: WatchPartyChatMessage[],
  incoming: WatchPartyChatMessage[],
) => {
  const unique = new Map(current.map((message) => [chatMessageKey(message), message]));
  incoming.forEach((message) => {
    const key = chatMessageKey(message);
    const existing = unique.get(key);
    unique.set(key, {
      ...existing,
      ...message,
      sender: message.sender ?? existing?.sender,
    });
  });
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
  const [authorsById, setAuthorsById] = useState<ReadonlyMap<string, WatchPartyHostSummary>>(
    () => new Map(),
  );
  const authorsByIdRef = useRef<ReadonlyMap<string, WatchPartyHostSummary>>(new Map());
  const [roomReady, setRoomReady] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomAttempt, setRoomAttempt] = useState(0);
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
  const roomRequestSequence = useRef(0);

  const rememberAuthors = useCallback((users: Array<WatchPartyHostSummary | null | undefined>) => {
    const validUsers = users.filter((user): user is WatchPartyHostSummary => Boolean(user));
    if (validUsers.length === 0) return;

    setAuthorsById((current) => {
      const next = new Map(current);
      validUsers.forEach((user) => next.set(user.userId, user));
      authorsByIdRef.current = next;
      return next;
    });
  }, []);

  const loadParty = useCallback(async () => {
    if (!partyId) return;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getWatchParty(partyId);
      if (sequence !== requestSequence.current) return;
      setParty(response);
      rememberAuthors([response.host]);
      if (!realtimePlaybackReceived.current) setPlayback(toPlaybackState(response));
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      console.error(requestError);
      setError('Watch Party 정보를 불러오지 못했습니다.');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [partyId, rememberAuthors]);

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
      rememberAuthors(normalized.map((message) => message.sender));
      setMessages((current) => mergeChatMessages(current, normalized));
    } catch (requestError) {
      if (sequence !== historyRequestSequence.current) return;
      console.error(requestError);
      toast.error('기존 채팅 이력을 불러오지 못했습니다. 실시간 채팅은 계속 사용할 수 있습니다.');
    } finally {
      if (sequence === historyRequestSequence.current) setHistoryLoading(false);
    }
  }, [partyId, rememberAuthors]);

  const loadParticipants = useCallback(async () => {
    if (!partyId) return;
    const sequence = ++participantsRequestSequence.current;
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const response = await getWatchPartyParticipants(partyId);
      if (sequence !== participantsRequestSequence.current) return;
      setParticipants(response);
      rememberAuthors(response.map(({ user }) => user));
    } catch (requestError) {
      if (sequence !== participantsRequestSequence.current) return;
      console.error(requestError);
      setParticipantsError('참여자 목록을 불러오지 못했습니다.');
    } finally {
      if (sequence === participantsRequestSequence.current) setParticipantsLoading(false);
    }
  }, [partyId, rememberAuthors]);

  useEffect(() => {
    hasLeft.current = false;
    blockedNavigationInProgress.current = false;
    realtimePlaybackReceived.current = false;
    roomRequestSequence.current += 1;
    setRoomReady(false);
    setRoomError(null);
    setParty(null);
    setPlayback(null);
    setMessages([]);
    setParticipants([]);
    authorsByIdRef.current = new Map();
    setAuthorsById(new Map());
    void loadParty();
    return () => {
      requestSequence.current += 1;
      historyRequestSequence.current += 1;
      participantsRequestSequence.current += 1;
      roomRequestSequence.current += 1;
      if (startRefreshTimer.current !== null) window.clearTimeout(startRefreshTimer.current);
    };
  }, [loadParty]);

  // 입장 로직은 "어느 파티인지"가 바뀔 때만 다시 돌도록, party 객체 대신 필요한 값만 꺼내 둔다
  const loadedPartyId = party?.id;
  const hostUserId = party?.host.userId;
  const partyEndedRef = useRef(false);
  partyEndedRef.current = party?.status === 'ENDED';

  useEffect(() => {
    const currentUserId = authentication?.userDto.id;
    if (!partyId || loadedPartyId !== partyId || !hostUserId || !currentUserId) return;

    const sequence = ++roomRequestSequence.current;
    setRoomReady(false);
    setRoomError(null);

    const prepareRoom = async () => {
      try {
        // 종료된 방은 참가 요청 없이 보기만 (서버가 409로 거절함)
        if (currentUserId !== hostUserId && !partyEndedRef.current) {
          await joinWatchParty(partyId);
        }
        if (sequence !== roomRequestSequence.current) return;

        hasLeft.current = false;
        setRoomReady(true);
        void loadChatHistory();
        void loadParticipants();
      } catch (requestError) {
        if (sequence !== roomRequestSequence.current) return;
        console.error(requestError);
        setRoomReady(false);
        setRoomError(getWatchPartyJoinErrorMessage(requestError));
      }
    };

    void prepareRoom();
    return () => {
      roomRequestSequence.current += 1;
    };
  }, [authentication?.userDto.id, loadChatHistory, loadParticipants, loadedPartyId, hostUserId, partyId, roomAttempt]);
  useEffect(() => {
    const currentUserId = authentication?.userDto.id;
    if (currentUserId) void fetchReminders(currentUserId);
  }, [authentication?.userDto.id, fetchReminders]);

  const handlePlayback = useCallback((state: WatchPartyPlaybackState) => {
    realtimePlaybackReceived.current = true;
    setPlayback((current) => !current || state.updatedAt >= current.updatedAt ? state : current);
    setParty((current) => {
      if (!current || current.status === 'ENDED') return current;
      const nextStatus = state.status === 'ENDED' ? 'ENDED' : 'LIVE';
      return current.status === nextStatus ? current : { ...current, status: nextStatus };
    });
  }, []);

  const handleChat = useCallback((message: WatchPartyChatMessage) => {
    const sender = message.sender ?? authorsByIdRef.current.get(message.senderId);
    if (sender) rememberAuthors([sender]);
    setMessages((current) => mergeChatMessages(current, [{ ...message, sender }]));
  }, [rememberAuthors]);

  const handleParticipantChanged = useCallback((message: WatchPartyParticipantChangedMessage) => {
    const currentUserId = useAuthStore.getState().data?.userDto.id;
    if (message.userId === currentUserId && message.status === 'KICKED') {
      setRoomReady(false);
      hasLeft.current = true;
      toast.error('Watch Party에서 강퇴되었습니다.');
      navigate('/watch-parties', { replace: true });
      return;
    }
    if (message.userId === currentUserId && message.status === 'LEFT') {
      setRoomReady(false);
      if (leaveRequest.current || hasLeft.current || blockedNavigationInProgress.current) return;

      hasLeft.current = true;
      toast.info('Watch Party 참여가 종료되었습니다.');
      navigate('/watch-parties', { replace: true });
      return;
    }
    void loadParticipants();
  }, [loadParticipants, navigate]);

  const handleServerError = useCallback((message: string) => {
    toast.error(message || '실시간 요청을 처리하지 못했습니다.');
  }, []);

  const { connected, connecting, sendChat, controlPlayback } = useWatchPartyRealtime({
    partyId: roomReady ? party?.id : undefined,
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
        setRoomReady(false);
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
      && roomReady
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
      // 타이머의 종료 시점은 서버가 보내는 ENDED 메시지(서버 시계)로 갱신
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
      if (navigationBlocker.state === 'blocked') {
        navigationBlocker.proceed();
      } else {
        navigate('/watch-parties');
      }
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

  if ((loading && !party) || (party && !roomReady && !roomError)) {
    return <div className="flex min-h-[70vh] items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error || roomError || !party) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-8">
        <p className="text-body2-m text-gray-300">{error ?? roomError ?? 'Watch Party를 찾을 수 없습니다.'}</p>
        <Button
          variant="outline"
          onClick={() => {
            if (roomError) setRoomAttempt((current) => current + 1);
            else void loadParty();
          }}
          className="border-gray-600 text-gray-200"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  const chatDisabled = !connected || party.status === 'ENDED';
  // 참여자 목록·서버 인원 모두 게스트만 셈(방장은 참여자로 저장 안 됨) → 방장 1명을 더해 표시
  const guestCount = participantsError || (participantsLoading && participants.length === 0)
    ? party.currentParticipantCount
    : participants.length;
  const participantCount = guestCount + 1;
  const reminderRegistered = scheduledPartyIds.has(party.id);
  const reminderMutating = reminderMutatingPartyIds.has(party.id);

  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col bg-gray-950 lg:h-[calc(100dvh-80px)] lg:overflow-hidden">
      <header className="shrink-0 border-b border-gray-800 px-5 py-4 sm:px-8 xl:px-[50px]">
        <button type="button" onClick={() => navigate('/watch-parties')} className="mb-3 flex items-center gap-2 text-body3-m text-gray-400 transition-colors hover:text-white">
          <ArrowLeft className="size-4" />
          Watch Party 목록
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-pink-600/15 px-3 py-1 text-caption1-b text-pink-300">{STATUS_LABELS[party.status]}</span>
              <span className="truncate text-body3-m text-gray-500">{party.content.title}</span>
            </div>
            <h1 className="mt-2 truncate text-title1-b text-white sm:text-header2-b">{party.title}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2 border-r border-gray-800 pr-3">
              <img src={party.host.profileImageUrl || icProfileDefault} alt="" className="size-9 rounded-full object-cover" />
              <div className="hidden sm:block">
                <p className="text-caption1-m text-gray-500">방장</p>
                <p className="max-w-28 truncate text-body3-b text-gray-100">{party.host.name}</p>
              </div>
            </div>
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
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(400px,40%)_minmax(0,60%)] lg:overflow-hidden">
        <section className="flex flex-col items-center overflow-y-auto px-6 py-8 sm:px-10 lg:px-8 xl:px-12">
          <div className="w-full max-w-[330px] overflow-hidden rounded-2xl bg-gray-900 shadow-2xl shadow-black/30">
            <div className="aspect-[4/3]">
              {party.content.thumbnailUrl ? <img src={party.content.thumbnailUrl} alt={party.content.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-body3-m text-gray-500">이미지 없음</div>}
            </div>
          </div>
          <p className="mt-5 max-w-full truncate text-center text-body1-b text-gray-100">{party.content.title}</p>

          <div className="mt-7 w-full max-w-xl">
          <PlaybackPanel state={playback} isHost={isHost} connected={connected} onControl={controlPlayback} />
          </div>

          <div className="mt-8 w-full max-w-xl border-t border-gray-800 pt-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-10 items-center justify-center rounded-full bg-gray-900 text-gray-300">
                <Users className="size-5" />
              </span>

              <div className="min-w-0">
                <p className="text-body3-m text-gray-500">
                  함께 보는 중
                </p>

                <p className="mt-1 flex items-baseline gap-1 text-white">
                  <span className="text-[30px] font-bold leading-none tracking-tight">
                    {participantCount.toLocaleString('ko-KR')}
                  </span>
                  <span className="text-body2-b text-gray-300">명 참여 중</span>
                </p>
              </div>
            </div>

            {participantsError && (
              <button
                type="button"
                onClick={() => void loadParticipants()}
                className="mt-3 text-caption1-b text-pink-300 hover:text-pink-200"
              >
                참여자 정보를 다시 불러오기
              </button>
            )}
          </div>

          <div className="mt-8 w-full max-w-xl border-t border-gray-800 pt-5 text-body3-m text-gray-500">
            {party.description && <p className="mb-4 leading-6">{party.description}</p>}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <span className="flex items-center gap-2"><CalendarClock className="size-4" />{new Date(party.scheduledAt).toLocaleString('ko-KR')}</span>
              <span className="flex items-center gap-2"><Clock3 className="size-4" />예정 시간 {party.sessionDurationMinutes}분</span>
              {party.startEpisode !== null && <span>에피소드 {party.startEpisode} ~ {party.endEpisode}</span>}
            </div>
            {connecting && <p className="mt-3 text-caption1-m text-gray-500">실시간 서버에 연결하는 중입니다.</p>}
          </div>
        </section>

        <section className="min-h-0 border-t border-gray-800 lg:border-l lg:border-t-0">
          <ChatPanel
            key={party.id}
            messages={messages}
            participants={participants}
            authorsById={authorsById}
            host={party.host}
            currentUserId={authentication?.userDto.id}
            isHost={isHost}
            kickingUserId={kickingUserId}
            connected={connected}
            disabled={chatDisabled}
            historyLoading={historyLoading}
            onSend={(content) => sendChat({ content })}
            onKick={(userId) => void handleKick(userId)}
          />
        </section>
      </main>
    </div>
  );
}
