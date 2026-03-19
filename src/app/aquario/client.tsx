"use client";

import { useEffect, useState } from "react";

/* ─── Fish SVG ───────────────────────────────────────────────────────────── */
function FishSVG({
  bodyColor,
  finColor,
  size,
}: {
  bodyColor: string;
  finColor: string;
  size: number;
}) {
  const w = Math.round(90 * size);
  const h = Math.round(46 * size);
  return (
    <svg viewBox="0 0 90 46" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <path d="M12,23 L0,8 Q4,23 0,38 Z" fill={finColor} />
      {/* Body */}
      <ellipse cx="46" cy="23" rx="34" ry="16" fill={bodyColor} />
      {/* Belly sheen */}
      <ellipse cx="46" cy="27" rx="28" ry="8" fill="rgba(255,255,255,0.12)" />
      {/* Dorsal fin */}
      <path d="M32,7 Q44,0 56,7" stroke={finColor} strokeWidth="3" fill={finColor} opacity="0.85" strokeLinejoin="round" />
      {/* Pectoral fin */}
      <ellipse cx="40" cy="34" rx="10" ry="5" fill={finColor} transform="rotate(-25 40 34)" opacity="0.9" />
      {/* Gill */}
      <path d="M58,10 Q55,23 58,36" stroke={finColor} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* Scales */}
      <path d="M34,16 Q40,13 46,16" stroke={finColor} strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M28,22 Q35,19 42,22" stroke={finColor} strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M34,28 Q41,25 48,28" stroke={finColor} strokeWidth="1" fill="none" opacity="0.4" />
      {/* Eye white */}
      <circle cx="68" cy="18" r="5" fill="white" />
      {/* Pupil */}
      <circle cx="69" cy="18" r="2.8" fill="#0a0a1a" />
      {/* Eye gleam */}
      <circle cx="70" cy="16.5" r="1.1" fill="white" />
      {/* Mouth */}
      <path d="M80,25 Q83,27 80,29" stroke={finColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Sea Turtle SVG ─────────────────────────────────────────────────────── */
function TurtleSVG({ size }: { size: number }) {
  const w = Math.round(100 * size);
  const h = Math.round(70 * size);
  return (
    <svg viewBox="0 0 100 70" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
      {/* Shell */}
      <ellipse cx="50" cy="38" rx="28" ry="22" fill="#2d7a4f" />
      <ellipse cx="50" cy="36" rx="24" ry="18" fill="#3a9a63" />
      {/* Shell pattern */}
      <path d="M50,20 L50,54" stroke="#2d7a4f" strokeWidth="1.5" opacity="0.6" />
      <path d="M30,30 Q50,25 70,30" stroke="#2d7a4f" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M28,42 Q50,37 72,42" stroke="#2d7a4f" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Head */}
      <ellipse cx="78" cy="34" rx="12" ry="9" fill="#4aaa73" />
      <circle cx="82" cy="30" r="3.5" fill="white" />
      <circle cx="83" cy="30" r="2" fill="#0a0a1a" />
      <circle cx="84" cy="29" r="0.8" fill="white" />
      {/* Front flippers */}
      <path d="M38,22 Q25,10 15,15" stroke="#3a9a63" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M60,22 Q70,10 80,8" stroke="#3a9a63" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* Back flippers */}
      <path d="M35,54 Q22,65 18,58" stroke="#3a9a63" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M63,54 Q72,65 76,60" stroke="#3a9a63" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Tail */}
      <path d="M22,40 Q12,42 8,40" stroke="#2d7a4f" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ─── Jellyfish SVG ──────────────────────────────────────────────────────── */
function JellyfishSVG({ color, size }: { color: string; size: number }) {
  const w = Math.round(60 * size);
  const h = Math.round(90 * size);
  const tentacles = [10, 20, 30, 40, 50];
  return (
    <svg viewBox="0 0 60 90" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`jg-${color}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0.2" />
        </radialGradient>
      </defs>
      {/* Bell */}
      <path d="M5,30 Q5,5 30,5 Q55,5 55,30 Q55,42 30,44 Q5,42 5,30 Z" fill={`url(#jg-${color})`} />
      {/* Inner bell */}
      <path d="M14,28 Q14,14 30,13 Q46,14 46,28 Q46,36 30,37 Q14,36 14,28 Z" fill={color} opacity="0.25" />
      {/* Tentacles */}
      {tentacles.map((x, i) => (
        <path
          key={i}
          d={`M${x},44 Q${x - 5 + i * 2},${58 + i * 4} ${x},${70 + i * 3} Q${x + 5},${78 + i * 2} ${x - 3},${85 + i}`}
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
      ))}
    </svg>
  );
}

/* ─── Seaweed SVG ────────────────────────────────────────────────────────── */
function Seaweed({ x, h, color, delay, animDuration }: { x: number; h: number; color: string; delay: number; animDuration: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "9%",
        left: `${x}%`,
        transformOrigin: "bottom center",
        animation: `seaweedSway ${animDuration}s ${delay}s ease-in-out infinite alternate`,
      }}
    >
      <svg viewBox={`0 0 20 ${h}`} width="18" height={h} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`sw-${x}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d={`M10,${h} Q3,${h * 0.78} 10,${h * 0.56} Q17,${h * 0.34} 10,${h * 0.12} Q6,${h * 0.02} 10,0`}
          stroke={`url(#sw-${x})`}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ─── Bubble ─────────────────────────────────────────────────────────────── */
function Bubble({ x, size, duration, delay }: { x: number; size: number; duration: number; delay: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "9%",
        left: `${x}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1.5px solid rgba(180,230,255,0.55)",
        background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), rgba(120,200,255,0.05))",
        animation: `bubbleRise ${duration}s ${delay}s ease-in infinite`,
      }}
    />
  );
}

/* ─── Particle (plankton / dust) ─────────────────────────────────────────── */
function Particle({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: `${y}%`,
        left: `${x}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(180,230,255,0.35)",
        animation: `particleDrift ${duration}s ${delay}s ease-in-out infinite alternate`,
      }}
    />
  );
}

/* ─── Coral ──────────────────────────────────────────────────────────────── */
function CoralBranch({ x, color, tipColor, delay }: { x: number; color: string; tipColor: string; delay: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "9%",
        left: `${x}%`,
        transformOrigin: "bottom center",
        animation: `seaweedSway 5s ${delay}s ease-in-out infinite alternate`,
      }}
    >
      <svg viewBox="0 0 70 90" width="65" height="90" xmlns="http://www.w3.org/2000/svg">
        <path d="M35,90 L35,55 M35,68 L18,40 M35,62 L52,35 M18,40 L9,22 M18,40 L26,18 M52,35 L44,16 M52,35 L62,14" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        {[
          [35, 53], [18, 38], [52, 33], [9, 20], [26, 16], [44, 14], [62, 12],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 0 ? 6 : i < 3 ? 5 : 4} fill={i === 0 ? color : tipColor} />
        ))}
      </svg>
    </div>
  );
}

