import { useEffect } from 'react';
import { Bell, BellRing, CalendarClock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useWatchPartyReminderStore from '@/lib/stores/useWatchPartyReminderStore';
import type { WatchPartyStatus, WatchPartySummaryResponse } from '@/lib/types';
import { getParticipantDisplay } from '@/lib/utils/watch-party';

const STATUS_LABELS: Record<WatchPartyStatus, string> = {
  LIVE: '진행 중',
  SCHEDULED: '예정',
  ENDED: '종료',
};

const STATUS_STYLES: Record<WatchPartyStatus, string> = {
  LIVE: 'bg-pink-600/20 text-pink-300',
  SCHEDULED: 'bg-blue-500/20 text-blue-300',
  ENDED: 'bg-gray-700 text-gray-300',
};

interface WatchPartyCardProps {
  party: WatchPartySummaryResponse;
  joining: boolean;
  onJoin: (party: WatchPartySummaryResponse) => void;
}

const formatScheduledAt = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export default function WatchPartyCard({ party, joining, onJoin }: WatchPartyCardProps) {
  const currentUserId = useAuthStore((state) => state.data?.userDto.id);
  const scheduledPartyIds = useWatchPartyReminderStore((state) => state.scheduledPartyIds);
  const reminderLoaded = useWatchPartyReminderStore((state) => state.loaded);
  const reminderLoading = useWatchPartyReminderStore((state) => state.loading);
  const reminderMutating = useWatchPartyReminderStore((state) => state.mutatingPartyIds.has(party.id));
  const fetchReminders = useWatchPartyReminderStore((state) => state.fetch);
  const setReminder = useWatchPartyReminderStore((state) => state.setReminder);
  const cancelReminder = useWatchPartyReminderStore((state) => state.cancelReminder);
  const ended = party.status === 'ENDED';
  const isHost = party.host.userId === currentUserId;
  const participantDisplay = getParticipantDisplay(party.status, party.currentParticipantCount);
  const reminderRegistered = scheduledPartyIds.has(party.id);

  useEffect(() => {
    if (currentUserId) void fetchReminders(currentUserId);
  }, [currentUserId, fetchReminders]);

  const handleReminder = async () => {
    if (!currentUserId || isHost || party.status !== 'SCHEDULED' || reminderMutating) return;
    try {
      if (reminderRegistered) {
        await cancelReminder(currentUserId, party.id);
        toast.success('Watch Party 알림을 해제했습니다.');
      } else {
        await setReminder(currentUserId, party.id);
        toast.success('Watch Party 알림을 등록했습니다.');
      }
    } catch (error) {
      console.error(error);
      toast.error(reminderRegistered ? '알림을 해제하지 못했습니다.' : '알림을 등록하지 못했습니다.');
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 transition-colors hover:border-gray-700">
      <div className="aspect-[16/9] overflow-hidden bg-gray-800">
        {party.content.thumbnailUrl ? (
          <img
            src={party.content.thumbnailUrl}
            alt={party.content.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-body3-m text-gray-500">
            이미지 없음
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-caption1-b ${STATUS_STYLES[party.status]}`}>
            {STATUS_LABELS[party.status]}
          </span>
          <span className="truncate text-caption1-m text-gray-500">{party.host.name} 방장</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-body3-m text-gray-400">{party.content.title}</p>
          <h2 className="mt-1 truncate text-title2-b text-white">{party.title}</h2>
        </div>
        <div className="space-y-2 text-body3-m text-gray-400">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>{formatScheduledAt(party.scheduledAt)}</span>
          </div>
          {participantDisplay && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{participantDisplay.count.toLocaleString('ko-KR')}{participantDisplay.label}</span>
            </div>
          )}
        </div>
        {!isHost && party.status === 'SCHEDULED' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleReminder()}
            disabled={!currentUserId || reminderLoading || !reminderLoaded || reminderMutating}
            className="h-10 w-full gap-2 border-gray-700 text-gray-200"
          >
            {reminderRegistered ? <BellRing className="size-4" /> : <Bell className="size-4" />}
            {reminderMutating ? '처리 중...' : reminderRegistered ? '알림 받는 중' : '알림 받기'}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => onJoin(party)}
          disabled={joining || ended}
          className="h-11 w-full rounded-xl bg-pink-600 text-body3-b text-white hover:bg-pink-700"
        >
          {joining ? '참여 중...' : ended ? '종료된 파티' : isHost ? '입장하기' : '참여하기'}
        </Button>
      </div>
    </article>
  );
}
