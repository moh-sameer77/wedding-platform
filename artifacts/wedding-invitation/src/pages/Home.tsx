import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const COUNTDOWN_TARGET = new Date('2026-07-25T16:00:00').getTime();

const MAPS_URL = 'https://maps.google.com/?q=Tal+Pine+Amman+Jordan';

// --- SVG COMPONENTS ---

const WaxSealSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
    <defs>
      <filter id="wax-texture">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" in="noise" result="coloredNoise" />
        <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="texture" />
        <feBlend mode="multiply" in="texture" in2="SourceGraphic" />
      </filter>
      <radialGradient id="wax-grad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#F0D98A" />
        <stop offset="35%" stopColor="#C9A96E" />
        <stop offset="70%" stopColor="#A07840" />
        <stop offset="100%" stopColor="#7A5A2B" />
      </radialGradient>
      <filter id="wax-shadow">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#3C3228" floodOpacity="0.35" />
      </filter>
    </defs>
    <path d="M100,8 C128,6 150,14 166,32 C182,48 190,70 190,92 C190,118 180,140 163,157 C145,176 120,188 96,190 C70,192 45,182 28,165 C10,148 4,120 6,95 C8,68 20,44 40,28 C58,12 78,10 100,8Z" fill="url(#wax-grad)" filter="url(#wax-texture)" />
    <path d="M100,8 C128,6 150,14 166,32 C182,48 190,70 190,92 C190,118 180,140 163,157 C145,176 120,188 96,190 C70,192 45,182 28,165 C10,148 4,120 6,95 C8,68 20,44 40,28 C58,12 78,10 100,8Z" fill="none" stroke="#E8C87A" strokeWidth="1.5" opacity="0.4" filter="url(#wax-shadow)" />
    <circle cx="100" cy="99" r="72" fill="none" stroke="#E8C87A" strokeWidth="5" opacity="0.75" />
    <circle cx="100" cy="99" r="65" fill="none" stroke="#7A5A2B" strokeWidth="0.8" opacity="0.5" />
    <path d="M100,42 C122,42 144,54 144,80 C144,112 100,144 100,148 C100,144 56,112 56,80 C56,54 78,42 100,42 Z" fill="none" stroke="#E8C87A" strokeWidth="1.8" opacity="0.85" />
    <text x="100" y="118" fontFamily="'Great Vibes', cursive" fontSize="56" fill="#F0D98A" textAnchor="middle" opacity="0.95">M&amp;R</text>
  </svg>
);

const DividerSVG = () => (
  <motion.div
    className="w-full max-w-md mx-auto my-10 sm:my-14 flex justify-center"
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 0.75, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.9, ease: 'easeOut' }}
  >
    <svg viewBox="0 0 320 24" className="w-full h-5 sm:h-7">
      <path d="M 0 12 L 118 12" stroke="#C9A96E" strokeWidth="0.6" />
      <path d="M 202 12 L 320 12" stroke="#C9A96E" strokeWidth="0.6" />
      <path d="M 118 12 C 128 12, 133 4, 143 12 C 153 20, 158 12, 178 12" fill="none" stroke="#C9A96E" strokeWidth="1.2" />
      <path d="M 118 12 C 128 12, 133 20, 143 12 C 153 4, 158 12, 178 12" fill="none" stroke="#C9A96E" strokeWidth="1.2" />
      <circle cx="143" cy="12" r="3.5" fill="#C9A96E" opacity="0.9" />
      <circle cx="143" cy="12" r="1.5" fill="#FAF7F2" />
      <circle cx="116" cy="12" r="1.5" fill="#C9A96E" opacity="0.5" />
      <circle cx="204" cy="12" r="1.5" fill="#C9A96E" opacity="0.5" />
    </svg>
  </motion.div>
);