/* ─── Fish configs ───────────────────────────────────────────────────────── */
const FISH = [
  { id: 1,  bodyColor: "#FF6B35", finColor: "#C94E1A", size: 1.3,  y: 28, duration: 18, delay:   0, dir:  1 },
  { id: 2,  bodyColor: "#FFD700", finColor: "#E6A800", size: 0.75, y: 52, duration: 24, delay:  -6, dir:  1 },
  { id: 3,  bodyColor: "#00C8D7", finColor: "#007F8B", size: 1.5,  y: 38, duration: 14, delay:  -9, dir: -1 },
  { id: 4,  bodyColor: "#FF69B4", finColor: "#C0005A", size: 0.65, y: 68, duration: 26, delay: -14, dir:  1 },
  { id: 5,  bodyColor: "#9B59B6", finColor: "#6C3483", size: 1.0,  y: 44, duration: 20, delay:  -3, dir: -1 },
  { id: 6,  bodyColor: "#1ABC9C", finColor: "#0E8A72", size: 0.6,  y: 72, duration: 30, delay: -20, dir:  1 },
  { id: 7,  bodyColor: "#E74C3C", finColor: "#A93226", size: 0.9,  y: 22, duration: 16, delay:  -7, dir: -1 },
  { id: 8,  bodyColor: "#F39C12", finColor: "#B7770D", size: 1.1,  y: 60, duration: 19, delay: -11, dir:  1 },
  { id: 9,  bodyColor: "#5DADE2", finColor: "#2874A6", size: 0.8,  y: 34, duration: 22, delay: -17, dir: -1 },
  { id: 10, bodyColor: "#EC407A", finColor: "#AD1457", size: 0.55, y: 78, duration: 28, delay:  -4, dir:  1 },
];

