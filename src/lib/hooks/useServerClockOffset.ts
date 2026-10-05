import { useEffect, useState } from 'react';
import { getServerTime } from '@/lib/api/watch-parties';

const SAMPLE_COUNT = 3;

interface ClockSample {
  offset: number;     // 서버 시각 - 브라우저 시각 (ms)
  roundTrip: number;  // 요청~응답 왕복 시간 (ms)
}

const measureOnce = async (): Promise<ClockSample> => {
  const t0 = Date.now();
  const serverTime = await getServerTime();
  const t1 = Date.now();
  return { offset: serverTime - (t0 + t1) / 2, roundTrip: t1 - t0 };
};

// 브라우저 시계가 서버보다 얼마나 차이 나는지(ms). 서버 기준 현재 시각 = Date.now() + offset
export function useServerClockOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const measure = async () => {
      let best: ClockSample | null = null;
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        try {
          const sample = await measureOnce();
          if (!best || sample.roundTrip < best.roundTrip) best = sample;
        } catch {
          // 한 번 실패해도 나머지 측정으로 계속 진행
        }
      }
      if (!cancelled && best) setOffset(best.offset);
    };

    void measure();
    return () => {
      cancelled = true;
    };
  }, []);

  return offset;
}