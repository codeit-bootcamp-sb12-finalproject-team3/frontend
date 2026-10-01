import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/lib/stores/useAuthStore';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signInWithOAuth = useAuthStore((state) => state.signInWithOAuth);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const code = searchParams.get('code');

    if (!code) {
      navigate('/sign-in?error=oauth2_login_failed', { replace: true });
      return;
    }

    const completeLogin = async () => {
      try {
        await signInWithOAuth(code);
        navigate('/recommendations', { replace: true });
      } catch (error) {
        console.error('OAuth login failed:', error);
        navigate('/sign-in?error=oauth2_login_failed', { replace: true });
      }
    };

    void completeLogin();
  }, [navigate, searchParams, signInWithOAuth]);

  return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로그인 처리 중...</p>
      </div>
  );
}
