import { useRef, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { FallingPetals } from '@/components/Florals';
import { api, getSessionToken, type PublicEvent } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';

type Panel = 'menu' | 'photo' | 'message' | 'voice' | 'program';

/** Hand-drawn-style gold line icons for the table menu. */
const GoldIcon = ({ children }: { children: React.ReactNode }) => (
  <span className="w-12 h-12 flex-shrink-0 rounded-full border border-[#D48A96]/50 bg-[#FDF9F8] flex items-center justify-center shadow-sm">
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="none"
      stroke="#B25A6C"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  </span>
);

const ICONS: Record<string, React.ReactNode> = {
  photo: (
    <>
      <rect x="3" y="6.5" width="18" height="13" rx="2" />
      <path d="M8.5 6.5 L10 4h4l1.5 2.5" />
      <circle cx="12" cy="13" r="3.4" />
      <circle cx="17.6" cy="9.6" r="0.7" fill="#B25A6C" />
    </>
  ),
  message: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M3.5 6.5 L12 13 L20.5 6.5" />
      <path d="M12 10.2 c0.9,-1.7 3.4,-1 3.2,0.8 c-0.15,1.3 -3.2,3 -3.2,3 s-3.05,-1.7 -3.2,-3 c-0.2,-1.8 2.3,-2.5 3.2,-0.8Z" fill="#E8B4B8" stroke="none" transform="translate(0,3.5) scale(0.8) translate(2.5,-2)" />
    </>
  ),
  voice: (
    <>
      <rect x="9.5" y="3.5" width="5" height="10" rx="2.5" />
      <path d="M6 11.5 a6 6 0 0 0 12 0" />
      <path d="M12 17.5 v3" />
      <path d="M9 20.5 h6" />
    </>
  ),
  program: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9 v4.2 l2.8 1.6" />
      <path d="M9.5 3.5 h5" />
    </>
  ),
};

