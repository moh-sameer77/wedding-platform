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

const PostageStamp = () => (
  <div
    className="absolute top-3 right-3 w-14 h-[4.2rem] z-10 rotate-[3deg]"
    style={{
      background: '#FAF7F2',
      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
      backgroundImage: 'radial-gradient(circle, transparent 3.5px, #FAF7F2 3.5px)',
      backgroundSize: '7px 7px',
      backgroundPosition: '-3.5px -3.5px',
    }}
  >
    <div className="absolute inset-[5px] border border-[#C9A96E]/70 flex flex-col items-center justify-center gap-0.5 overflow-hidden bg-[#FAF7F2]">
      <svg viewBox="0 0 44 36" className="w-9 h-7">
        <defs>
          <radialGradient id="s-rose" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#FDECEC" />
            <stop offset="50%" stopColor="#D4A0A0" />
            <stop offset="100%" stopColor="#B07070" />
          </radialGradient>
          <radialGradient id="s-rose2" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#F8E0E0" />
            <stop offset="100%" stopColor="#C08080" />
          </radialGradient>
          <linearGradient id="s-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B4D0B4" />
            <stop offset="100%" stopColor="#6B9B6B" />
          </linearGradient>
        </defs>
        {/* Leaves */}
        <path d="M 5 30 Q 0 22 6 18 Q 12 22 5 30 Z" fill="url(#s-leaf)" opacity="0.9" />
        <path d="M 39 30 Q 44 22 38 18 Q 32 22 39 30 Z" fill="url(#s-leaf)" opacity="0.9" />
        <path d="M 20 32 Q 15 25 22 22 Q 29 25 20 32 Z" fill="url(#s-leaf)" opacity="0.8" />
        {/* Small roses */}
        <circle cx="7" cy="18" r="5" fill="url(#s-rose2)" />
        <path d="M 4 15 C 7 12, 10 16, 7 20 C 4 22, 2 17, 4 15 Z" fill="#FDECEC" opacity="0.7" />
        <circle cx="37" cy="18" r="5" fill="url(#s-rose2)" />
        <path d="M 34 15 C 37 12, 40 16, 37 20 C 34 22, 32 17, 34 15 Z" fill="#FDECEC" opacity="0.7" />
        {/* Main central rose */}
        <circle cx="22" cy="15" r="9" fill="url(#s-rose)" />
        <path d="M 16 10 C 22 5, 30 11, 24 19 C 17 27, 12 17, 16 10 Z" fill="url(#s-rose)" opacity="0.8" />
        <path d="M 18 12 C 22 9, 27 13, 22 18 C 17 22, 14 16, 18 12 Z" fill="#FDECEC" opacity="0.7" />
        <path d="M 20 14 C 22 12, 24 15, 22 17 C 20 19, 19 15, 20 14 Z" fill="white" opacity="0.5" />
      </svg>
      <span className="text-[4.5px] uppercase tracking-wider text-[#C9A96E] font-serif leading-none">Jordan · 2026</span>
    </div>
  </div>
);

const PetalSVG = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 20 30" className={className} style={style}>
    {/* No shared defs — use direct fill to avoid ID collisions across instances */}
    <path d="M10,0 C15,0 20,10 15,20 C10,30 5,25 0,15 C-2,5 5,0 10,0 Z" fill="#D4A0A0" opacity="0.72" />
  </svg>
);

const FloatingPetals = () => (
  <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
    {Array.from({ length: 14 }).map((_, i) => {
      const left = `${(i * 7.2) % 100}%`;
      const delay = i * 1.8;
      const duration = 14 + (i % 5) * 3;
      const scale = 0.45 + (i % 4) * 0.18;
      return (
        <motion.div
          key={i}
          className="absolute top-[-50px]"
          style={{ left }}
          initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: ['-10vh', '110vh'],
            x: [0, (i % 2 === 0 ? 60 : -60), (i % 2 === 0 ? -40 : 40), 0],
            rotate: [0, 180, 360],
            opacity: [0, 0.65, 0.65, 0],
          }}
          transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
        >
          <PetalSVG className="w-4 h-6" style={{ transform: `scale(${scale})` }} />
        </motion.div>
      );
    })}
  </div>
);

