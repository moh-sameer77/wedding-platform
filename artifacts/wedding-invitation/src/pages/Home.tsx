import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const COUNTDOWN_TARGET = new Date('2026-07-25T16:00:00').getTime();

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
      <radialGradient id="wax-grad" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#E8C87A" />
        <stop offset="40%" stopColor="#C9A96E" />
        <stop offset="85%" stopColor="#A07840" />
        <stop offset="100%" stopColor="#7A5A2B" />
      </radialGradient>
      <filter id="inner-shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#3C3228" floodOpacity="0.5" />
      </filter>
    </defs>
    
    {/* Base Wax blob */}
    <path d="M100,10C125,8 145,15 160,30C178,45 185,65 188,85C192,110 185,135 170,155C155,175 130,190 105,192C80,195 55,185 35,170C15,152 8,125 10,100C12,75 22,50 40,32C55,15 75,12 100,10Z" fill="url(#wax-grad)" filter="url(#wax-texture)" />
    
    {/* Inner raised rim */}
    <circle cx="100" cy="100" r="72" fill="none" stroke="#E8C87A" strokeWidth="6" opacity="0.8" filter="url(#inner-shadow)" />
    <circle cx="100" cy="100" r="66" fill="none" stroke="#7A5A2B" strokeWidth="1" opacity="0.6" />
    
    {/* Crest / shield border */}
    <path d="M100,45 C120,45 140,55 140,80 C140,110 100,140 100,145 C100,140 60,110 60,80 C60,55 80,45 100,45 Z" fill="none" stroke="#E8C87A" strokeWidth="2" opacity="0.9" />
    
    {/* Initials */}
    <text x="100" y="115" fontFamily="'Great Vibes', cursive" fontSize="60" fill="#E8C87A" textAnchor="middle" filter="url(#inner-shadow)">
      M <tspan fontSize="30" dy="-10">&amp;</tspan> R
    </text>
  </svg>
);

const PostageStamp = () => (
  <div className="absolute top-4 right-4 w-12 h-14 bg-[#FAF7F2] p-1 shadow-sm rotate-[4deg] border-[0.5px] border-dashed border-[#C9A96E]/50 z-10" style={{ backgroundImage: 'radial-gradient(transparent 4px, #FAF7F2 4px)', backgroundSize: '8px 8px', backgroundPosition: '-4px -4px' }}>
    <div className="w-full h-full border border-[#C9A96E] flex items-center justify-center relative overflow-hidden bg-[#FAF7F2]">
      <svg viewBox="0 0 50 60" className="w-full h-full opacity-80">
        <rect x="5" y="5" width="40" height="50" fill="none" stroke="#C9A96E" strokeWidth="1" />
        <path d="M 25 15 C 35 15, 35 25, 25 35 C 15 25, 15 15, 25 15 Z" fill="#D4A0A0" />
        <path d="M 25 35 Q 25 45 20 50" fill="none" stroke="#8FAF8F" strokeWidth="1.5" />
        <text x="25" y="48" fontFamily="'Cormorant Garamond', serif" fontSize="8" fill="#C9A96E" textAnchor="middle">2026</text>
      </svg>
    </div>
  </div>
);

const PetalSVG = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg viewBox="0 0 20 30" className={className} style={style}>
    <path d="M10,0 C15,0 20,10 15,20 C10,30 5,25 0,15 C-2,5 5,0 10,0 Z" fill="url(#petal-grad)" opacity="0.8" />
    <defs>
      <linearGradient id="petal-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F5E0E0" />
        <stop offset="100%" stopColor="#D4A0A0" />
      </linearGradient>
    </defs>
  </svg>
);

const FloatingPetals = () => (
  <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
    {Array.from({ length: 15 }).map((_, i) => {
      const left = `${Math.random() * 100}%`;
      const delay = Math.random() * 15;
      const duration = 15 + Math.random() * 10;
      const scale = 0.4 + Math.random() * 0.6;
      
      return (
        <motion.div
          key={i}
          className="absolute top-[-50px]"
          style={{ left }}
          initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 0 }}
          animate={{ 
            y: ['-10vh', '110vh'], 
            x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
            rotate: [0, 180, 360],
            opacity: [0, 0.6, 0.6, 0]
          }}
          transition={{ 
            duration,
            delay,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <PetalSVG className="w-4 h-6" style={{ transform: `scale(${scale})` }} />
        </motion.div>
      );
    })}
  </div>
);

