import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WatchPartyPlaybackControlRequest, WatchPartyPlaybackState } from '@/lib/types';

interface PlaybackPanelProps {
  state: WatchPartyPlaybackState | null;
  isHost: boolean;
  connected: boolean;
  onControl: (request: WatchPartyPlaybackControlRequest) => boolean;
}

const elapsedMs = (state: WatchPartyPlaybackState | null, now: number) => {
  if (!state) return 0;
  const reference = state.status === 'PAUSED'
    ? (state.pausedAt ?? now)
    : state.status === 'ENDED'
      ? state.updatedAt
      : now;
  return Math.max(0, reference - state.startedAt - state.accumulatedPauseMs);
};

const formatElapsed = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

export default function PlaybackPanel({ state, isHost, connected, onControl }: PlaybackPanelProps) {
  const [now, setNow] = useState(Date.now());
  const [seekSeconds, setSeekSeconds] = useState('');

  useEffect(() => {
    if (state?.status !== 'LIVE') return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state?.status]);

  const elapsed = elapsedMs(state, now);
  const send = (request: WatchPartyPlaybackControlRequest) => {
    if (onControl(request)) return;
    return false;
  };

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body3-m text-gray-400">재생 상태</p>
          <h2 className="mt-1 text-title1-b text-white">{state?.status ?? '시작 전'}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-caption1-b ${connected ? 'bg-green-500/15 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
          {connected ? '실시간 연결됨' : '연결 대기 중'}
        </span>
      </div>

      <div className="mt-8 text-center font-mono text-4xl font-semibold tracking-wider text-white">
        {formatElapsed(elapsed)}
      </div>

      {state?.startEpisode !== null && state?.startEpisode !== undefined && (
        <p className="mt-3 text-center text-body3-m text-gray-400">
          에피소드 {state.startEpisode} ~ {state.endEpisode}
        </p>
      )}

      {isHost && (
        <div className="mt-8 space-y-4 border-t border-gray-800 pt-5">
          <p className="text-body3-sb text-gray-300">방장 재생 제어</p>
          <div className="flex gap-3">
            <Button type="button" disabled={!connected || !state || state.status !== 'PAUSED'} onClick={() => send({ action: 'PLAY' })} className="flex-1 bg-pink-600 text-white hover:bg-pink-700">
              재생
            </Button>
            <Button type="button" variant="outline" disabled={!connected || !state || state.status !== 'LIVE'} onClick={() => send({ action: 'PAUSE' })} className="flex-1 border-gray-600 text-gray-200">
              일시정지
            </Button>
          </div>
          <div className="flex gap-3">
            <input type="number" min="0" step="1" value={seekSeconds} onChange={(event) => setSeekSeconds(event.target.value)} placeholder="이동할 시간(초)" className="h-10 min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 text-body3-m text-white outline-none focus:border-pink-600" />
            <Button type="button" variant="outline" disabled={!connected || !state || state.status === 'ENDED' || seekSeconds === '' || Number(seekSeconds) < 0} onClick={() => {
              if (send({ action: 'SEEK', targetElapsedMs: Number(seekSeconds) * 1000 })) setSeekSeconds('');
            }} className="border-gray-600 text-gray-200">
              이동
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