/** Large watercolor-style rose cluster — used as background decoration */
let _wcId = 0;
const WatercolorRoseCluster = ({ opacity = 0.18 }: { opacity?: number }) => {
  // Each instance gets a unique prefix so gradient/filter IDs don't collide across instances
  const prefix = React.useRef(`wc${++_wcId}`).current;
  return (
  <svg viewBox="0 0 300 300" className="w-full h-full" style={{ opacity }}>
    <defs>
      <radialGradient id={`${prefix}-rose-a`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FDECEC" />
        <stop offset="45%" stopColor="#D4A0A0" />
        <stop offset="100%" stopColor="#A86060" />
      </radialGradient>
      <radialGradient id={`${prefix}-rose-b`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#F8E6E6" />
        <stop offset="50%" stopColor="#C98080" />
        <stop offset="100%" stopColor="#905050" />
      </radialGradient>
      <radialGradient id={`${prefix}-rose-c`} cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FBF0F0" />
        <stop offset="55%" stopColor="#E0AAAA" />
        <stop offset="100%" stopColor="#B07070" />
      </radialGradient>
      <linearGradient id={`${prefix}-leaf-a`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#B8D4B8" />
        <stop offset="100%" stopColor="#5A8A5A" />
      </linearGradient>
      <linearGradient id={`${prefix}-leaf-b`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#A8C8A8" />
        <stop offset="100%" stopColor="#4A7A4A" />
      </linearGradient>
      <filter id={`${prefix}-blur`}>
        <feGaussianBlur stdDeviation="1.5" />
      </filter>
    </defs>

    {/* Leaves */}
    <path d="M 60 240 Q 20 200 40 160 Q 80 180 60 240 Z" fill={`url(#${prefix}-leaf-a)`} opacity="0.85" />
    <path d="M 90 260 Q 60 220 80 185 Q 115 200 90 260 Z" fill={`url(#${prefix}-leaf-b)`} opacity="0.8" />
    <path d="M 200 60 Q 240 20 260 55 Q 245 90 200 60 Z" fill={`url(#${prefix}-leaf-a)`} opacity="0.85" />
    <path d="M 170 40 Q 200 10 225 38 Q 205 70 170 40 Z" fill={`url(#${prefix}-leaf-b)`} opacity="0.8" />
    <path d="M 140 220 Q 120 260 155 265 Q 170 235 140 220 Z" fill={`url(#${prefix}-leaf-a)`} opacity="0.75" />
    <path d="M 230 160 Q 270 150 268 185 Q 240 195 230 160 Z" fill={`url(#${prefix}-leaf-b)`} opacity="0.75" />

    {/* Small bud top right */}
    <g transform="translate(225, 50) scale(0.65)">
      <circle cx="30" cy="30" r="26" fill={`url(#${prefix}-rose-c)`} filter={`url(#${prefix}-blur)`} />
      <path d="M 14 12 C 30 2, 48 18, 36 36 C 22 52, 8 32, 14 12 Z" fill={`url(#${prefix}-rose-c)`} />
      <path d="M 20 18 C 30 10, 42 22, 34 32 C 24 42, 14 28, 20 18 Z" fill="#FBF0F0" opacity="0.65" />
    </g>

    {/* Small rose bottom left */}
    <g transform="translate(35, 190) scale(0.7) rotate(-20)">
      <circle cx="30" cy="30" r="26" fill={`url(#${prefix}-rose-b)`} filter={`url(#${prefix}-blur)`} />
      <path d="M 12 12 C 30 0, 50 18, 38 38 C 24 56, 6 34, 12 12 Z" fill={`url(#${prefix}-rose-b)`} />
      <path d="M 18 18 C 30 8, 44 22, 36 34 C 24 46, 12 30, 18 18 Z" fill="#F8E6E6" opacity="0.65" />
    </g>

    {/* Medium rose mid */}
    <g transform="translate(155, 140) scale(0.85) rotate(15)">
      <circle cx="35" cy="35" r="30" fill={`url(#${prefix}-rose-c)`} filter={`url(#${prefix}-blur)`} />
      <path d="M 15 10 C 35 -5, 58 18, 46 42 C 32 64, 8 42, 15 10 Z" fill={`url(#${prefix}-rose-c)`} />
      <path d="M 20 16 C 35 5, 52 22, 42 38 C 28 54, 14 34, 20 16 Z" fill="#FBF0F0" opacity="0.6" />
      <path d="M 28 24 C 35 18, 44 26, 38 34 C 30 42, 23 32, 28 24 Z" fill="white" opacity="0.4" />
    </g>

    {/* Main large rose center */}
    <g transform="translate(70, 70)">
      <circle cx="60" cy="60" r="55" fill={`url(#${prefix}-rose-a)`} filter={`url(#${prefix}-blur)`} opacity="0.9" />
      <path d="M 25 15 C 60 -8, 100 28, 82 70 C 62 112, 12 80, 25 15 Z" fill={`url(#${prefix}-rose-a)`} />
      <path d="M 32 22 C 60 5, 94 34, 78 68 C 60 100, 18 70, 32 22 Z" fill={`url(#${prefix}-rose-b)`} opacity="0.75" />
      <path d="M 40 32 C 60 18, 84 40, 72 64 C 56 86, 28 62, 40 32 Z" fill="#FDECEC" opacity="0.7" />
      <path d="M 48 42 C 60 32, 76 46, 66 62 C 54 76, 40 58, 48 42 Z" fill="white" opacity="0.55" />
      <path d="M 54 50 C 60 44, 68 52, 62 60 C 56 66, 50 56, 54 50 Z" fill="white" opacity="0.4" />
    </g>
  </svg>
  );
};

const DividerSVG = () => (
  <div className="w-full max-w-md mx-auto my-10 sm:my-14 flex justify-center opacity-75">
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
  </div>
);

const GarlandSVG = () => (
  <svg viewBox="0 0 1000 90" preserveAspectRatio="none" className="w-full h-20 sm:h-28 pointer-events-none">
    <defs>
      <linearGradient id="garland-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#B4D0B4" />
        <stop offset="100%" stopColor="#5A8A5A" />
      </linearGradient>
      <radialGradient id="garland-rose" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FDECEC" />
        <stop offset="55%" stopColor="#D4A0A0" />
        <stop offset="100%" stopColor="#A86060" />
      </radialGradient>
      <radialGradient id="garland-rose-sm" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#F8E6E6" />
        <stop offset="100%" stopColor="#C08080" />
      </radialGradient>
    </defs>
    <path d="M -40 15 Q 250 70 500 35 T 1040 15" fill="none" stroke="#8FAF8F" strokeWidth="2" opacity="0.5" />
    <path d="M 0 0 Q 280 85 500 50 T 1000 0" fill="none" stroke="#6B9B6B" strokeWidth="1.5" opacity="0.7" />

    {[
      { x: 80,  y: 42, r: 30, rose: true },
      { x: 200, y: 66, r: 22, rose: false },
      { x: 340, y: 56, r: 26, rose: true },
      { x: 500, y: 46, r: 28, rose: false },
      { x: 650, y: 58, r: 24, rose: true },
      { x: 790, y: 68, r: 22, rose: false },
      { x: 920, y: 44, r: 26, rose: true },
    ].map((pt, i) => (
      <g key={i} transform={`translate(${pt.x}, ${pt.y}) rotate(${i % 2 === 0 ? 12 : -12})`}>
        <path d="M 0 0 Q 14 18 0 28 Q -14 18 0 0 Z" fill="url(#garland-leaf)" transform="scale(0.9) rotate(50)" opacity="0.8" />
        <path d="M 0 0 Q 18 8 28 0 Q 18 -8 0 0 Z" fill="url(#garland-leaf)" transform="scale(0.8) rotate(-25)" opacity="0.8" />
        <path d="M 0 0 Q -14 18 0 28 Q 14 18 0 0 Z" fill="url(#garland-leaf)" transform="scale(0.7) rotate(130)" opacity="0.7" />
        {pt.rose ? (
          <g>
            <circle cx="0" cy="0" r="11" fill="url(#garland-rose)" opacity="0.9" />
            <path d="M -6 -7 C 0 -12, 8 -4, 4 6 C 0 14, -8 6, -6 -7 Z" fill="url(#garland-rose)" opacity="0.75" />
            <path d="M -3 -4 C 0 -8, 6 -2, 3 4 C 0 9, -4 3, -3 -4 Z" fill="#FDECEC" opacity="0.6" />
          </g>
        ) : (
          <circle cx="0" cy="0" r="7" fill="url(#garland-rose-sm)" opacity="0.75" />
        )}
      </g>
    ))}
  </svg>
);

const PineTreeSVG = () => (
  <svg viewBox="0 0 50 65" className="w-10 h-12 sm:w-12 sm:h-14 mb-1">
    <path d="M 25 58 L 25 65" stroke="#7A5A2B" strokeWidth="3" strokeLinecap="round" />
    <path d="M 25 38 L 44 58 L 6 58 Z" fill="#4A7A4A" stroke="#3A6A3A" strokeWidth="0.5" />
    <path d="M 25 20 L 40 40 L 10 40 Z" fill="#5A8A5A" stroke="#4A7A4A" strokeWidth="0.5" />
    <path d="M 25 5 L 37 26 L 13 26 Z" fill="#6B9B6B" stroke="#5A8A5A" strokeWidth="0.5" />
  </svg>
);

const Sparkles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
    {Array.from({ length: 14 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-[#C9A96E]/40 font-serif"
        style={{
          left: `${(i * 13 + 5) % 95}%`,
          top: `${(i * 17 + 8) % 90}%`,
          fontSize: `${7 + (i % 4) * 3}px`,
        }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.3, 0.5] }}
        transition={{ duration: 2.5 + (i % 3), delay: (i * 0.7) % 5, repeat: Infinity }}
      >
        ✦
      </motion.div>
    ))}
  </div>
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

                <PostageStamp />

                {/* Scattered petals on envelope */}
                {[
                  { top: '15%', left: '12%', r: 45 },
                  { top: '70%', left: '20%', r: 120 },
                  { top: '25%', left: '75%', r: 200 },
                  { top: '60%', left: '65%', r: 80 },
                  { top: '45%', left: '8%',  r: 160 },
                  { top: '80%', left: '55%', r: 30 },
                ].map((p, i) => (
                  <PetalSVG
                    key={`env-petal-${i}`}
                    className="absolute w-3 h-4 opacity-60 z-10 pointer-events-none"
                    style={{ top: p.top, left: p.left, transform: `rotate(${p.r}deg) scale(0.8)` }}
                  />
                ))}
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
            <FloatingPetals />

            <div className="w-full max-w-2xl lg:max-w-3xl mx-auto min-h-screen px-4 sm:px-8 py-12 md:py-24 flex flex-col items-center relative shadow-2xl bg-[#FAF7F2] shadow-black/40 border border-[#C9A96E]/25 overflow-hidden">

              {/* Double border frame */}
              <div className="absolute inset-3 sm:inset-5 border border-[#C9A96E]/60 pointer-events-none z-10 opacity-65" />
              <div className="absolute inset-5 sm:inset-7 border-[0.5px] border-[#C9A96E]/35 pointer-events-none z-10 opacity-45" />

              {/* Lush watercolor rose background — corners */}
              <div className="absolute -top-16 -left-16 w-72 h-72 sm:w-96 sm:h-96 pointer-events-none" style={{ zIndex: 0 }}>
                <WatercolorRoseCluster opacity={0.22} />
              </div>
              <div className="absolute -bottom-16 -right-16 w-72 h-72 sm:w-96 sm:h-96 pointer-events-none rotate-180" style={{ zIndex: 0 }}>
                <WatercolorRoseCluster opacity={0.22} />
              </div>
              <div className="absolute -top-10 -right-10 w-56 h-56 sm:w-72 sm:h-72 pointer-events-none rotate-90" style={{ zIndex: 0 }}>
                <WatercolorRoseCluster opacity={0.16} />
              </div>
              <div className="absolute -bottom-10 -left-10 w-56 h-56 sm:w-72 sm:h-72 pointer-events-none -rotate-90" style={{ zIndex: 0 }}>
                <WatercolorRoseCluster opacity={0.16} />
              </div>

              <Sparkles />

              {/* Top garland */}
              <div className="absolute top-0 inset-x-0 z-10 pointer-events-none flex justify-center">
                <GarlandSVG />
              </div>

              {/* Corner rose clusters — on top of bg */}
              <motion.div
                className="absolute top-2 left-2 z-10 pointer-events-none"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5 }}
              >
                <svg viewBox="0 0 180 180" className="w-36 h-36 sm:w-52 sm:h-52">
                  <defs>
                    <radialGradient id="cr-rose" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#FDECEC" /><stop offset="50%" stopColor="#D4A0A0" /><stop offset="100%" stopColor="#A86060" />
                    </radialGradient>
                    <linearGradient id="cr-leaf" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#B4D0B4" /><stop offset="100%" stopColor="#5A8A5A" />
                    </linearGradient>
                  </defs>
                  <path d="M 8 160 Q -10 120 15 85 Q 50 110 8 160 Z" fill="url(#cr-leaf)" opacity="0.8" />
                  <path d="M 30 170 Q 10 135 35 100 Q 65 120 30 170 Z" fill="url(#cr-leaf)" opacity="0.7" />
                  <path d="M 80 20 Q 110 -10 130 15 Q 115 50 80 20 Z" fill="url(#cr-leaf)" opacity="0.8" />
                  <path d="M 55 10 Q 80 -15 100 10 Q 85 40 55 10 Z" fill="url(#cr-leaf)" opacity="0.7" />
                  <g transform="translate(25, 75)">
                    <circle cx="35" cy="35" r="30" fill="url(#cr-rose)" opacity="0.85" />
                    <path d="M 12 10 C 35 -2, 60 20, 46 48 C 30 70, 5 45, 12 10 Z" fill="url(#cr-rose)" />
                    <path d="M 18 16 C 35 6, 55 24, 42 44 C 26 62, 10 38, 18 16 Z" fill="#FDECEC" opacity="0.65" />
                    <path d="M 26 24 C 35 16, 46 28, 40 40 C 30 50, 20 36, 26 24 Z" fill="white" opacity="0.4" />
                  </g>
                  <g transform="translate(80, 10) scale(0.6)">
                    <circle cx="28" cy="28" r="22" fill="url(#cr-rose)" opacity="0.8" />
                    <path d="M 10 8 C 28 -2, 48 16, 36 40 C 22 58, 4 34, 10 8 Z" fill="url(#cr-rose)" opacity="0.75" />
                    <path d="M 16 14 C 28 5, 44 20, 34 36 C 22 50, 10 28, 16 14 Z" fill="#FDECEC" opacity="0.6" />
                  </g>
                  <g transform="translate(5, 55) scale(0.55)">
                    <circle cx="24" cy="24" r="20" fill="url(#cr-rose)" opacity="0.78" />
                    <path d="M 8 6 C 24 -2, 42 14, 30 34 C 18 52, 2 28, 8 6 Z" fill="url(#cr-rose)" opacity="0.7" />
                    <path d="M 14 12 C 24 4, 38 18, 28 30 C 18 44, 8 24, 14 12 Z" fill="#FDECEC" opacity="0.55" />
                  </g>
                </svg>
              </motion.div>

              <motion.div
                className="absolute bottom-2 right-2 z-10 pointer-events-none rotate-180"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5 }}
              >
                <svg viewBox="0 0 180 180" className="w-36 h-36 sm:w-52 sm:h-52">
                  <defs>
                    <radialGradient id="cr-rose2" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#FDECEC" /><stop offset="50%" stopColor="#D4A0A0" /><stop offset="100%" stopColor="#A86060" />
                    </radialGradient>
                    <linearGradient id="cr-leaf2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#B4D0B4" /><stop offset="100%" stopColor="#5A8A5A" />
                    </linearGradient>
                  </defs>
                  <path d="M 8 160 Q -10 120 15 85 Q 50 110 8 160 Z" fill="url(#cr-leaf2)" opacity="0.8" />
                  <path d="M 30 170 Q 10 135 35 100 Q 65 120 30 170 Z" fill="url(#cr-leaf2)" opacity="0.7" />
                  <path d="M 80 20 Q 110 -10 130 15 Q 115 50 80 20 Z" fill="url(#cr-leaf2)" opacity="0.8" />
                  <g transform="translate(25, 75)">
                    <circle cx="35" cy="35" r="30" fill="url(#cr-rose2)" opacity="0.85" />
                    <path d="M 12 10 C 35 -2, 60 20, 46 48 C 30 70, 5 45, 12 10 Z" fill="url(#cr-rose2)" />
                    <path d="M 18 16 C 35 6, 55 24, 42 44 C 26 62, 10 38, 18 16 Z" fill="#FDECEC" opacity="0.65" />
                    <path d="M 26 24 C 35 16, 46 28, 40 40 C 30 50, 20 36, 26 24 Z" fill="white" opacity="0.4" />
                  </g>
                  <g transform="translate(80, 10) scale(0.6)">
                    <circle cx="28" cy="28" r="22" fill="url(#cr-rose2)" opacity="0.8" />
                    <path d="M 10 8 C 28 -2, 48 16, 36 40 C 22 58, 4 34, 10 8 Z" fill="url(#cr-rose2)" opacity="0.75" />
                    <path d="M 16 14 C 28 5, 44 20, 34 36 C 22 50, 10 28, 16 14 Z" fill="#FDECEC" opacity="0.6" />
                  </g>
                </svg>
              </motion.div>

              <motion.div
                className="absolute top-2 right-2 z-10 pointer-events-none"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, delay: 0.3 }}
              >
                <svg viewBox="0 0 140 140" className="w-28 h-28 sm:w-40 sm:h-40">
                  <defs>
                    <radialGradient id="cr-rose3" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#FDECEC" /><stop offset="50%" stopColor="#D4A0A0" /><stop offset="100%" stopColor="#A86060" />
                    </radialGradient>
                    <linearGradient id="cr-leaf3" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#B4D0B4" /><stop offset="100%" stopColor="#5A8A5A" />
                    </linearGradient>
                  </defs>
                  <path d="M 120 20 Q 150 -5 140 30 Q 110 50 120 20 Z" fill="url(#cr-leaf3)" opacity="0.75" />
                  <path d="M 100 8 Q 130 -8 125 20 Q 98 35 100 8 Z" fill="url(#cr-leaf3)" opacity="0.7" />
                  <g transform="translate(55, 30) rotate(-20)">
                    <circle cx="28" cy="28" r="24" fill="url(#cr-rose3)" opacity="0.82" />
                    <path d="M 10 8 C 28 -2, 48 16, 36 42 C 22 60, 4 34, 10 8 Z" fill="url(#cr-rose3)" opacity="0.8" />
                    <path d="M 16 14 C 28 4, 44 20, 34 38 C 22 52, 8 28, 16 14 Z" fill="#FDECEC" opacity="0.6" />
                  </g>
                </svg>
              </motion.div>

              <motion.div
                className="absolute bottom-2 left-2 z-10 pointer-events-none"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, delay: 0.3 }}
              >
                <svg viewBox="0 0 140 140" className="w-28 h-28 sm:w-40 sm:h-40">
                  <defs>
                    <radialGradient id="cr-rose4" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#FDECEC" /><stop offset="50%" stopColor="#D4A0A0" /><stop offset="100%" stopColor="#A86060" />
                    </radialGradient>
                    <linearGradient id="cr-leaf4" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#B4D0B4" /><stop offset="100%" stopColor="#5A8A5A" />
                    </linearGradient>
                  </defs>
                  <path d="M 20 120 Q -5 145 30 140 Q 50 115 20 120 Z" fill="url(#cr-leaf4)" opacity="0.75" />
                  <path d="M 8 100 Q -8 130 20 128 Q 35 102 8 100 Z" fill="url(#cr-leaf4)" opacity="0.7" />
                  <g transform="translate(30, 40) rotate(20)">
                    <circle cx="28" cy="28" r="24" fill="url(#cr-rose4)" opacity="0.82" />
                    <path d="M 10 8 C 28 -2, 48 16, 36 42 C 22 60, 4 34, 10 8 Z" fill="url(#cr-rose4)" opacity="0.8" />
                    <path d="M 16 14 C 28 4, 44 20, 34 38 C 22 52, 8 28, 16 14 Z" fill="#FDECEC" opacity="0.6" />
                  </g>
                </svg>
              </motion.div>

              {/* Content */}
              <div className="w-full flex-grow flex flex-col items-center justify-center relative z-20 space-y-8 sm:space-y-10 py-16 sm:py-20 px-4">

                {/* Header tagline */}
                <motion.div
                  className="flex items-center gap-3 sm:gap-4 text-center mt-8 sm:mt-0"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }}
                >
                  <span className="text-[#C9A96E] text-sm">✦</span>
                  <p className="tracking-[0.18em] sm:tracking-[0.22em] text-[10px] sm:text-xs uppercase text-[#3C3228]/65 font-medium">Together with their families</p>
                  <span className="text-[#C9A96E] text-sm">✦</span>
                </motion.div>

                {/* Names */}
                <motion.div
                  className="text-center w-full my-2 sm:my-6"
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.4 }}
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
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.6 }}
                >
                  <p className="text-base sm:text-lg text-[#3C3228]/75 leading-relaxed italic font-serif px-4">
                    joyfully request the honor of your presence<br />at their wedding celebration
                  </p>
                </motion.div>

                {/* Date — clean, no banner */}
                <motion.div
                  className="flex items-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm mx-auto"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.8 }}
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
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 1 }}
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
                className="w-full max-w-md mx-auto text-center space-y-5 sm:space-y-7 pb-12 sm:pb-20 px-4 relative z-20"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1 }}
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
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
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
