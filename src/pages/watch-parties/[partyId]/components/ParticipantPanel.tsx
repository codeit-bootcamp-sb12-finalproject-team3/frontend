import { useState } from 'react';
import { ChevronRight, Crown, Search, UserRoundX } from 'lucide-react';
import icProfileDefault from '@/assets/ic_profile_default.svg';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WatchPartyHostSummary, WatchPartyParticipantResponse } from '@/lib/types';

// 방 화면에 미리 보여 줄 게스트 수. 방장 1 + 게스트 9 = 10칸(5열 × 2줄)
const PREVIEW_GUEST_COUNT = 9;

interface ParticipantPanelProps {
  host: WatchPartyHostSummary;
  participants: WatchPartyParticipantResponse[];
  participantCount: number;
  participantLabel: string;
  currentUserId?: string;
  isHost: boolean;
  loading: boolean;
  error: string | null;
  kickingUserId: string | null;
  onRetry: () => void;
  onKick: (userId: string) => void;
}

interface ParticipantAvatarProps {
  user: WatchPartyHostSummary;
  host: boolean;
  current: boolean;
  canKick: boolean;
  kicking: boolean;
  onKick?: () => void;
}

function ParticipantAvatar({ user, host, current, canKick, kicking, onKick }: ParticipantAvatarProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="group flex w-full min-w-0 flex-col items-center gap-1.5 text-center outline-none" aria-label={`${user.name} 프로필 보기`}>
          <span className={`relative block size-10 rounded-full border-2 p-0.5 transition-colors ${host ? 'border-pink-500' : 'border-gray-700 group-hover:border-gray-500 group-data-[state=open]:border-pink-500'}`}>
            <img src={user.profileImageUrl || icProfileDefault} alt="" className="h-full w-full rounded-full object-cover" />
            {host && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-pink-600 text-white"><Crown className="size-3" /></span>}
          </span>
          <span className="w-full truncate text-caption1-m text-gray-400">{current ? '나' : user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={10} className="w-56 border-gray-700 bg-gray-900 p-3 text-gray-100 shadow-xl">
        <div className="flex items-center gap-3 px-1 py-1">
          <img src={user.profileImageUrl || icProfileDefault} alt="" className="size-11 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body3-b text-white">{user.name}</p>
            {host && <p className="mt-0.5 flex items-center gap-1 text-caption1-b text-pink-300"><Crown className="size-3" />HOST</p>}
          </div>
        </div>
        {canKick && (
          <DropdownMenuItem disabled={kicking} onSelect={onKick} className="mt-2 cursor-pointer text-red-notification focus:bg-red-notification/10 focus:text-red-notification">
            <UserRoundX className="size-4" />
            {kicking ? '강퇴 중...' : '강퇴하기'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ParticipantPanel({ host, participants, participantCount, participantLabel, currentUserId, isHost, loading, error, kickingUserId, onRetry, onKick }: ParticipantPanelProps) {
  const [kickTarget, setKickTarget] = useState<WatchPartyParticipantResponse | null>(null);
  // 게스트 본인은 맨 앞으로 당겨서, 미리보기 10칸 안에 "나"가 항상 보이게 한다
  const previewGuests = [...participants]
    .sort((a, b) => Number(b.user.userId === currentUserId) - Number(a.user.userId === currentUserId))
    .slice(0, PREVIEW_GUEST_COUNT);

  // [전체 보기] 모달: 열림 여부와 이름 검색어
  const [listOpen, setListOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const trimmedKeyword = keyword.trim();
  const filteredGuests = trimmedKeyword
    ? participants.filter(({ user }) => user.name.includes(trimmedKeyword))
    : participants;

  return (
    <section className="w-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body2-b text-white">{participantCount.toLocaleString('ko-KR')}{participantLabel}</h2>
        <div className="flex items-center gap-3">
          {loading && <span className="text-caption1-m text-gray-500">업데이트 중</span>}
          {participants.length > PREVIEW_GUEST_COUNT && (
            <button type="button" onClick={() => setListOpen(true)} className="flex items-center gap-0.5 text-caption1-b text-pink-300 hover:text-pink-200">
              전체 보기<ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {error && participants.length === 0 ? (
        <div className="py-5 text-center">
          <p className="text-body3-m text-gray-500">{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-body3-b text-pink-300 hover:text-pink-200">다시 시도</button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-5 gap-x-2 gap-y-3">
          <ParticipantAvatar user={host} host current={host.userId === currentUserId} canKick={false} kicking={false} />
          {previewGuests.map((participant) => {
            const user = participant.user;
            return (
              <ParticipantAvatar
                key={user.userId}
                user={user}
                host={false}
                current={user.userId === currentUserId}
                canKick={isHost && user.userId !== currentUserId}
                kicking={kickingUserId === user.userId}
                onKick={() => setKickTarget(participant)}
              />
            );
          })}
        </div>
      )}

      <Dialog open={listOpen} onOpenChange={(open) => { setListOpen(open); if (!open) setKeyword(''); }}>
        <DialogContent className="flex max-h-[80vh] max-w-md flex-col border-gray-700 bg-gray-900 text-gray-100">
          <DialogTitle className="text-body1-b text-white">참여자 목록</DialogTitle>
          <DialogDescription className="text-body3-m text-gray-400">
            방장 포함 {(participants.length + 1).toLocaleString('ko-KR')}명
          </DialogDescription>

          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="이름으로 찾기"
              className="h-10 w-full rounded-lg border border-gray-700 bg-gray-950 pl-9 pr-3 text-body3-m text-white outline-none focus:border-pink-600"
            />
          </label>

          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-subtle">
            {!trimmedKeyword && (
              <li className="flex items-center gap-3 rounded-lg px-2 py-2">
                <img src={host.profileImageUrl || icProfileDefault} alt="" className="size-9 rounded-full object-cover" />
                <span className="min-w-0 flex-1 truncate text-body3-sb">{host.name}</span>
                <span className="flex items-center gap-1 text-caption1-b text-pink-300"><Crown className="size-3" />방장</span>
              </li>
            )}
            {filteredGuests.map((participant) => {
              const user = participant.user;
              const mine = user.userId === currentUserId;
              const kicking = kickingUserId === user.userId;
              return (
                <li key={user.userId} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-800">
                  <img src={user.profileImageUrl || icProfileDefault} alt="" className="size-9 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate text-body3-sb">
                    {user.name}
                    {mine && <span className="ml-1.5 text-caption1-m text-gray-500">나</span>}
                  </span>
                  {isHost && !mine && (
                    <button
                      type="button"
                      disabled={kicking}
                      onClick={() => setKickTarget(participant)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-caption1-b text-red-notification hover:bg-red-notification/10 disabled:opacity-50"
                    >
                      <UserRoundX className="size-4" />{kicking ? '강퇴 중...' : '강퇴'}
                    </button>
                  )}
                </li>
              );
            })}
            {trimmedKeyword && filteredGuests.length === 0 && (
              <li className="py-8 text-center text-body3-m text-gray-500">찾는 참여자가 없어요.</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={kickTarget !== null}
        onOpenChange={(open) => { if (!open) setKickTarget(null); }}
        title="참여자 강퇴"
        description={`${kickTarget?.user.name ?? '선택한 참여자'}님을 Watch Party에서 강퇴할까요?`}
        confirmText="강퇴"
        cancelText="취소"
        variant="destructive"
        onConfirm={() => {
          if (kickTarget && kickTarget.user.userId !== currentUserId) onKick(kickTarget.user.userId);
        }}
      />
    </section>
  );
}