export default function TableMoments() {
  usePageTitle('Table Moments');
  const [, params] = useRoute('/t/:tableToken');
  const tableToken = params?.tableToken ?? '';
  const [panel, setPanel] = useState<Panel>('menu');

  const query = useQuery({
    queryKey: ['table', tableToken],
    queryFn: () =>
      api.get<{ table: { name: string }; event: PublicEvent }>(
        `/table/${tableToken}`,
      ),
    enabled: !!tableToken,
    retry: false,
  });

  if (query.isError) {
    return (
      <Shell>
        <p className="font-script text-5xl text-[#D48A96] mb-4">Oh no…</p>
        <p className="text-[#45383C]/75">
          This table link is not valid. Please scan the QR card on your table
          again.
        </p>
      </Shell>
    );
  }

  const table = query.data?.table;
  const event = query.data?.event;

  return (
    <div className="min-h-[100dvh] w-full bg-[#F3E4E2] font-serif text-[#45383C] relative overflow-hidden">
      <FallingPetals count={10} />
      <div className="max-w-md mx-auto px-4 py-10 relative z-10">
        <header className="text-center mb-8">
          <p className="font-script text-4xl sm:text-5xl text-[#D48A96] mb-2">
            {event?.coupleNames ?? 'Mohammad & Renad'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[0.5px] w-12 bg-[#D48A96]/60" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#45383C]/60">
              {table ? `Welcome to ${table.name}` : 'Welcome'}
            </p>
            <div className="h-[0.5px] w-12 bg-[#D48A96]/60" />
          </div>
          <p className="text-sm italic text-[#45383C]/65 mt-3 px-6">
            Share this moment with us — your photos and wishes become part of
            our story.
          </p>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={panel}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {panel === 'menu' && <Menu onSelect={setPanel} />}
            {panel === 'photo' && (
              <PhotoPanel tableToken={tableToken} onBack={() => setPanel('menu')} />
            )}
            {panel === 'message' && (
              <MessagePanel tableToken={tableToken} onBack={() => setPanel('menu')} />
            )}
            {panel === 'voice' && (
              <VoicePanel tableToken={tableToken} onBack={() => setPanel('menu')} />
            )}
            {panel === 'program' && (
              <ProgramPanel event={event ?? null} onBack={() => setPanel('menu')} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#F3E4E2] flex items-center justify-center p-6 font-serif">
      <div className="max-w-md w-full bg-[#F9F3F3] border border-[#D48A96]/40 shadow-xl p-10 text-center relative">
        <div className="absolute inset-2 border-[0.5px] border-[#D48A96]/30 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F9F3F3] border border-[#D48A96]/40 shadow-lg p-6 relative">
      <div className="absolute inset-1.5 border-[0.5px] border-[#D48A96]/25 pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="mt-4 w-full py-2.5 text-[10px] uppercase tracking-[0.2em] text-[#45383C]/55 border border-[#D48A96]/30 hover:bg-[#D48A96]/8"
    >
      ← Back
    </button>
  );
}

function Menu({ onSelect }: { onSelect: (p: Panel) => void }) {
  const items: { id: Panel; title: string; hint: string }[] = [
    { id: 'photo', title: 'Upload a memory', hint: 'Share a photo or short video' },
    { id: 'message', title: 'Leave a message', hint: 'Write a wish for the couple' },
    { id: 'voice', title: 'Record a voice note', hint: 'Say it in your own voice' },
    { id: 'program', title: 'View program', hint: 'Tonight’s schedule' },
  ];
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <motion.button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className="group w-full bg-[#F9F3F3] border border-[#D48A96]/40 shadow-sm px-4 py-3.5 flex items-center gap-4 text-left hover:shadow-lg hover:-translate-y-0.5 hover:border-[#D48A96]/70 transition-all relative overflow-hidden"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <span className="absolute inset-[3px] border-[0.5px] border-[#D48A96]/0 group-hover:border-[#D48A96]/25 pointer-events-none transition-colors" />
          <GoldIcon>{ICONS[item.id]}</GoldIcon>
          <span>
            <span className="block text-sm font-medium tracking-wide">{item.title}</span>
            <span className="block text-xs text-[#45383C]/55">{item.hint}</span>
          </span>
          <span className="ml-auto text-[#D48A96] transition-transform group-hover:translate-x-1">→</span>
        </motion.button>
      ))}
    </div>
  );
}

function SuccessCard({ onBack, message }: { onBack: () => void; message: string }) {
  return (
    <Card>
      <div className="text-center py-4">
        <p className="font-script text-4xl text-[#D48A96] mb-3">Thank you!</p>
        <p className="text-sm text-[#45383C]/70 italic">{message}</p>
      </div>
      <BackButton onBack={onBack} />
    </Card>
  );
}

function PhotoPanel({ tableToken, onBack }: { tableToken: string; onBack: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done)
    return (
      <SuccessCard
        onBack={onBack}
        message="Your memory has been sent — it will appear on the wall once approved."
      />
    );

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tableToken', tableToken);
      if (name.trim()) fd.append('uploadedByName', name.trim());
      if (caption.trim()) fd.append('caption', caption.trim());
      const token = getSessionToken();
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDone(true);
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <p className="text-center text-sm uppercase tracking-[0.2em] text-[#45383C]/60 mb-4">
        Upload a memory
      </p>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full border-2 border-dashed border-[#D48A96]/50 py-8 text-center hover:bg-[#D48A96]/5"
      >
        {file ? (
          <span className="text-sm text-[#45383C]">{file.name}</span>
        ) : (
          <>
            <span className="block text-3xl mb-1">📷</span>
            <span className="text-xs text-[#45383C]/60">
              Tap to choose a photo or short video
            </span>
          </>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        className="w-full mt-3 px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 text-sm focus:outline-none focus:border-[#B25A6C]"
      />
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="A short caption (optional)"
        className="w-full mt-2 px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 text-sm focus:outline-none focus:border-[#B25A6C]"
      />
      <button
        disabled={!file || busy}
        onClick={submit}
        className="w-full mt-4 py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Share memory'}
      </button>
      <BackButton onBack={onBack} />
    </Card>
  );
}

function MessagePanel({ tableToken, onBack }: { tableToken: string; onBack: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done)
    return (
      <SuccessCard
        onBack={onBack}
        message="Your wish has been saved for the couple's guestbook."
      />
    );

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post('/guestbook', {
        guestName: name.trim() || undefined,
        text: text.trim(),
        tableToken,
      });
      setDone(true);
    } catch (e) {
      toast({ title: 'Could not send', description: e instanceof Error ? e.message : '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <p className="text-center text-sm uppercase tracking-[0.2em] text-[#45383C]/60 mb-4">
        Leave a message
      </p>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your wish for Mohammad & Renad…"
        className="w-full px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 text-sm focus:outline-none focus:border-[#B25A6C]"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        className="w-full mt-2 px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 text-sm focus:outline-none focus:border-[#B25A6C]"
      />
      <button
        disabled={!text.trim() || busy}
        onClick={submit}
        className="w-full mt-4 py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Send wish'}
      </button>
      <BackButton onBack={onBack} />
    </Card>
  );
}

function VoicePanel({ tableToken, onBack }: { tableToken: string; onBack: () => void }) {
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_SECONDS = 60;

  if (done)
    return (
      <SuccessCard
        onBack={onBack}
        message="Your voice note has been saved — the couple will treasure it."
      />
    );

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        setBlob(new Blob(chunksRef.current, { type: mime }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      toast({
        title: 'Microphone unavailable',
        description: 'Please allow microphone access and try again.',
      });
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const submit = async () => {
    if (!blob) return;
    setBusy(true);
    try {
      const fd = new FormData();
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      fd.append('file', new File([blob], `voice-note.${ext}`, { type: blob.type }));
      fd.append('tableToken', tableToken);
      fd.append('target', 'voice');
      if (name.trim()) fd.append('uploadedByName', name.trim());
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDone(true);
    } catch (e) {
      toast({ title: 'Could not send', description: e instanceof Error ? e.message : '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <p className="text-center text-sm uppercase tracking-[0.2em] text-[#45383C]/60 mb-4">
        Record a voice note
      </p>
      <div className="text-center py-4">
        {!recording && !blob && (
          <button
            onClick={start}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] text-3xl shadow-lg hover:scale-105 transition-transform"
            aria-label="Start recording"
          >
            🎙️
          </button>
        )}
        {recording && (
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-red-600 text-white text-3xl flex items-center justify-center animate-pulse">
              ●
            </div>
            <p className="text-2xl font-medium tabular-nums">
              0:{String(seconds).padStart(2, '0')}
            </p>
            <button
              onClick={stop}
              className="px-8 py-3 border border-[#45383C]/40 uppercase tracking-widest text-xs"
            >
              Stop
            </button>
          </div>
        )}
        {blob && !recording && (
          <div className="space-y-4">
            <audio src={URL.createObjectURL(blob)} controls className="w-full" />
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  setBlob(null);
                  setSeconds(0);
                }}
                className="px-5 py-2.5 border border-[#D48A96]/50 uppercase tracking-widest text-[10px]"
              >
                Re-record
              </button>
            </div>
          </div>
        )}
        <p className="text-[10px] text-[#45383C]/45 mt-4 uppercase tracking-[0.15em]">
          Up to {MAX_SECONDS} seconds
        </p>
      </div>
      {blob && (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full mt-2 px-3 py-2.5 border border-[#D48A96]/40 bg-white/70 text-sm focus:outline-none focus:border-[#B25A6C]"
          />
          <button
            disabled={busy}
            onClick={submit}
            className="w-full mt-4 py-3.5 bg-gradient-to-br from-[#D48A96] to-[#B25A6C] text-[#F9F3F3] uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send voice note'}
          </button>
        </>
      )}
      <BackButton onBack={onBack} />
    </Card>
  );
}

function ProgramPanel({
  event,
  onBack,
}: {
  event: PublicEvent | null;
  onBack: () => void;
}) {
  const items = [
    { time: '4:00 PM', title: 'Guests arrival & welcome drinks' },
    { time: '5:00 PM', title: 'Zaffeh & grand entrance' },
    { time: '6:00 PM', title: 'First dance' },
    { time: '7:00 PM', title: 'Dinner is served' },
    { time: '9:00 PM', title: 'Cake cutting' },
    { time: '9:30 PM', title: 'Dancing & celebration' },
  ];
  return (
    <Card>
      <p className="text-center text-sm uppercase tracking-[0.2em] text-[#45383C]/60 mb-1">
        Tonight's program
      </p>
      <p className="text-center text-xs text-[#45383C]/50 mb-5">
        {event
          ? new Date(event.dateTime).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })
          : ''}
        {event ? ` · ${event.venueName}` : ''}
      </p>
      <div className="space-y-0">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#D48A96] mt-1" />
              {i < items.length - 1 && <div className="w-[0.5px] h-9 bg-[#D48A96]/40" />}
            </div>
            <div className="pb-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#B25A6C]">{item.time}</p>
              <p className="text-sm">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
      <BackButton onBack={onBack} />
    </Card>
  );
}
