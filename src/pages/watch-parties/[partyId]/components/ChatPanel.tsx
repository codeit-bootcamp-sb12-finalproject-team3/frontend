import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { WatchPartyChatMessage } from '@/lib/types';

interface ChatPanelProps {
  messages: WatchPartyChatMessage[];
  currentUserId?: string;
  connected: boolean;
  disabled: boolean;
  onSend: (content: string) => boolean;
}

export default function ChatPanel({ messages, currentUserId, connected, disabled, onSend }: ChatPanelProps) {
  const [content, setContent] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 500 || disabled) return;
    if (onSend(trimmed)) setContent('');
  };

  return (
    <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
      <div className="border-b border-gray-800 px-6 py-5">
        <h2 className="text-title2-b text-white">실시간 채팅</h2>
        <p className="mt-1 text-caption1-m text-gray-500">Room 입장 이후의 신규 메시지만 표시됩니다.</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-body3-m text-gray-500">아직 받은 메시지가 없습니다.</div>
        ) : messages.map((message, index) => {
          const mine = message.senderId === currentUserId;
          return (
            <div key={`${message.sentAt}-${message.senderId}-${index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                {!mine && <p className="mb-1 text-caption1-m text-gray-400">{message.senderId}</p>}
                <p className="break-words text-body3-m">{message.content}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? 'text-pink-100' : 'text-gray-500'}`}>
                  {new Date(message.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 border-t border-gray-800 p-4">
        <input value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} disabled={disabled} placeholder={connected ? '메시지를 입력하세요.' : '실시간 연결을 기다리는 중입니다.'} className="h-11 min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 text-body3-m text-white outline-none focus:border-pink-600 disabled:opacity-60" />
        <Button type="submit" disabled={disabled || !content.trim()} className="h-11 bg-pink-600 px-5 text-white hover:bg-pink-700">전송</Button>
      </form>
    </section>
  );
}
