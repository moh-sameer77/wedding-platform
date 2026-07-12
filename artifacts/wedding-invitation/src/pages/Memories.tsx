import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Garland, FallingPetals } from '@/components/Florals';
import { api, type PublicEvent } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';

interface ArchiveUpload {
  id: number;
  fileUrl: string;
  fileType: string;
  uploadedByName: string | null;
  caption: string | null;
}

interface ArchiveMessage {
  id: number;
  messageType: string;
  text: string | null;
  fileUrl: string | null;
  guestName: string | null;
}

/** After-wedding thank-you page + digital album (FR-031, FR-033). */
export default function Memories() {
  usePageTitle('Our Memories');
  const query = useQuery({
    queryKey: ['archive'],
    queryFn: () =>
      api.get<{
        event: PublicEvent;
        uploads: ArchiveUpload[];
        messages: ArchiveMessage[];
      }>('/archive'),
  });

  const [lightbox, setLightbox] = useState<ArchiveUpload | null>(null);

  const event = query.data?.event;
  const uploads = query.data?.uploads ?? [];
  const messages = query.data?.messages ?? [];
  const photos = uploads.filter((u) => u.fileType === 'image');
  const videos = uploads.filter((u) => u.fileType === 'video');

  return (
    <div className="min-h-[100dvh] w-full bg-[#F3E4E2] font-serif text-[#45383C] relative overflow-hidden">
      <FallingPetals count={10} />
      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="bg-[#F9F3F3] border border-[#D48A96]/30 shadow-2xl relative overflow-hidden pb-0">
          {/* Watercolor garland draping from the top */}
          <Garland className="w-full" />

          <div className="px-4 sm:px-10 pb-4 -mt-4 sm:-mt-8 relative">
          <header className="text-center relative z-10 mb-12 pt-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#D48A96] mb-4">
              With all our love
            </p>
            <h1 className="font-script text-6xl sm:text-7xl gold-shimmer mb-6 pb-2">
              Thank You
            </h1>
            <p className="max-w-md mx-auto text-[#45383C]/70 italic leading-relaxed">
              {event?.thankYouMessage ??
                'Thank you for celebrating with us — your love and wishes made our day unforgettable.'}
            </p>
            <p className="font-script text-4xl text-[#D48A96] mt-6">
              {event?.coupleNames ?? 'Mohammad & Renad'}
            </p>
          </header>

          {query.isLoading && (
            <p className="text-center text-sm opacity-50 py-10">Loading memories…</p>
          )}

          {photos.length > 0 && (
            <section className="relative z-10 mb-12">
              <SectionTitle>Our shared memories</SectionTitle>
              <div className="columns-2 sm:columns-3 gap-3 [column-fill:_balance]">
                {photos.map((p, i) => (
                  <motion.button
                    key={p.id}
                    onClick={() => setLightbox(p)}
                    className="block w-full mb-3 bg-white p-1.5 pb-5 shadow-md hover:shadow-xl transition-shadow text-left"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: (i % 6) * 0.05 }}
                  >
                    <img src={p.fileUrl} alt={p.caption ?? 'Memory'} className="w-full" loading="lazy" />
                    {(p.uploadedByName || p.caption) && (
                      <p className="text-[10px] text-[#45383C]/60 mt-1.5 px-1 truncate italic">
                        {p.caption ? `“${p.caption}” ` : ''}
                        {p.uploadedByName ? `— ${p.uploadedByName}` : ''}
                      </p>
                    )}
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section className="relative z-10 mb-12">
              <SectionTitle>Moments in motion</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.map((v) => (
                  <div key={v.id} className="bg-white p-1.5 shadow-md">
                    <video src={v.fileUrl} controls className="w-full bg-black" />
                    {v.uploadedByName && (
                      <p className="text-[10px] text-[#45383C]/60 mt-1 px-1 italic">
                        — {v.uploadedByName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {messages.length > 0 && (
            <section className="relative z-10 mb-8">
              <SectionTitle>From our guestbook</SectionTitle>
              <div className="space-y-4 max-w-xl mx-auto">
                {messages.map((m) => (
                  <div key={m.id} className="border-l-2 border-[#D48A96]/60 pl-4 py-1">
                    {m.text && <p className="italic text-[#45383C]/80">“{m.text}”</p>}
                    {m.fileUrl && m.messageType === 'voice' && (
                      <audio src={m.fileUrl} controls className="mt-1 h-9 w-full max-w-xs" />
                    )}
                    {m.guestName && (
                      <p className="font-script text-xl text-[#B25A6C] mt-1">— {m.guestName}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {!query.isLoading && photos.length === 0 && videos.length === 0 && messages.length === 0 && (
            <p className="text-center text-sm opacity-50 py-8 relative z-10">
              The album is being prepared — check back soon.
            </p>
          )}
          </div>

          {/* Watercolor garland mirrored along the bottom edge */}
          <Garland flip className="w-full" />
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full bg-[#F9F3F3] p-3 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.fileUrl}
              alt={lightbox.caption ?? 'Memory'}
              className="w-full max-h-[75vh] object-contain"
            />
            <div className="text-center mt-3">
              {lightbox.caption && <p className="italic text-sm">“{lightbox.caption}”</p>}
              {lightbox.uploadedByName && (
                <p className="font-script text-2xl text-[#B25A6C]">— {lightbox.uploadedByName}</p>
              )}
            </div>
          </div>
          <button
            className="absolute top-5 right-6 text-white/80 text-3xl"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <div className="h-[0.5px] w-16 bg-gradient-to-r from-transparent to-[#D48A96]/70" />
      <h2 className="text-xs uppercase tracking-[0.25em] text-[#45383C]/60 whitespace-nowrap">
        {children}
      </h2>
      <div className="h-[0.5px] w-16 bg-gradient-to-l from-transparent to-[#D48A96]/70" />
    </div>
  );
}
