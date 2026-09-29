import { useState } from 'react';
import { Crown, UserRoundX } from 'lucide-react';
import icProfileDefault from '@/assets/ic_profile_default.svg';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import type { WatchPartyHostSummary, WatchPartyParticipantResponse } from '@/lib/types';

interface ParticipantPanelProps {
  host: WatchPartyHostSummary;
  participants: WatchPartyParticipantResponse[];
  currentUserId?: string;
  isHost: boolean;
  loading: boolean;
  error: string | null;
  kickingUserId: string | null;
  onRetry: () => void;
  onKick: (userId: string) => void;
}

export default function ParticipantPanel({
  host,
  participants,
  currentUserId,
  isHost,
  loading,
  error,
  kickingUserId,
  onRetry,
  onKick,
}: ParticipantPanelProps) {
  const [kickTarget, setKickTarget] = useState<WatchPartyParticipantResponse | null>(null);

  return (
    <section className="min-h-0 rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title2-b text-white">참여자</h2>
        <span className="text-body3-m text-gray-400">참여 중 {participants.length}명</span>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
        <div className="flex items-center gap-3 rounded-xl bg-gray-800/70 px-3 py-2.5">
          <img
            src={host.profileImageUrl || icProfileDefault}
            alt=""
            className="size-9 rounded-full object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-body3-m text-gray-100">{host.name}</span>
          <span className="flex items-center gap-1 text-caption1-b text-pink-300">
            <Crown className="size-3.5" />
            HOST
          </span>
        </div>

        {loading && participants.length === 0 && (
          <p className="py-6 text-center text-body3-m text-gray-500">참여자를 불러오는 중입니다.</p>
        )}

        {!loading && error && participants.length === 0 && (
          <div className="py-5 text-center">
            <p className="text-body3-m text-gray-500">{error}</p>
            <button type="button" onClick={onRetry} className="mt-2 text-body3-b text-pink-300 hover:text-pink-200">
              다시 시도
            </button>
          </div>
        )}

        {participants.map((participant) => {
          const user = participant.user;
          const canKick = isHost && user.userId !== currentUserId;
          return (
            <div key={user.userId} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-800/50">
              <img
                src={user.profileImageUrl || icProfileDefault}
                alt=""
                className="size-9 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body3-m text-gray-100">{user.name}</p>
                {user.userId === currentUserId && <p className="text-caption1-m text-gray-500">나</p>}
              </div>
              {canKick && (
                <button
                  type="button"
                  disabled={kickingUserId === user.userId}
                  onClick={() => setKickTarget(participant)}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-notification/10 hover:text-red-notification disabled:opacity-50"
                  aria-label={`${user.name} 강퇴`}
                >
                  <UserRoundX className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={kickTarget !== null}
        onOpenChange={(open) => { if (!open) setKickTarget(null); }}
        title="참여자 강퇴"
        description={`${kickTarget?.user.name ?? '선택한 참여자'}님을 Watch Party에서 강퇴할까요?`}
        confirmText="강퇴"
        cancelText="취소"
        variant="destructive"
        onConfirm={() => {
          if (kickTarget && kickTarget.user.userId !== currentUserId) {
            onKick(kickTarget.user.userId);
          }
        }}
      />
    </section>
  );
}