const PineTreeSVG = () => (
  <svg viewBox="0 0 50 65" className="w-10 h-12 sm:w-12 sm:h-14 mb-1">
    <path d="M 25 58 L 25 65" stroke="#7A5A2B" strokeWidth="3" strokeLinecap="round" />
    <path d="M 25 38 L 44 58 L 6 58 Z" fill="#4A7A4A" stroke="#3A6A3A" strokeWidth="0.5" />
    <path d="M 25 20 L 40 40 L 10 40 Z" fill="#5A8A5A" stroke="#4A7A4A" strokeWidth="0.5" />
    <path d="M 25 5 L 37 26 L 13 26 Z" fill="#6B9B6B" stroke="#5A8A5A" strokeWidth="0.5" />
  </svg>
);

/** Calendar popover */
function CalendarMenu({ onClose }: { onClose: () => void }) {
  const generateICS = () => {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `${Date.now()}@mohammad-renad-wedding`;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mohammad & Renad Wedding//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Amman',
      'BEGIN:STANDARD',
      'DTSTART:19701025T030000',
      'TZOFFSETFROM:+0300',
      'TZOFFSETTO:+0200',
      'TZNAME:EET',
      'END:STANDARD',
      'BEGIN:DAYLIGHT',
      'DTSTART:19700328T010000',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0300',
      'TZNAME:EEST',
      'END:DAYLIGHT',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      'DTSTART;TZID=Asia/Amman:20260725T160000',
      'DTEND;TZID=Asia/Amman:20260725T230000',
      'SUMMARY:Mohammad & Renad Wedding',
      'DESCRIPTION:Wedding Celebration — Joyfully request your presence',
      'LOCATION:Tal Pine\\, Amman\\, Jordan',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mohammad-Renad-Wedding.ics';
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const googleUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=Mohammad+%26+Renad+Wedding' +
    '&dates=20260725T160000/20260725T230000' +
    '&details=Wedding+Celebration+%E2%80%94+Joyfully+request+your+presence' +
    '&location=Tal+Pine,+Amman,+Jordan';

  return (
    <motion.div
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#FAF7F2] border border-[#C9A96E]/50 shadow-xl z-50 min-w-[200px]"
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-[2px] border-[0.5px] border-[#C9A96E]/30 pointer-events-none" />
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#C9A96E]/8 transition-colors text-[#3C3228]/80 text-xs uppercase tracking-widest font-serif border-b border-[#C9A96E]/20"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Google Calendar
      </a>
      <button
        onClick={generateICS}
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#C9A96E]/8 transition-colors text-[#3C3228]/80 text-xs uppercase tracking-widest font-serif w-full text-left"
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v13m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
        </svg>
        Download .ics
      </button>
    </motion.div>
  );
}

// --- MAIN COMPONENT ---

export default function WeddingInvitation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { toast } = useToast();

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => setShowContent(true), 1500);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#EDE4D3] overflow-hidden relative selection:bg-[#C9A96E]/30 font-serif">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20 mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.06%22/%3E%3C/svg%3E')]" />

      <AnimatePresence>
        {!showContent && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50 p-4 sm:p-8"
            exit={{ opacity: 0, transition: { duration: 1, delay: 0.5 } }}
          >
            <div className="relative w-full max-w-lg aspect-[5/4] sm:aspect-[4/3] max-h-[80vh] bg-transparent mx-auto">
              <div
                className="absolute inset-0 bg-[#F5EFE0] shadow-2xl overflow-hidden rounded-sm cursor-pointer border-[0.5px] border-[#C9A96E]/20"
                onClick={handleOpen}
              >
                {/* Inner Card Peeking */}
                <motion.div
                  className="absolute inset-x-4 bottom-4 bg-[#FAF7F2] shadow-lg rounded-sm z-0 flex flex-col items-center pt-4 sm:pt-8 border border-[#C9A96E]/30"
                  initial={{ top: '20%', bottom: '4%' }}
                  animate={{ top: isOpen ? '-150%' : '20%' }}
                  transition={{ duration: 1.5, delay: 0.8, ease: 'easeInOut' }}
                >
                  <div className="w-full h-full relative overflow-hidden flex flex-col items-center p-4 sm:p-8 text-center border-[0.5px] border-[#C9A96E]/50 m-2">
                    <p className="font-script text-3xl sm:text-4xl text-[#C9A96E] mt-2 sm:mt-4 relative z-10">M &amp; R</p>
                  </div>
                </motion.div>

                {/* Envelope Flaps */}
                <motion.div className="absolute inset-0 bg-[#E3D8C3] envelope-fold-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                  <div className="absolute inset-2 border-[0.5px] border-[#C9A96E] opacity-20 pointer-events-none" />
                </motion.div>
                <motion.div className="absolute inset-0 bg-[#EAE1CF] envelope-fold-left shadow-[5px_0_15px_rgba(0,0,0,0.03)] z-10" />
                <motion.div className="absolute inset-0 bg-[#EAE1CF] envelope-fold-right shadow-[-5px_0_15px_rgba(0,0,0,0.03)] z-10" />
                <motion.div
                  className="absolute inset-0 bg-[#D8CBB3] envelope-fold-top drop-shadow-md z-30"
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: isOpen ? 180 : 0 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'top' }}
                />

                {/* Wax Seal */}
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full cursor-pointer z-40 flex items-center justify-center pointer-events-auto"
                  whileHover={{ scale: 1.08 }}
                  animate={{
                    scale: isOpen ? 0 : [1, 1.04, 1],
                    opacity: isOpen ? 0 : 1,
                  }}
                  transition={{
                    scale: isOpen ? { duration: 0.3 } : { repeat: Infinity, duration: 2.8, ease: 'easeInOut' },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen();
                  }}
                >
                  <div className="absolute inset-0 bg-[#C9A96E]/25 rounded-full blur-2xl animate-pulse" />
                  <WaxSealSVG />
                </motion.div>

                {/* Texture + border */}
                <div className="absolute inset-3 border-[0.5px] border-[#C9A96E] opacity-35 z-0 pointer-events-none" />
              </div>
            </div>

            {!isOpen && (
              <motion.p
                className="absolute bottom-8 sm:bottom-12 text-[#3C3228]/50 font-serif tracking-[0.35em] text-xs sm:text-sm uppercase"
                animate={{ opacity: [0.35, 0.9, 0.35] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                Tap to open
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="w-full min-h-[100dvh] bg-[#EDE4D3] z-10 relative flex flex-col items-center pt-8 sm:pt-16 pb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <div
              className="w-full max-w-2xl lg:max-w-3xl mx-auto min-h-screen px-4 sm:px-8 py-12 md:py-24 flex flex-col items-center relative shadow-2xl bg-[#FAF7F2] shadow-black/40 border border-[#C9A96E]/25 overflow-hidden"
              style={{ '--floral-h': 'clamp(150px, 30vw, 280px)', paddingBottom: 'calc(var(--floral-h) + 28px)' } as React.CSSProperties}
            >

              {/* Double border frame */}
              <div className="absolute inset-3 sm:inset-5 border border-[#C9A96E]/60 pointer-events-none z-10 opacity-65" />
              <div className="absolute inset-5 sm:inset-7 border-[0.5px] border-[#C9A96E]/35 pointer-events-none z-10 opacity-45" />

              {/* Botanical illustration florals — matching Eddie & Farah reference style */}
              <motion.img
                src="/floral-top-left.png"
                alt=""
                className="absolute top-0 left-0 pointer-events-none select-none"
                style={{ width: 'clamp(170px, 42%, 300px)', zIndex: 5, transformOrigin: 'top left' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}
              />
              <motion.img
                src="/floral-top-right.png"
                alt=""
                className="absolute top-0 right-0 pointer-events-none select-none"
                style={{ width: 'clamp(170px, 42%, 300px)', zIndex: 5, transformOrigin: 'top right' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: 0.2 }}
              />
              {/* Bottom floral frame — cropped to its densest band, height reserved via padding so content never overlaps it */}
              <motion.img
                src="/floral-bottom.png"
                alt=""
                className="absolute bottom-0 left-0 right-0 w-full pointer-events-none select-none"
                style={{ height: 'var(--floral-h)', objectFit: 'cover', objectPosition: 'bottom', zIndex: 1 } as React.CSSProperties}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: 0.4 }}
              />

              {/* Content */}
              <div className="w-full flex-grow flex flex-col items-center justify-center relative z-20 space-y-8 sm:space-y-10 py-16 sm:py-20 px-4">

                {/* Header tagline */}
                <motion.div
                  className="flex items-center gap-3 sm:gap-4 text-center mt-8 sm:mt-0"
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  <span className="text-[#C9A96E] text-sm">✦</span>
                  <p className="tracking-[0.18em] sm:tracking-[0.22em] text-[10px] sm:text-xs uppercase text-[#3C3228]/65 font-medium">Together with their families</p>
                  <span className="text-[#C9A96E] text-sm">✦</span>
                </motion.div>

                {/* Names */}
                <motion.div
                  className="text-center w-full my-2 sm:my-6"
                  initial={{ opacity: 0, y: 40, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 1, ease: 'easeOut' }}
                >
                  <h1 className="font-script text-[4.5rem] sm:text-[6.5rem] md:text-[8rem] text-[#3C3228] leading-[0.85] tracking-normal mb-1 sm:mb-3" style={{ textShadow: '1px 2px 0px rgba(201,169,110,0.35)' }}>
                    Mohammad
                  </h1>
                  <div className="flex items-center justify-center gap-3 sm:gap-5 my-3 sm:my-5">
                    <div className="w-10 sm:w-20 h-[0.5px] bg-gradient-to-r from-transparent to-[#C9A96E]" />
                    <span className="text-3xl sm:text-5xl text-[#C9A96E] font-script drop-shadow-sm">&amp;</span>
                    <div className="w-10 sm:w-20 h-[0.5px] bg-gradient-to-l from-transparent to-[#C9A96E]" />
                  </div>
                  <h1 className="font-script text-[4.5rem] sm:text-[6.5rem] md:text-[8rem] text-[#3C3228] leading-[0.85] tracking-normal mt-1 sm:mt-3" style={{ textShadow: '1px 2px 0px rgba(201,169,110,0.35)' }}>
                    Renad
                  </h1>
                </motion.div>

                {/* Request line */}
                <motion.div
                  className="text-center max-w-sm mx-auto"
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  <p className="text-base sm:text-lg text-[#3C3228]/75 leading-relaxed italic font-serif px-4">
                    joyfully request the honor of your presence<br />at their wedding celebration
                  </p>
                </motion.div>

                {/* Date — clean, no banner */}
                <motion.div
                  className="flex items-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm mx-auto"
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  <div className="h-[0.5px] flex-1 bg-gradient-to-r from-transparent via-[#C9A96E]/60 to-[#C9A96E]/60" />
                  <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-[#3C3228]/65 font-serif whitespace-nowrap">
                    Saturday · July 25 · 2026
                  </p>
                  <div className="h-[0.5px] flex-1 bg-gradient-to-l from-transparent via-[#C9A96E]/60 to-[#C9A96E]/60" />
                </motion.div>

                {/* Venue */}
                <motion.div
                  className="flex flex-col items-center w-full max-w-[300px] sm:max-w-sm mx-auto mt-2 sm:mt-4"
                  initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 1, ease: 'easeOut' }}
                >
                  <div className="p-6 sm:p-10 bg-[#FDFBF7] border-[0.5px] border-[#C9A96E]/50 rounded-t-full w-full flex flex-col items-center gap-2 sm:gap-3 shadow-sm relative overflow-hidden">
                    <PineTreeSVG />
                    <div className="text-center z-10 mt-1">
                      <p className="text-2xl sm:text-3xl font-medium tracking-wider mb-1.5 text-[#3C3228] font-serif">Tal Pine</p>
                      <div className="h-[0.5px] w-10 bg-[#C9A96E] mx-auto mb-2.5" />
                      <p className="text-xs sm:text-sm text-[#3C3228]/75 italic tracking-wide">At four o'clock in the afternoon</p>
                      <p className="text-[10px] sm:text-xs text-[#3C3228]/55 mt-2.5 uppercase tracking-widest">Formal Attire Requested</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 sm:gap-3 mt-4 w-full">
                    <a
                      href={MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 border border-[#C9A96E]/70 bg-transparent hover:bg-[#C9A96E]/8 transition-colors text-[#3C3228]/75 text-[10px] sm:text-xs uppercase tracking-widest font-serif"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      Get Directions
                    </a>

                    <div className="flex-1 relative">
                      <button
                        onClick={() => setShowCalendar((v) => !v)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 border border-[#C9A96E]/70 bg-transparent hover:bg-[#C9A96E]/8 transition-colors text-[#3C3228]/75 text-[10px] sm:text-xs uppercase tracking-widest font-serif"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        Add to Calendar
                      </button>
                      <AnimatePresence>
                        {showCalendar && (
                          <CalendarMenu onClose={() => setShowCalendar(false)} />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </div>

              <DividerSVG />
              <CountdownTimer />
              <DividerSVG />

              {/* RSVP */}
              <motion.div
                className="w-full max-w-md mx-auto text-center space-y-5 sm:space-y-7 px-4 relative z-20"
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 1, ease: 'easeOut' }}
              >
                <h2 className="font-script text-4xl sm:text-5xl md:text-6xl text-[#3C3228] mb-1 sm:mb-3">RSVP</h2>
                <p className="text-base sm:text-lg text-[#3C3228]/75 italic mb-5 sm:mb-7 font-serif">Will you be joining us?</p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center w-full px-4">
                  <button
                    onClick={() => toast({ title: 'Joyfully Accepted!', description: "We can't wait to celebrate with you.", duration: 5000 })}
                    className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-br from-[#C9A96E] to-[#A07840] text-[#FAF7F2] rounded-none uppercase tracking-widest text-[10px] sm:text-xs font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto"
                  >
                    <div className="absolute inset-[3px] border-[0.5px] border-[#FAF7F2]/40 pointer-events-none transition-transform group-hover:scale-[0.98]" />
                    Joyfully Accepts
                  </button>
                  <button
                    onClick={() => toast({ title: 'Regretfully Declined', description: 'You will be dearly missed.', duration: 5000 })}
                    className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-[#A07840] border border-[#C9A96E] hover:bg-[#C9A96E]/5 transition-all uppercase tracking-widest text-[10px] sm:text-xs font-semibold w-full sm:w-auto shadow-sm"
                  >
                    <div className="absolute inset-[3px] border-[0.5px] border-[#C9A96E]/30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    Regretfully Declines
                  </button>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const distance = COUNTDOWN_TARGET - now;
      if (distance < 0) { clearInterval(timer); return; }
      setTimeLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="w-full max-w-xl mx-auto text-center px-2 sm:px-4 relative z-20"
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="h-[0.5px] bg-gradient-to-r from-transparent via-[#C9A96E]/50 to-transparent flex-1 max-w-[80px] sm:max-w-[110px]" />
        <p className="tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs uppercase text-[#C9A96E] font-medium font-serif">Counting down to forever</p>
        <div className="h-[0.5px] bg-gradient-to-r from-transparent via-[#C9A96E]/50 to-transparent flex-1 max-w-[80px] sm:max-w-[110px]" />
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
        {[
          { label: 'Days', value: timeLeft.days },
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Mins', value: timeLeft.minutes },
          { label: 'Secs', value: timeLeft.seconds },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center group">
            <div className="w-14 h-16 sm:w-20 sm:h-24 md:w-24 md:h-28 flex items-center justify-center bg-[#FAF7F2] border-[0.5px] border-[#C9A96E]/55 shadow-md relative overflow-hidden mb-2 sm:mb-3 group-hover:shadow-lg transition-shadow">
              <div className="absolute inset-1 border-[0.5px] border-dashed border-[#C9A96E]/25 pointer-events-none" />
              <div className="absolute top-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-l border-[#C9A96E]" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-r border-[#C9A96E]" />
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-l border-[#C9A96E]" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-r border-[#C9A96E]" />
              <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={value}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl sm:text-4xl md:text-5xl text-[#3C3228] font-medium font-serif block absolute"
                  >
                    {value.toString().padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <span className="text-[9px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest text-[#3C3228]/55 font-serif">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