const RoseCluster = ({ className, size = "large" }: { className?: string, size?: "large" | "small" }) => {
  const scale = size === "large" ? 1 : 0.7;
  const dims = size === "large" ? 'w-48 h-48 sm:w-64 sm:h-64' : 'w-32 h-32 sm:w-40 sm:h-40';
  return (
    <svg viewBox="0 0 200 200" className={`${dims} ${className}`}>
      <defs>
        <radialGradient id="rose-base" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDECEC" />
          <stop offset="60%" stopColor="#D4A0A0" />
          <stop offset="100%" stopColor="#A86A6A" />
        </radialGradient>
        <radialGradient id="rose-dark" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F5D0D0" />
          <stop offset="60%" stopColor="#C08080" />
          <stop offset="100%" stopColor="#8A5A5A" />
        </radialGradient>
        <linearGradient id="leaf-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5C4A5" />
          <stop offset="100%" stopColor="#6B8F6B" />
        </linearGradient>
      </defs>
      <g transform={`scale(${scale})`}>
        {/* Leaves */}
        <path d="M 50 150 Q 20 180 10 150 Q 20 120 50 150 Z" fill="url(#leaf-grad)" transform="rotate(15 50 150)" opacity="0.9" />
        <path d="M 150 50 Q 180 20 150 10 Q 120 20 150 50 Z" fill="url(#leaf-grad)" transform="rotate(-15 150 50)" opacity="0.9" />
        <path d="M 120 160 Q 140 190 160 160 Q 140 130 120 160 Z" fill="url(#leaf-grad)" opacity="0.9" />
        <path d="M 40 80 Q 10 70 30 50 Q 60 60 40 80 Z" fill="url(#leaf-grad)" opacity="0.9" />

        {/* Small rose 1 */}
        <g transform="translate(130, 40) scale(0.6)">
          <path d="M 30 10 C 60 -10, 80 30, 50 50 C 20 70, -10 30, 30 10 Z" fill="url(#rose-dark)" />
          <path d="M 25 15 C 50 0, 60 30, 40 40 C 15 50, 0 25, 25 15 Z" fill="url(#rose-base)" />
          <path d="M 35 25 C 45 20, 50 30, 40 35 C 30 40, 25 30, 35 25 Z" fill="#FDECEC" opacity="0.6" />
        </g>
        
        {/* Small rose 2 */}
        <g transform="translate(30, 110) scale(0.7) rotate(45)">
          <path d="M 30 10 C 60 -10, 80 30, 50 50 C 20 70, -10 30, 30 10 Z" fill="url(#rose-dark)" />
          <path d="M 25 15 C 50 0, 60 30, 40 40 C 15 50, 0 25, 25 15 Z" fill="url(#rose-base)" />
          <path d="M 35 25 C 45 20, 50 30, 40 35 C 30 40, 25 30, 35 25 Z" fill="#FDECEC" opacity="0.6" />
        </g>

        {/* Main Rose */}
        <g transform="translate(60, 50) scale(1.2)">
          <circle cx="40" cy="40" r="35" fill="url(#rose-dark)" />
          <path d="M 20 15 C 60 -5, 80 40, 50 60 C 20 80, -10 40, 20 15 Z" fill="url(#rose-base)" />
          <path d="M 25 25 C 55 10, 65 40, 45 50 C 15 60, 5 35, 25 25 Z" fill="url(#rose-dark)" opacity="0.8" />
          <path d="M 35 30 C 50 20, 55 40, 45 45 C 30 50, 25 35, 35 30 Z" fill="#FDECEC" opacity="0.7" />
          <path d="M 38 35 C 45 30, 48 38, 42 42 C 35 45, 32 38, 38 35 Z" fill="#E8C4C4" />
        </g>
      </g>
    </svg>
  );
};

