import { CalendarClock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WatchPartyStatus, WatchPartySummaryResponse } from '@/lib/types';

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
  const full = party.currentParticipantCount >= party.maxParticipants;
  const ended = party.status === 'ENDED';

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
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{party.currentParticipantCount.toLocaleString()} / {party.maxParticipants.toLocaleString()}명</span>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => onJoin(party)}
          disabled={joining || full || ended}
          className="h-11 w-full rounded-xl bg-pink-600 text-body3-b text-white hover:bg-pink-700"
        >
          {joining ? '참여 중...' : ended ? '종료된 파티' : full ? '정원 마감' : '참여하기'}
        </Button>
      </div>
    </article>
  );
}
