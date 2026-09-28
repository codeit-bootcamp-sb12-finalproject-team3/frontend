import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {CalendarClock} from 'lucide-react';
import {getScheduledWatchPartiesByMe} from '@/lib/api/watch-parties';
import type {WatchPartySummaryResponse} from '@/lib/types';

export default function ScheduledWatchPartiesSection() {
  const [parties, setParties] = useState<WatchPartySummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getScheduledWatchPartiesByMe()
      .then((data) => {
        if (!cancelled) setParties(data.filter((party) => party.status === 'SCHEDULED' && new Date(party.scheduledAt).getTime() > Date.now()));
      })
      .catch(() => {if (!cancelled) setError(true);})
      .finally(() => {if (!cancelled) setLoading(false);});
    return () => {cancelled = true;};
  }, []);

  return (
    <section className="">
      {loading && <p className="py-8 text-center text-body2-m text-gray-400">불러오는 중...</p>}
      {!loading && error && <p className="py-8 text-center text-body2-m text-red-notification">시청 예약 목록을 불러오지 못했습니다.</p>}
      {!loading && !error && parties.length === 0 && <p className="py-8 text-center text-body2-m text-gray-400">시청 예약 중인 Watch Party가 없습니다.</p>}
      {!loading && !error && parties.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {parties.map((party) => (
            <Link key={party.id} to={`/watch-parties/${party.id}`} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 transition-colors hover:border-gray-500 cursor-pointer">
              {party.content.thumbnailUrl ? (
                <img src={party.content.thumbnailUrl} alt={party.content.title} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-gray-800 text-body3-m text-gray-500">이미지 없음</div>
              )}
              <div className="space-y-2 p-4">
                <p className="truncate text-body3-m text-gray-400">{party.content.title}</p>
                <h3 className="truncate text-body1-sb text-gray-50">{party.title}</h3>
                <p className="flex items-center gap-2 text-body3-m text-gray-400">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  {new Date(party.scheduledAt).toLocaleString('ko-KR')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