const DividerSVG = () => (
  <div className="w-full max-w-md mx-auto my-12 sm:my-16 flex justify-center opacity-80">
    <svg viewBox="0 0 300 30" className="w-full h-6 sm:h-8">
      <path d="M 0 15 L 120 15" stroke="#C9A96E" strokeWidth="0.5" />
      <path d="M 180 15 L 300 15" stroke="#C9A96E" strokeWidth="0.5" />
      <path d="M 120 15 C 130 15, 135 5, 145 15 C 155 25, 160 15, 180 15" fill="none" stroke="#C9A96E" strokeWidth="1" />
      <path d="M 120 15 C 130 15, 135 25, 145 15 C 155 5, 160 15, 180 15" fill="none" stroke="#C9A96E" strokeWidth="1" />
      <circle cx="150" cy="15" r="4" fill="#C9A96E" />
      <circle cx="150" cy="15" r="2" fill="#FAF7F2" />
    </svg>
  </div>
);

const GarlandSVG = () => (
  <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-24 sm:h-32 opacity-70 pointer-events-none">
    <defs>
      <linearGradient id="garland-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#A5C4A5" />
        <stop offset="100%" stopColor="#6B8F6B" />
      </linearGradient>
      <radialGradient id="garland-rose" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FDECEC" />
        <stop offset="60%" stopColor="#D4A0A0" />
      </radialGradient>
    </defs>
    <path d="M -50 20 Q 250 80 500 40 T 1050 20" fill="none" stroke="#8FAF8F" strokeWidth="2" opacity="0.6" />
    <path d="M 0 0 Q 300 100 500 60 T 1000 0" fill="none" stroke="#6B8F6B" strokeWidth="1.5" />
    
    {[
      {x: 100, y: 50}, {x: 250, y: 80}, {x: 400, y: 65}, {x: 500, y: 55}, {x: 600, y: 65}, {x: 750, y: 80}, {x: 900, y: 50}
    ].map((pt, i) => (
      <g key={i} transform={`translate(${pt.x}, ${pt.y}) rotate(${i % 2 === 0 ? 15 : -15})`}>
        <path d="M 0 0 Q 15 20 0 30 Q -15 20 0 0 Z" fill="url(#garland-leaf)" transform="scale(0.8) rotate(45)" opacity="0.8" />
        <path d="M 0 0 Q 20 10 30 0 Q 20 -10 0 0 Z" fill="url(#garland-leaf)" transform="scale(0.7) rotate(-30)" opacity="0.8" />
        {i % 2 === 0 && (
          <circle cx="0" cy="0" r="8" fill="url(#garland-rose)" />
        )}
      </g>
    ))}
  </svg>
);

const BannerSVG = ({ text }: { text: string }) => (
  <div className="relative flex items-center justify-center w-full max-w-[320px] h-[50px] sm:h-[60px] mx-auto my-4 sm:my-8">
    <svg viewBox="0 0 300 60" className="absolute inset-0 w-full h-full drop-shadow-sm">
      <path d="M 10 30 L 40 30 L 40 50 L 25 40 L 10 50 Z" fill="#C9A96E" opacity="0.8" />
      <path d="M 290 30 L 260 30 L 260 50 L 275 40 L 290 50 Z" fill="#C9A96E" opacity="0.8" />
      <path d="M 30 10 L 270 10 L 270 40 L 30 40 Z" fill="#FAF7F2" stroke="#C9A96E" strokeWidth="1" />
      <path d="M 35 15 L 265 15 L 265 35 L 35 35 Z" fill="none" stroke="#C9A96E" strokeWidth="0.5" strokeDasharray="2,2" />
    </svg>
    <span className="relative z-10 font-serif text-[#3C3228] text-xs sm:text-sm uppercase tracking-[0.2em] pt-1">{text}</span>
  </div>
);

const PineTreeSVG = () => (
  <svg viewBox="0 0 50 60" className="w-10 h-10 sm:w-12 sm:h-12 mb-2">
    <path d="M 25 50 L 25 60" stroke="#7A5A2B" strokeWidth="3" />
    <path d="M 25 10 L 40 35 L 30 35 L 45 55 L 5 55 L 20 35 L 10 35 Z" fill="#6B8F6B" stroke="#4A6F4A" strokeWidth="1" />
  </svg>
);