const JELLIES = [
  { id: 1, color: "#CC88FF", size: 1.0, x: 22, y: 10, bobDuration: 5,   bobDelay: 0  },
  { id: 2, color: "#66CCFF", size: 0.7, x: 72, y: 8,  bobDuration: 6.5, bobDelay: -2 },
  { id: 3, color: "#FF99CC", size: 0.6, x: 48, y: 5,  bobDuration: 4.5, bobDelay: -3 },
];

const TURTLES = [
  { id: 1, size: 1.1, y: 48, duration: 40, delay: -10, dir:  1 },
  { id: 2, size: 0.8, y: 62, duration: 55, delay: -28, dir: -1 },
];

const SEAWEEDS = [
  { x: 4,  h: 80,  color: "#2ECC71", delay: 0,    dur: 3.2 },
  { x: 8,  h: 55,  color: "#27AE60", delay: -0.8, dur: 2.8 },
  { x: 12, h: 100, color: "#1E8449", delay: -1.5, dur: 3.8 },
  { x: 25, h: 65,  color: "#2ECC71", delay: -0.4, dur: 3.0 },
  { x: 38, h: 90,  color: "#27AE60", delay: -1.1, dur: 3.5 },
  { x: 55, h: 70,  color: "#1E8449", delay: -0.6, dur: 2.9 },
  { x: 70, h: 85,  color: "#2ECC71", delay: -1.8, dur: 3.3 },
  { x: 82, h: 60,  color: "#27AE60", delay: -0.2, dur: 4.0 },
  { x: 88, h: 95,  color: "#1E8449", delay: -1.3, dur: 3.1 },
  { x: 94, h: 50,  color: "#2ECC71", delay: -0.9, dur: 2.7 },
];

const CORALS = [
  { x: 17,  color: "#E74C3C", tipColor: "#FADBD8", delay: 0    },
  { x: 30,  color: "#F39C12", tipColor: "#FDEBD0", delay: -1.2 },
  { x: 62,  color: "#9B59B6", tipColor: "#D7BDE2", delay: -0.7 },
  { x: 77,  color: "#E91E63", tipColor: "#FCE4EC", delay: -1.8 },
];

const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: 4 + (i * 5.5) % 92,
  size: 5 + (i % 5) * 2.5,
  duration: 6 + (i % 5) * 1.5,
  delay: -(i * 1.1),
}));

const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: 2 + (i * 4.1) % 96,
  y: 5 + (i * 3.7) % 85,
  size: 2 + (i % 3),
  duration: 8 + (i % 6) * 2,
  delay: -(i * 0.7),
}));

