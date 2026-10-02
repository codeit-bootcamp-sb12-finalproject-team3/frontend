import { useLayoutEffect, useState } from 'react';
import { Clock3, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  WatchPartyPlaybackControlRequest,
  WatchPartyPlaybackState,
} from '@/lib/types';
import { useServerClockOffset } from '@/lib/hooks/useServerClockOffset';

interface PlaybackPanelProps {
  state: WatchPartyPlaybackState | null;
  isHost: boolean;
  connected: boolean;
  onControl: (
    request: WatchPartyPlaybackControlRequest,
  ) => boolean;
}

const elapsedMs = (
  state: WatchPartyPlaybackState | null,
  now: number,
) => {
  if (!state) return 0;

  const reference =
    state.status === 'PAUSED'
      ? (state.pausedAt ?? now)
      : state.status === 'ENDED'
        ? state.updatedAt
        : now;

  return Math.max(
    0,
    reference -
      state.startedAt -
      state.accumulatedPauseMs,
  );
};

const formatElapsed = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

export default function PlaybackPanel({
  state,
  isHost,
  connected,
  onControl,
}: PlaybackPanelProps) {
  const clockOffset = useServerClockOffset();
  const [now, setNow] = useState(Date.now());
  const [seekTime, setSeekTime] = useState('');
  const [showSeek, setShowSeek] = useState(false);

  useLayoutEffect(() => {
    if (state?.status !== 'LIVE') return;

    // 서버 시계 기준 현재 시각으로 계산 (startedAt·pausedAt이 서버 시계 값이므로)
    const tick = () => setNow(Date.now() + clockOffset);
    tick();
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [state?.status, clockOffset]);

  const elapsed = elapsedMs(state, now);
  const live = state?.status === 'LIVE';
  const paused = state?.status === 'PAUSED';
  const seekMatch = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(seekTime.trim());
  const seekTargetMs = seekMatch
    ? (Number(seekMatch[1]) * 3600 + Number(seekMatch[2]) * 60 + Number(seekMatch[3])) * 1000
    : null;

  const send = (
    request: WatchPartyPlaybackControlRequest,
  ) => onControl(request);

  return (
    <section className="w-full text-center">
      <div className="flex items-center justify-center gap-3">
        <span
          className={`size-2.5 rounded-full ${
            live
              ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.7)]'
              : 'bg-gray-600'
          }`}
        />

        <span
          className={`text-body2-b ${
            live ? 'text-green-400' : 'text-gray-300'
          }`}
        >
          {live
            ? 'LIVE'
            : paused
              ? '일시정지'
              : state?.status === 'ENDED'
                ? '종료'
                : '시작 전'}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-caption1-b ${
            connected
              ? 'bg-green-500/15 text-green-300'
              : 'bg-gray-800 text-gray-500'
          }`}
        >
          {connected
            ? '실시간 연결됨'
            : '연결 대기 중'}
        </span>
      </div>

      <div className="mt-5 font-mono text-[42px] font-semibold tracking-[0.06em] text-white sm:text-5xl">
        {formatElapsed(elapsed)}
      </div>

      {state?.startEpisode !== null &&
        state?.startEpisode !== undefined && (
          <p className="mt-2 text-caption1-m text-gray-500">
            에피소드 {state.startEpisode} ~{' '}
            {state.endEpisode}
          </p>
        )}

      {isHost && (
        <div className="mt-6 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3">
            {paused ? (
              <Button
                type="button"
                disabled={!connected || !state}
                onClick={() =>
                  send({ action: 'PLAY' })
                }
                className="h-11 min-w-36 gap-2 bg-pink-600 px-6 text-white hover:bg-pink-700"
              >
                <Play className="size-4 fill-current" />
                재생
              </Button>
            ) : (
              <Button
                type="button"
                disabled={
                  !connected || !state || !live
                }
                onClick={() =>
                  send({ action: 'PAUSE' })
                }
                className="h-11 min-w-36 gap-2 bg-pink-600 px-6 text-white hover:bg-pink-700"
              >
                <Pause className="size-4 fill-current" />
                일시정지
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={
                !connected ||
                !state ||
                state.status === 'ENDED'
              }
              onClick={() =>
                setShowSeek((current) => !current)
              }
              className="h-11 gap-2 border-gray-700 px-5 text-gray-300 hover:bg-gray-800"
            >
              <Clock3 className="size-4" />
              시간 이동
            </Button>
          </div>

          {showSeek && (
            <div className="mt-3 flex w-full max-w-sm gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={seekTime}
                onChange={(event) =>
                  setSeekTime(event.target.value)
                }
                placeholder="HH:MM:SS"
                aria-label="이동할 시간(시:분:초)"
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 text-body3-m text-white outline-none focus:border-pink-600"
              />

              <Button
                type="button"
                variant="outline"
                disabled={
                  !connected ||
                  !state ||
                  state.status === 'ENDED' ||
                  seekTargetMs === null
                }
                onClick={() => {
                  if (seekTargetMs === null) return;

                  if (
                    send({
                      action: 'SEEK',
                      targetElapsedMs: seekTargetMs,
                    })
                  ) {
                    setSeekTime('');
                    setShowSeek(false);
                  }
                }}
                className="border-gray-700 text-gray-200"
              >
                이동
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
