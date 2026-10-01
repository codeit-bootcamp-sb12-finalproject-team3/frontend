import { CircleUserRound } from 'lucide-react';
import type { ContentCast } from '@/lib/types';
import HorizontalCarousel from '@/pages/recommendations/components/HorizontalCarousel';

export default function CastCarousel({ cast, compact = false }: { cast: ContentCast[]; compact?: boolean }) {
  return (
    <section className={`rounded-[24px] border border-white/[0.08] bg-gray-950/70 ${compact ? 'p-5' : 'p-6'}`}>
      <h2 className={`${compact ? 'mb-4 text-body1-b' : 'mb-5 text-title1-b'} text-white`}>출연진</h2>
      {cast.length > 0 ? (
        <HorizontalCarousel itemClassName={compact ? 'w-[104px]' : 'w-[126px]'} ariaLabel="출연진 목록">
          {cast.map((person, index) => (
            <div key={`${person.name}-${index}`} className="min-w-0">
              {person.profileImageUrl ? (
                <img src={person.profileImageUrl} alt={`${person.name} 프로필`} className={`aspect-square w-full object-cover ${compact ? 'rounded-xl' : 'rounded-2xl'}`} />
              ) : (
                <div className={`flex aspect-square w-full items-center justify-center bg-gray-800 text-gray-500 ${compact ? 'rounded-xl' : 'rounded-2xl'}`}><CircleUserRound className={compact ? 'size-9' : 'size-12'} /></div>
              )}
              <p className={`${compact ? 'mt-2' : 'mt-3'} truncate text-body3-sb text-gray-100`}>{person.name}</p>
              {person.roleName && <p className="mt-1 line-clamp-2 text-caption1-m leading-4 text-gray-500">{person.roleName}</p>}
            </div>
          ))}
        </HorizontalCarousel>
      ) : <p className="py-6 text-center text-body3-m text-gray-500">등록된 출연진 정보가 없습니다.</p>}
    </section>
  );
}
