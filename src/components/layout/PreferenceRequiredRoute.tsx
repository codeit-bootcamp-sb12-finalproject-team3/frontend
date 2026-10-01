import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { getMyPreferences, isPreferenceNotFoundError } from '@/lib/api/preferences';
import { useAuthStore } from '@/lib/stores/useAuthStore';

type PreferenceStatus = 'checking' | 'complete' | 'required' | 'error';

export default function PreferenceRequiredRoute() {
  const location = useLocation();
  const authentication = useAuthStore((state) => state.data);
  const [status, setStatus] = useState<PreferenceStatus>('checking');
  const [retrySequence, setRetrySequence] = useState(0);
  const isAdmin = authentication?.userDto.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) return;

    let cancelled = false;
    const checkPreferences = async () => {
      setStatus('checking');
      try {
        await getMyPreferences();
        if (!cancelled) setStatus('complete');
      } catch (error) {
        if (cancelled) return;
        setStatus(isPreferenceNotFoundError(error) ? 'required' : 'error');
      }
    };

    void checkPreferences();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, authentication?.userDto.id, retrySequence]);

  if (isAdmin || status === 'complete' || location.pathname === '/contents') {
    return <Outlet />;
  }

  if (status === 'required') {
    return <Navigate to="/preferences" replace />;
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-body1-b text-white">선호 정보를 확인하지 못했습니다.</p>
        <p className="mt-2 text-body3-m text-gray-500">잠시 후 다시 시도해 주세요.</p>
        <Button
          type="button"
          onClick={() => setRetrySequence((value) => value + 1)}
          className="mt-6 rounded-xl bg-pink-500 px-5 text-white hover:bg-pink-600"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
