import type { WatchPartyStatus } from '@/lib/types';

/**
 * 참여 인원 표시. 서버 인원(guestCount)은 게스트만 센다(방장은 참여자 행이 없음)
 * - 예정: 대기실에 들어온 게스트만 → "N명 대기 중"
 * - 진행 중: 방장 포함 → "N명 참여 중"
 * - 종료: 표시하지 않음(null)
 */
export const getParticipantDisplay = (status: WatchPartyStatus, guestCount: number) => {
  if (status === 'LIVE') return { count: guestCount + 1, label: '명 참여 중' };
  if (status === 'SCHEDULED') return { count: guestCount, label: '명 대기 중' };
  return null;
};