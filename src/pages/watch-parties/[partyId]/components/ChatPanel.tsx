import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type UIEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, UserRound, UserRoundX } from 'lucide-react';
import icProfileDefault from '@/assets/ic_profile_default.svg';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  WatchPartyChatMessage,
  WatchPartyHostSummary,
  WatchPartyParticipantResponse,
} from '@/lib/types';

interface ChatPanelProps {
  messages: WatchPartyChatMessage[];
  participants: WatchPartyParticipantResponse[];
  authorsById: ReadonlyMap<string, WatchPartyHostSummary>;
  host: WatchPartyHostSummary;
  currentUserId?: string;
  isHost: boolean;
  kickingUserId: string | null;
  connected: boolean;
  disabled: boolean;
  historyLoading: boolean;
  onSend: (content: string) => boolean;
  onKick: (userId: string) => void;
}

export default function ChatPanel({
  messages,
  participants,
  authorsById,
  host,
  currentUserId,
  isHost,
  kickingUserId,
  connected,
  disabled,
  historyLoading,
  onSend,
  onKick,
}: ChatPanelProps) {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [kickTarget, setKickTarget] =
    useState<WatchPartyHostSummary | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const initialScrollCompleted = useRef(false);

  const usersById = useMemo(() => {
    const users = new Map<string, WatchPartyHostSummary>();

    users.set(host.userId, host);

    participants.forEach(({ user }) => {
      users.set(user.userId, user);
    });

    return users;
  }, [host, participants]);

  const activeParticipantIds = useMemo(
    () => new Set(participants.map(({ user }) => user.userId)),
    [participants],
  );

  useEffect(() => {
    if (historyLoading) return;

    if (!initialScrollCompleted.current) {
      initialScrollCompleted.current = true;
      endRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
      return;
    }

    if (isNearBottom.current) {
      endRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [historyLoading, messages]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    isNearBottom.current =
      element.scrollHeight -
        element.scrollTop -
        element.clientHeight <
      80;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmed = content.trim();

    if (!trimmed || trimmed.length > 500 || disabled) {
      return;
    }

    if (onSend(trimmed)) {
      setContent('');
    }
  };

  return (
    <section className="flex h-[620px] min-h-0 flex-col bg-gray-950/10 lg:h-full">
      <div className="shrink-0 border-b border-gray-800 px-6 py-4 sm:px-8">
        <div>
          <h2 className="text-title2-b text-white">
            실시간 채팅
          </h2>

          <p className="mt-1 text-caption1-m text-gray-500">
            함께 보고 있는 사람들과 대화해보세요.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-8 scrollbar-subtle"
      >
        {historyLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-body3-m text-gray-500">
            채팅 이력을 불러오는 중입니다.
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-body3-m text-gray-500">
            아직 받은 메시지가 없습니다.
          </div>
        ) : (
          messages.map((message, index) => {
            const user =
              message.sender ??
              authorsById.get(message.senderId) ??
              usersById.get(message.senderId);
            const senderIsHost =
              message.senderId === host.userId;
            const mine =
              message.senderId === currentUserId;

            const canKick =
              isHost &&
              !senderIsHost &&
              !mine &&
              Boolean(user) &&
              activeParticipantIds.has(message.senderId);

            return (
              <div
                key={`${message.sentAt}-${message.senderId}-${index}`}
                className={`flex items-start gap-3 ${mine ? 'justify-end' : ''}`}
              >
                {!mine && (user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded-full outline-none ring-pink-500 transition hover:ring-2 focus-visible:ring-2"
                        aria-label={`${user.name} 프로필 보기`}
                      >
                        <img
                          src={
                            user.profileImageUrl ||
                            icProfileDefault
                          }
                          alt=""
                          className="size-10 rounded-full object-cover"
                        />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="start"
                      sideOffset={8}
                      className="w-56 border-gray-700 bg-gray-900 p-3 text-gray-100"
                    >
                      <div className="flex items-center gap-3 px-1 py-1">
                        <img
                          src={
                            user.profileImageUrl ||
                            icProfileDefault
                          }
                          alt=""
                          className="size-11 rounded-full object-cover"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body3-b text-white">
                            {user.name}
                          </p>

                          <p className="mt-0.5 text-caption1-m text-gray-500">
                            {mine
                              ? '나'
                              : senderIsHost
                                ? '방장'
                                : '참여자'}
                          </p>
                        </div>
                      </div>

                      <DropdownMenuSeparator className="my-2 bg-gray-700" />

                      <DropdownMenuItem
                        onSelect={() => navigate(`/profiles/${user.userId}`)}
                        className="cursor-pointer text-gray-200 focus:bg-gray-800 focus:text-white"
                      >
                        <UserRound className="size-4" />
                        프로필 보기
                      </DropdownMenuItem>

                      {canKick && (
                        <DropdownMenuItem
                          disabled={
                            kickingUserId === user.userId
                          }
                          onSelect={() =>
                            setKickTarget(user)
                          }
                          className="mt-2 cursor-pointer text-red-notification"
                        >
                          <UserRoundX className="size-4" />

                          {kickingUserId === user.userId
                            ? '강퇴 중...'
                            : '강퇴하기'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <img
                    src={icProfileDefault}
                    alt=""
                    className="size-10 shrink-0 rounded-full object-cover opacity-70"
                  />
                ))}

                <div className="min-w-0 max-w-[78%]">
                  {!mine && (
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="truncate text-body3-b text-gray-200">
                        {user?.name ?? '알 수 없는 참여자'}
                      </span>

                      {senderIsHost && (
                        <Crown className="size-3.5 text-pink-400" />
                      )}
                    </div>
                  )}

                  <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`w-fit max-w-full rounded-2xl px-4 py-2.5 ${
                        mine
                          ? 'rounded-tr-md bg-pink-600/90 text-white'
                          : 'rounded-tl-md bg-gray-800 text-gray-100'
                      }`}
                    >
                      <p className="break-words text-body3-m leading-6">
                        {message.content}
                      </p>
                    </div>

                    <time className="mb-0.5 shrink-0 text-[10px] text-gray-600">
                      {new Date(
                        message.sentAt,
                      ).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 gap-3 border-t border-gray-800 bg-gray-950/70 p-4 sm:px-6"
      >
        <input
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          maxLength={500}
          disabled={disabled}
          placeholder={
            connected
              ? '메시지를 입력하세요.'
              : '실시간 연결을 기다리는 중입니다.'
          }
          className="h-11 min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-900/80 px-4 text-body3-m text-white outline-none transition focus:border-pink-600 disabled:opacity-60"
        />

        <Button
          type="submit"
          disabled={disabled || !content.trim()}
          className="h-11 bg-pink-600 px-6 text-white hover:bg-pink-700"
        >
          전송
        </Button>
      </form>

      <ConfirmDialog
        open={kickTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setKickTarget(null);
          }
        }}
        title="참여자 강퇴"
        description={`${kickTarget?.name ?? '선택한 참여자'}님을 Watch Party에서 강퇴할까요?`}
        confirmText="강퇴"
        cancelText="취소"
        variant="destructive"
        onConfirm={() => {
          if (kickTarget) {
            onKick(kickTarget.userId);
          }
        }}
      />
    </section>
  );
}
