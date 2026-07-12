import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FallingPetals } from '@/components/Florals';
import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';

interface WallPhoto {
  id: number;
  fileUrl: string;
  uploadedByName: string | null;
  caption: string | null;
}

interface WallMessage {
  id: number;
  text: string | null;
  guestName: string | null;
}

type WallItem =
  | { kind: 'photo'; key: string; photo: WallPhoto }
  | { kind: 'message'; key: string; message: WallMessage };

const ROTATE_MS = 9000;

/**
 * Projector/TV display (FR-027). Screen-safe: no admin controls, auto-refresh
 * via polling (FR-028), shows approved content only.
 */
export default function Wall() {
  usePageTitle('Live Memory Wall');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const query = useQuery({
    queryKey: ['wall-items'],
    queryFn: () =>
      api.get<{
        event: { coupleNames: string; name: string };
        photos: WallPhoto[];
        messages: WallMessage[];
      }>('/wall/items'),
    refetchInterval: 8000,
  });

  const items: WallItem[] = useMemo(() => {
    const photos = query.data?.photos ?? [];
    const messages = query.data?.messages ?? [];
    // Interleave: roughly two photos per message for a lively rhythm.
    const out: WallItem[] = [];
    let pi = 0;
    let mi = 0;
    while (pi < photos.length || mi < messages.length) {
      for (let k = 0; k < 2 && pi < photos.length; k++, pi++) {
        out.push({ kind: 'photo', key: `p${photos[pi]!.id}`, photo: photos[pi]! });
      }
      if (mi < messages.length) {
        out.push({ kind: 'message', key: `m${messages[mi]!.id}`, message: messages[mi]! });
        mi++;
      }
    }
    return out;
  }, [query.data]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    onChange();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  };

  const current = items.length > 0 ? items[index % items.length]! : null;
  const coupleNames = query.data?.event.coupleNames ?? 'Mohammad & Renad';

  return (
    <div className="h-[100dvh] w-full bg-[#251A1E] text-[#F9F3F3] font-serif overflow-hidden relative cursor-none flex flex-col">
      {/* Ambient vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)] pointer-events-none z-10" />
      <FallingPetals count={14} />

      <header className="relative z-20 text-center pt-8 md:pt-10 pb-2">
        <div className="absolute right-4 top-2 md:right-8 md:top-0">
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="px-3 py-2 border border-[#D48A96]/45 bg-black/20 text-[10px] uppercase tracking-[0.2em] text-[#F9F3F3]/80 hover:bg-[#D48A96]/10 transition-colors"
          >
            {isFullscreen ? 'Exit Full Screen / إنهاء ملء الشاشة' : 'Full Screen / ملء الشاشة'}
          </button>
        </div>
        <p className="font-script text-4xl sm:text-5xl md:text-7xl gold-shimmer-light drop-shadow-lg pb-2">
          {coupleNames}
        </p>
        <div className="flex items-center justify-center gap-4 mt-1">
          <div className="h-[0.5px] w-20 bg-gradient-to-r from-transparent to-[#D48A96]/70" />
          <svg viewBox="0 0 60 14" className="w-14 h-4 opacity-80">
            <path d="M2 7 C 10 7, 14 2, 22 7 C 30 12, 34 7, 44 7" fill="none" stroke="#D48A96" strokeWidth="1" />
            <circle cx="22" cy="7" r="2.2" fill="#D48A96" />
            <circle cx="50" cy="7" r="1.3" fill="#D48A96" opacity="0.7" />
            <circle cx="56" cy="7" r="0.9" fill="#D48A96" opacity="0.5" />
          </svg>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-[#F9F3F3]/60">
            Our memory wall
          </p>
          <svg viewBox="0 0 60 14" className="w-14 h-4 opacity-80 -scale-x-100">
            <path d="M2 7 C 10 7, 14 2, 22 7 C 30 12, 34 7, 44 7" fill="none" stroke="#D48A96" strokeWidth="1" />
            <circle cx="22" cy="7" r="2.2" fill="#D48A96" />
            <circle cx="50" cy="7" r="1.3" fill="#D48A96" opacity="0.7" />
            <circle cx="56" cy="7" r="0.9" fill="#D48A96" opacity="0.5" />
          </svg>
          <div className="h-[0.5px] w-20 bg-gradient-to-l from-transparent to-[#D48A96]/70" />
        </div>
      </header>

      <main className="relative z-20 flex-1 min-h-0 flex items-center justify-center px-6 pb-8">
        {/* Breathing golden aura behind the current memory */}
        <div
          className="absolute w-[62vmin] h-[62vmin] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(212,138,150,0.16) 0%, rgba(212,138,150,0.05) 45%, transparent 70%)',
            animation: 'wall-glow 7s ease-in-out infinite',
          }}
        />
        <AnimatePresence mode="wait">
          {!current && query.isFetched && (
            <motion.div
              key="empty"
              className="text-center max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <p className="font-script text-6xl text-[#D48A96]/80 mb-6">Share the joy</p>
              <p className="text-lg text-[#F9F3F3]/70 italic leading-relaxed">
                Share photos from the invitation memories screen or leave a wish
                from the guestbook to have it shown here for everyone to enjoy.
                <br />
                شاركوا الصور من شاشة الذكريات في الدعوة أو اكتبوا تهنئة من سجل التهاني لتظهر هنا ليستمتع بها الجميع.
              </p>
            </motion.div>
          )}

          {current?.kind === 'photo' && (
            <motion.figure
              key={current.key}
              className="text-center max-w-4xl w-full"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              <div className="inline-block bg-[#F9F3F3] p-3 md:p-4 pb-14 md:pb-16 shadow-2xl rotate-[-0.6deg] max-w-full ring-1 ring-[#D48A96]/25">
                <div className="overflow-hidden">
                  <img
                    src={current.photo.fileUrl}
                    alt={current.photo.caption ?? 'Wedding memory'}
                    className="max-h-[55vh] max-w-full object-contain"
                    style={{ animation: `ken-burns ${ROTATE_MS}ms ease-in-out forwards` }}
                  />
                </div>
                <figcaption className="mt-4 text-[#45383C]">
                  {current.photo.caption && (
                    <p className="italic text-sm md:text-lg">“{current.photo.caption}”</p>
                  )}
                  {current.photo.uploadedByName && (
                    <p className="font-script text-2xl md:text-3xl text-[#B25A6C] mt-1">
                      — {current.photo.uploadedByName}
                    </p>
                  )}
                </figcaption>
              </div>
            </motion.figure>
          )}

          {current?.kind === 'message' && (
            <motion.blockquote
              key={current.key}
              className="text-center max-w-3xl px-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              <span className="text-[#D48A96] text-6xl leading-none font-script">“</span>
              <p className="text-2xl md:text-4xl leading-relaxed italic text-[#F9F3F3]/90 -mt-4">
                {current.message.text}
              </p>
              {current.message.guestName && (
                <p className="font-script text-3xl md:text-4xl text-[#D48A96] mt-6">
                  — {current.message.guestName}
                </p>
              )}
            </motion.blockquote>
          )}
        </AnimatePresence>
      </main>

      {items.length > 0 && (
        <footer className="relative z-20 pb-6 flex justify-center gap-1.5">
          {items.slice(0, 24).map((it, i) => (
            <div
              key={it.key}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                i === index % items.length ? 'bg-[#D48A96]' : 'bg-[#F9F3F3]/20'
              }`}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
