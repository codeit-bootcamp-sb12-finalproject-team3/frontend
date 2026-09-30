import { useState } from 'react';
import { Crown, UserRoundX } from 'lucide-react';
import icProfileDefault from '@/assets/ic_profile_default.svg';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WatchPartyHostSummary, WatchPartyParticipantResponse } from '@/lib/types';

interface ParticipantPanelProps {
  host: WatchPartyHostSummary;
  participants: WatchPartyParticipantResponse[];
  participantCount: number;
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
        <button type="button" className="group flex w-16 shrink-0 flex-col items-center gap-2 text-center outline-none" aria-label={`${user.name} 프로필 보기`}>
          <span className={`relative block size-12 rounded-full border-2 p-0.5 transition-colors ${host ? 'border-pink-500' : 'border-gray-700 group-hover:border-gray-500 group-data-[state=open]:border-pink-500'}`}>
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

export default function ParticipantPanel({ host, participants, participantCount, currentUserId, isHost, loading, error, kickingUserId, onRetry, onKick }: ParticipantPanelProps) {
  const [kickTarget, setKickTarget] = useState<WatchPartyParticipantResponse | null>(null);

  return (
    <section className="w-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body2-b text-white">함께 보는 중 · {participantCount}명</h2>
        {loading && <span className="text-caption1-m text-gray-500">업데이트 중</span>}
      </div>

      {error && participants.length === 0 ? (
        <div className="py-5 text-center">
          <p className="text-body3-m text-gray-500">{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-body3-b text-pink-300 hover:text-pink-200">다시 시도</button>
        </div>
      ) : (
        <div className="mt-4 flex min-h-20 items-start gap-3 overflow-x-auto pb-2">
          <ParticipantAvatar user={host} host current={host.userId === currentUserId} canKick={false} kicking={false} />
          {participants.map((participant) => {
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