const LIGHT_RAYS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: i * 13 + 2,
  skew: -12 + i * 3,
  width: 35 + (i % 3) * 25,
  duration: 3 + i * 0.6,
  delay: -(i * 0.8),
}));

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function AquariumClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes swimLTR {
          0%   { transform: translateX(-160px) translateY(0px); }
          20%  { transform: translateX(20vw)   translateY(-12px); }
          40%  { transform: translateX(40vw)   translateY(0px); }
          60%  { transform: translateX(60vw)   translateY(-10px); }
          80%  { transform: translateX(80vw)   translateY(2px); }
          100% { transform: translateX(calc(100vw + 160px)) translateY(0px); }
        }
        @keyframes swimRTL {
          0%   { transform: translateX(calc(100vw + 160px)) translateY(0px); }
          20%  { transform: translateX(80vw)  translateY(-10px); }
          40%  { transform: translateX(60vw)  translateY(0px); }
          60%  { transform: translateX(40vw)  translateY(-12px); }
          80%  { transform: translateX(20vw)  translateY(2px); }
          100% { transform: translateX(-160px) translateY(0px); }
        }
        @keyframes turtleLTR {
          0%   { transform: translateX(-180px) translateY(0px); }
          33%  { transform: translateX(33vw)   translateY(-6px); }
          66%  { transform: translateX(66vw)   translateY(4px); }
          100% { transform: translateX(calc(100vw + 180px)) translateY(0px); }
        }
        @keyframes turtleRTL {
          0%   { transform: translateX(calc(100vw + 180px)) translateY(0px); }
          33%  { transform: translateX(66vw)  translateY(-6px); }
          66%  { transform: translateX(33vw)  translateY(4px); }
          100% { transform: translateX(-180px) translateY(0px); }
        }
        @keyframes bubbleRise {
          0%   { transform: translateY(0)      translateX(0);    opacity: 0.9; }
          30%  { transform: translateY(-28vh)  translateX(8px);  opacity: 0.7; }
          60%  { transform: translateY(-55vh)  translateX(-6px); opacity: 0.4; }
          85%  { transform: translateY(-78vh)  translateX(10px); opacity: 0.15; }
          100% { transform: translateY(-92vh)  translateX(0);    opacity: 0; }
        }
        @keyframes seaweedSway {
          from { transform: rotate(-7deg); }
          to   { transform: rotate(7deg);  }
        }
        @keyframes jellyBob {
          0%   { transform: translateY(0px)   scaleX(1); }
          40%  { transform: translateY(18px)  scaleX(1.04); }
          70%  { transform: translateY(-8px)  scaleX(0.97); }
          100% { transform: translateY(0px)   scaleX(1); }
        }
        @keyframes lightRayPulse {
          0%, 100% { opacity: 0.025; }
          50%      { opacity: 0.085; }
        }
        @keyframes particleDrift {
          from { transform: translateX(-8px) translateY(0);   opacity: 0.2; }
          to   { transform: translateX(8px)  translateY(-12px); opacity: 0.5; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200%  center; }
        }
        @keyframes surfaceWave {
          0%, 100% { transform: scaleX(1)   scaleY(1); }
          50%      { transform: scaleX(1.01) scaleY(1.3); }
        }
      `}</style>

      {/* ── Aquarium container ── */}
      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "linear-gradient(180deg, #020d1a 0%, #051833 18%, #083055 42%, #0b4070 65%, #0d5080 82%, #0f5c90 100%)",
        }}
      >
        {/* ── Surface shimmer ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, transparent 0%, rgba(120,200,255,0.6) 30%, rgba(200,240,255,0.9) 50%, rgba(120,200,255,0.6) 70%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 4s linear infinite",
          }}
        />

        {/* ── Light rays ── */}
        {LIGHT_RAYS.map((r) => (
          <div
            key={r.id}
            style={{
              position: "absolute",
              top: 0,
              left: `${r.left}%`,
              width: r.width,
              height: "65vh",
              background: "linear-gradient(to bottom, rgba(100,210,255,0.14) 0%, transparent 100%)",
              transform: `skewX(${r.skew}deg)`,
              transformOrigin: "top center",
              animation: `lightRayPulse ${r.duration}s ${-r.delay}s ease-in-out infinite`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* ── Caustics overlay ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(40,160,255,0.06) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        {/* ── Floating particles ── */}
        {PARTICLES.map((p) => (
          <Particle key={p.id} {...p} />
        ))}

        {/* ── Jellyfish ── */}
        {JELLIES.map((j) => (
          <div
            key={j.id}
            style={{
              position: "absolute",
              top: `${j.y}%`,
              left: `${j.x}%`,
              animation: `jellyBob ${j.bobDuration}s ${j.bobDelay}s ease-in-out infinite`,
              filter: `drop-shadow(0 0 12px ${j.color}55)`,
            }}
          >
            <JellyfishSVG color={j.color} size={j.size} />
          </div>
        ))}

        {/* ── Fish ── */}
        {FISH.map((f) => (
          <div
            key={f.id}
            style={{
              position: "absolute",
              top: `${f.y}%`,
              left: 0,
              animation: `${f.dir > 0 ? "swimLTR" : "swimRTL"} ${f.duration}s ${f.delay}s linear infinite`,
              filter: `drop-shadow(0 2px 8px ${f.bodyColor}60)`,
            }}
          >
            <div style={{ transform: f.dir < 0 ? "scaleX(-1)" : undefined }}>
              <FishSVG bodyColor={f.bodyColor} finColor={f.finColor} size={f.size} />
            </div>
          </div>
        ))}

        {/* ── Sea turtles ── */}
        {TURTLES.map((t) => (
          <div
            key={t.id}
            style={{
              position: "absolute",
              top: `${t.y}%`,
              left: 0,
              animation: `${t.dir > 0 ? "turtleLTR" : "turtleRTL"} ${t.duration}s ${t.delay}s linear infinite`,
              filter: "drop-shadow(0 2px 10px rgba(46,204,113,0.4))",
            }}
          >
            <div style={{ transform: t.dir < 0 ? "scaleX(-1)" : undefined }}>
              <TurtleSVG size={t.size} />
            </div>
          </div>
        ))}

        {/* ── Bubbles ── */}
        {BUBBLES.map((b) => (
          <Bubble key={b.id} {...b} />
        ))}

        {/* ── Seaweed ── */}
        {SEAWEEDS.map((s, i) => (
          <Seaweed key={i} x={s.x} h={s.h} color={s.color} delay={s.delay} animDuration={s.dur} />
        ))}

        {/* ── Coral ── */}
        {CORALS.map((c) => (
          <CoralBranch key={c.x} {...c} />
        ))}

        {/* ── Rocky bottom decorations ── */}
        {[10, 35, 50, 68, 85].map((x, i) => (
          <div key={i} style={{ position: "absolute", bottom: "7%", left: `${x}%` }}>
            <svg viewBox="0 0 80 35" width={60 + i * 8} height={30 + i * 3} xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="40" cy="25" rx="38" ry="18" fill={`hsl(240,${15 + i * 3}%,${22 + i * 4}%)`} />
              <ellipse cx="40" cy="22" rx="32" ry="13" fill={`hsl(240,${12 + i * 3}%,${28 + i * 3}%)`} />
              <path d={`M15,16 Q30,10 45,14 Q60,10 70,16`} stroke={`hsl(240,10%,38%)`} strokeWidth="1.5" fill="none" opacity="0.5" />
            </svg>
          </div>
        ))}

        {/* ── Starfish ── */}
        {[22, 47, 73].map((x, i) => (
          <div key={i} style={{ position: "absolute", bottom: `${9.5 + i * 0.3}%`, left: `${x}%`, opacity: 0.9 }}>
            <svg viewBox="0 0 50 50" width={30 + i * 6} height={30 + i * 6} xmlns="http://www.w3.org/2000/svg">
              <polygon
                points="25,4 29,18 43,18 32,27 36,41 25,32 14,41 18,27 7,18 21,18"
                fill={["#FF7043", "#FF8A65", "#FFAB91"][i]}
              />
              <circle cx="25" cy="24" r="5" fill={["#E64A19", "#F4511E", "#FF5722"][i]} />
            </svg>
          </div>
        ))}

        {/* ── Sandy bottom ── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "10%",
            background: "linear-gradient(180deg, #a08840 0%, #8a7030 40%, #705a20 100%)",
          }}
        />
        {/* Sand ripples */}
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: `${8.5 + (i % 2) * 0.8}%`,
              left: `${i * 13}%`,
              width: `${60 + i * 10}px`,
              height: "8px",
              background: "radial-gradient(ellipse, rgba(180,150,80,0.5) 0%, transparent 70%)",
              borderRadius: "50%",
            }}
          />
        ))}

        {/* ── Depth vignette ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 110% 100% at 50% 50%, transparent 50%, rgba(0,5,20,0.55) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}
