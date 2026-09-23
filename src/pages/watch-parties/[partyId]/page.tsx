import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function WatchPartyRoomPage() {
  const { partyId } = useParams<{ partyId: string }>();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-8 py-16">
      <div className="max-w-xl rounded-3xl border border-gray-800 bg-gray-900/60 px-10 py-12 text-center">
        <p className="text-body3-sb text-pink-400">Party ID: {partyId}</p>
        <h1 className="mt-3 text-header1-b text-white">Watch Party Room</h1>
        <p className="mt-4 text-body2-m leading-7 text-gray-400">
          Watch Party Room과 실시간 채팅·재생 동기화 기능은 다음 단계에서 구현됩니다.
        </p>
        <Button asChild variant="outline" className="mt-8 border-gray-600 text-gray-200">
          <Link to="/watch-parties">목록으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}