const CardBackgroundPattern = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
    <defs>
      <pattern id="rose-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M 50 40 C 60 30, 70 50, 50 60 C 30 50, 40 30, 50 40 Z" fill="#C9A96E" opacity="0.04" />
        <path d="M 50 45 C 55 40, 60 50, 50 55 C 40 50, 45 40, 50 45 Z" fill="#C9A96E" opacity="0.06" />
      </pattern>
    </defs>
    <rect x="0" y="0" width="100%" height="100%" fill="url(#rose-pattern)" />
  </svg>
);

const Sparkles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-[#C9A96E]/40 font-serif"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          fontSize: `${6 + Math.random() * 10}px`
        }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{
          duration: 2 + Math.random() * 3,
          delay: Math.random() * 5,
          repeat: Infinity
        }}
      >
        ✦
      </motion.div>
    ))}
  </div>
);


// --- MAIN COMPONENT ---

export default function WeddingInvitation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { toast } = useToast();

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => setShowContent(true), 1500);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#EDE4D3] overflow-hidden relative selection:bg-[#C9A96E]/30 font-serif">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30 mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.06%22/%3E%3C/svg%3E')]" />
      
      <AnimatePresence>
        {!showContent && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center z-50 p-4 sm:p-8"
            exit={{ opacity: 0, transition: { duration: 1, delay: 0.5 } }}
          >
            <div className="relative w-full max-w-lg aspect-[5/4] sm:aspect-[4/3] max-h-[80vh] bg-transparent mx-auto group">
              <div className="absolute inset-0 bg-[#F5EFE0] shadow-2xl overflow-hidden rounded-sm cursor-pointer border-[0.5px] border-[#C9A96E]/20" onClick={handleOpen}>
                
                {/* Inner Card Peeking */}
                <motion.div 
                  className="absolute inset-x-4 bottom-4 bg-[#FAF7F2] shadow-lg rounded-sm z-0 flex flex-col items-center pt-4 sm:pt-8 border border-[#C9A96E]/30"
                  initial={{ top: '20%', bottom: '4%' }}
                  animate={{ top: isOpen ? '-150%' : '20%' }}
                  transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
                >
                  <div className="w-full h-full relative overflow-hidden flex flex-col items-center p-4 sm:p-8 text-center border-[0.5px] border-[#C9A96E]/50 m-2">
                    <CardBackgroundPattern />
                    <p className="font-script text-3xl sm:text-4xl text-[#C9A96E] mt-2 sm:mt-4 relative z-10">M & R</p>
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

                {/* Wax Seal — positioned at center of envelope, above all flaps */}
                <motion.div 
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 rounded-full cursor-pointer z-40 flex items-center justify-center pointer-events-auto"
                  whileHover={{ scale: 1.08 }}
                  animate={{ 
                    scale: isOpen ? 0 : [1, 1.04, 1],
                    opacity: isOpen ? 0 : 1,
                  }}
                  transition={{ 
                    scale: isOpen ? { duration: 0.3 } : { repeat: Infinity, duration: 2.8, ease: "easeInOut" }
                  }}
                  onClick={(e) => { e.stopPropagation(); handleOpen(); }}
                >
                  <div className="absolute inset-0 bg-[#C9A96E]/30 rounded-full blur-2xl animate-pulse" />
                  <WaxSealSVG />
                </motion.div>

                {/* Envelope internal liner and texture */}
                <div className="absolute inset-0 bg-texture opacity-30 mix-blend-multiply z-0 pointer-events-none" />
                <div className="absolute inset-3 border-[0.5px] border-[#C9A96E] opacity-40 z-0 pointer-events-none" />

                <PostageStamp />

                {/* Scattered tiny petals on envelope */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <PetalSVG key={`env-petal-${i}`} className="absolute w-3 h-4 opacity-70 z-10 pointer-events-none" style={{ 
                    top: `${10 + Math.random() * 80}%`, 
                    left: `${10 + Math.random() * 80}%`, 
                    transform: `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random() * 0.5})` 
                  }} />
                ))}

              </div>
            </div>
            
            {!isOpen && (
              <motion.p 
                className="absolute bottom-8 sm:bottom-12 text-[#FAF7F2]/80 font-serif tracking-[0.3em] text-xs sm:text-sm uppercase"
                animate={{ opacity: [0.4, 1, 0.4] }}
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
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <FloatingPetals />

            <div className="w-full max-w-2xl lg:max-w-3xl mx-auto min-h-screen px-4 sm:px-8 py-12 md:py-24 flex flex-col items-center relative shadow-2xl bg-[#FAF7F2] shadow-black/50 border border-[#C9A96E]/30">
              
              {/* Borders */}
              <div className="absolute inset-3 sm:inset-5 border-[1px] border-[#C9A96E] pointer-events-none z-10 opacity-70" />
              <div className="absolute inset-4 sm:inset-6 border-[0.5px] border-[#C9A96E]/50 pointer-events-none z-10 opacity-50" />
              
              <CardBackgroundPattern />
              <Sparkles />
              
              <div className="absolute top-0 inset-x-0 z-10 pointer-events-none flex justify-center">
                 <GarlandSVG />
              </div>

              {/* Corners */}
              <motion.div 
                className="absolute top-2 left-2 z-10 pointer-events-none"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5 }}
              >
                <RoseCluster size="large" className="origin-top-left" />
              </motion.div>
              <motion.div 
                className="absolute bottom-2 right-2 z-10 pointer-events-none rotate-180"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5 }}
              >
                <RoseCluster size="large" className="origin-center" />
              </motion.div>
              
              <motion.div 
                className="absolute top-2 right-2 z-10 pointer-events-none rotate-90"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, delay: 0.3 }}
              >
                <RoseCluster size="small" className="origin-center" />
              </motion.div>
              <motion.div 
                className="absolute bottom-2 left-2 z-10 pointer-events-none -rotate-90"
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, delay: 0.3 }}
              >
                <RoseCluster size="small" className="origin-center" />
              </motion.div>

              {/* Content Container */}
              <div className="w-full flex-grow flex flex-col items-center justify-center relative z-20 space-y-10 sm:space-y-12 py-16 sm:py-20 px-4">
                
                {/* Header */}
                <motion.div 
                  className="flex items-center gap-2 sm:gap-4 text-center mt-8 sm:mt-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 }}
                >
                   <span className="text-[#C9A96E] text-sm sm:text-lg">✦</span>
                   <p className="tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs uppercase text-[#3C3228]/70 font-medium">Together with their families</p>
                   <span className="text-[#C9A96E] text-sm sm:text-lg">✦</span>
                </motion.div>

                {/* Names */}
                <motion.div 
                  className="text-center w-full my-4 sm:my-8"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.4 }}
                >
                  <h1 className="font-script text-[5rem] sm:text-[7rem] md:text-[8rem] text-[#3C3228] leading-[0.8] tracking-normal mb-2 sm:mb-4" style={{ textShadow: '1px 1px 0px rgba(201,169,110,0.4)' }}>
                    Mohammad
                  </h1>
                  <div className="flex items-center justify-center gap-3 sm:gap-4 my-4 sm:my-6">
                    <div className="w-12 sm:w-24 h-[1px] bg-gradient-to-r from-transparent to-[#C9A96E]" />
                    <span className="text-4xl sm:text-6xl text-[#C9A96E] font-script drop-shadow-sm">&amp;</span>
                    <div className="w-12 sm:w-24 h-[1px] bg-gradient-to-l from-transparent to-[#C9A96E]" />
                  </div>
                  <h1 className="font-script text-[5rem] sm:text-[7rem] md:text-[8rem] text-[#3C3228] leading-[0.8] tracking-normal mt-2 sm:mt-4" style={{ textShadow: '1px 1px 0px rgba(201,169,110,0.4)' }}>
                    Renad
                  </h1>
                </motion.div>

                {/* Request */}
                <motion.div 
                  className="text-center max-w-md mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.6 }}
                >
                  <p className="text-lg sm:text-xl text-[#3C3228]/80 leading-relaxed italic font-serif px-4">
                    joyfully request the honor of your presence <br/> at their wedding celebration
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  <BannerSVG text="Saturday, July 25, 2026" />
                </motion.div>

                {/* Venue Details */}
                <motion.div 
                  className="flex flex-col items-center justify-center space-y-6 w-full max-w-[280px] sm:max-w-sm mx-auto mt-4 sm:mt-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 1 }}
                >
                  <div className="p-6 sm:p-10 bg-[#Fdfbf7] border-[0.5px] border-[#C9A96E]/50 rounded-t-full w-full flex flex-col items-center gap-3 sm:gap-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E')] opacity-30 mix-blend-multiply pointer-events-none" />
                    <PineTreeSVG />
                    <div className="text-center z-10 mt-2">
                      <p className="text-2xl sm:text-3xl font-medium tracking-wider mb-2 text-[#3C3228] font-serif">Tal Pine</p>
                      <div className="h-[1px] w-12 bg-[#C9A96E] mx-auto mb-3" />
                      <p className="text-xs sm:text-sm text-[#3C3228]/80 italic tracking-wide">At four o'clock in the afternoon</p>
                      <p className="text-[10px] sm:text-xs text-[#3C3228]/60 mt-3 uppercase tracking-widest">Formal Attire Requested</p>
                    </div>
                  </div>
                </motion.div>

              </div>
              
              <DividerSVG />

              {/* Countdown */}
              <CountdownTimer />

              <DividerSVG />

              {/* RSVP */}
              <motion.div 
                className="w-full max-w-md mx-auto text-center space-y-6 sm:space-y-8 pb-12 sm:pb-20 px-4 relative z-20"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
              >
                <h2 className="font-script text-4xl sm:text-5xl md:text-6xl text-[#3C3228] mb-2 sm:mb-4">RSVP</h2>
                <p className="text-base sm:text-lg text-[#3C3228]/80 italic mb-6 sm:mb-8 font-serif">Will you be joining us?</p>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center w-full px-4">
                  <button 
                    onClick={() => toast({ title: "Joyfully Accepted!", description: "We can't wait to celebrate with you.", duration: 5000 })}
                    className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-br from-[#C9A96E] to-[#A07840] text-[#FAF7F2] rounded-none uppercase tracking-widest text-[10px] sm:text-xs font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto"
                  >
                    <div className="absolute inset-[3px] border-[0.5px] border-[#FAF7F2]/40 pointer-events-none transition-transform group-hover:scale-[0.98]" />
                    Joyfully Accepts
                  </button>
                  <button 
                    onClick={() => toast({ title: "Regretfully Declined", description: "You will be dearly missed.", duration: 5000 })}
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
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = COUNTDOWN_TARGET - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      className="w-full max-w-xl mx-auto text-center px-2 sm:px-4 relative z-20"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
    >
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C9A96E]/50 to-transparent flex-1 max-w-[60px] sm:max-w-[100px]" />
        <p className="tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs uppercase text-[#C9A96E] font-medium font-serif">Counting down to forever</p>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C9A96E]/50 to-transparent flex-1 max-w-[60px] sm:max-w-[100px]" />
      </div>
      
      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
        {[
          { label: 'Days', value: timeLeft.days },
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Mins', value: timeLeft.minutes },
          { label: 'Secs', value: timeLeft.seconds },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center group">
            <div className="w-14 h-16 sm:w-20 sm:h-24 md:w-24 md:h-28 flex items-center justify-center bg-[#FAF7F2] border-[0.5px] border-[#C9A96E]/60 shadow-md relative overflow-hidden mb-2 sm:mb-3 group-hover:shadow-lg transition-shadow">
              <div className="absolute inset-1 border-[0.5px] border-dashed border-[#C9A96E]/30 pointer-events-none" />
              {/* Corner flourishes */}
              <div className="absolute top-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-l border-[#C9A96E] pointer-events-none" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-t border-r border-[#C9A96E] pointer-events-none" />
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-l border-[#C9A96E] pointer-events-none" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 border-b border-r border-[#C9A96E] pointer-events-none" />
              
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
            <span className="text-[9px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest text-[#3C3228]/60 font-serif">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
