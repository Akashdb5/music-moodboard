import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth0 } from "@/lib/auth0";

import { Assistant } from "./assistant";

const heroDots: {
  top: string;
  left: string;
  size: string;
  color: string;
  opacity: number;
}[] = [
  { top: "12%", left: "18%", size: "18px", color: "#4A90E2", opacity: 0.75 },
  { top: "22%", left: "74%", size: "26px", color: "#9B51E0", opacity: 0.65 },
  { top: "68%", left: "20%", size: "22px", color: "#1DB954", opacity: 0.6 },
  { top: "74%", left: "70%", size: "14px", color: "#F2994A", opacity: 0.75 },
  { top: "38%", left: "52%", size: "20px", color: "#FF5A5F", opacity: 0.7 },
  { top: "58%", left: "86%", size: "24px", color: "#2EDAFF", opacity: 0.65 },
];

const heroMiniWaves: {
  top: string;
  left: string;
  width: number;
  rotate: number;
  scale: number;
  color: string;
  opacity: number;
}[] = [
  { top: "6%", left: "12%", width: 200, rotate: -14, scale: 0.55, color: "#B5FF00", opacity: 0.65 },
  { top: "10%", left: "46%", width: 190, rotate: 8, scale: 0.5, color: "#2EDAFF", opacity: 0.58 },
  { top: "18%", left: "82%", width: 180, rotate: 24, scale: 0.48, color: "#00E5FF", opacity: 0.62 },
  { top: "30%", left: "18%", width: 210, rotate: -22, scale: 0.52, color: "#FFC300", opacity: 0.55 },
  { top: "34%", left: "64%", width: 220, rotate: 18, scale: 0.6, color: "#9B51E0", opacity: 0.5 },
  { top: "46%", left: "4%", width: 210, rotate: -32, scale: 0.54, color: "#1DB954", opacity: 0.55 },
  { top: "52%", left: "44%", width: 230, rotate: 6, scale: 0.62, color: "#4A90E2", opacity: 0.6 },
  { top: "60%", left: "84%", width: 200, rotate: 28, scale: 0.53, color: "#FF5A5F", opacity: 0.55 },
  { top: "70%", left: "12%", width: 190, rotate: -10, scale: 0.5, color: "#00E5FF", opacity: 0.6 },
  { top: "76%", left: "56%", width: 220, rotate: 20, scale: 0.58, color: "#B5FF00", opacity: 0.52 },
  { top: "84%", left: "26%", width: 230, rotate: -18, scale: 0.56, color: "#2EDAFF", opacity: 0.5 },
  { top: "88%", left: "86%", width: 210, rotate: 16, scale: 0.6, color: "#1DB954", opacity: 0.52 },
];

const heroGlyphs: {
  top: string;
  left: string;
  size: number;
  color: string;
  opacity: number;
  rotate: number;
  variant: "eq" | "double-note" | "headphones" | "mic" | "guitar";
}[] = [
  { top: "4%", left: "12%", size: 26, color: "#FF5A5F", opacity: 0.65, rotate: -8, variant: "mic" },
  { top: "6%", left: "34%", size: 28, color: "#FF5A5F", opacity: 0.63, rotate: 6, variant: "guitar" },
  { top: "8%", left: "56%", size: 24, color: "#1DB954", opacity: 0.64, rotate: -6, variant: "eq" },
  { top: "10%", left: "76%", size: 28, color: "#00E5FF", opacity: 0.6, rotate: 14, variant: "double-note" },
  { top: "14%", left: "20%", size: 30, color: "#2EDAFF", opacity: 0.6, rotate: -12, variant: "headphones" },
  { top: "18%", left: "46%", size: 30, color: "#FFC300", opacity: 0.62, rotate: -16, variant: "double-note" },
  { top: "22%", left: "70%", size: 32, color: "#9B51E0", opacity: 0.58, rotate: 18, variant: "guitar" },
  { top: "26%", left: "8%", size: 28, color: "#B5FF00", opacity: 0.58, rotate: 12, variant: "eq" },
  { top: "30%", left: "36%", size: 26, color: "#2EDAFF", opacity: 0.56, rotate: -10, variant: "mic" },
  { top: "34%", left: "62%", size: 30, color: "#FF5A5F", opacity: 0.57, rotate: 16, variant: "headphones" },
  { top: "38%", left: "88%", size: 24, color: "#00E5FF", opacity: 0.58, rotate: 20, variant: "guitar" },
  { top: "42%", left: "18%", size: 28, color: "#FFC300", opacity: 0.55, rotate: -18, variant: "double-note" },
  { top: "46%", left: "44%", size: 30, color: "#2EDAFF", opacity: 0.56, rotate: 12, variant: "headphones" },
  { top: "50%", left: "72%", size: 30, color: "#00E5FF", opacity: 0.58, rotate: -8, variant: "mic" },
  { top: "54%", left: "10%", size: 26, color: "#FF5A5F", opacity: 0.54, rotate: -6, variant: "guitar" },
  { top: "58%", left: "34%", size: 26, color: "#00E5FF", opacity: 0.55, rotate: 10, variant: "double-note" },
  { top: "62%", left: "58%", size: 28, color: "#FFC300", opacity: 0.6, rotate: -12, variant: "eq" },
  { top: "66%", left: "82%", size: 30, color: "#9B51E0", opacity: 0.56, rotate: 14, variant: "headphones" },
  { top: "70%", left: "24%", size: 26, color: "#B5FF00", opacity: 0.55, rotate: -10, variant: "guitar" },
  { top: "74%", left: "48%", size: 28, color: "#00E5FF", opacity: 0.56, rotate: 12, variant: "double-note" },
  { top: "78%", left: "70%", size: 26, color: "#FF5A5F", opacity: 0.52, rotate: -14, variant: "mic" },
  { top: "82%", left: "92%", size: 24, color: "#2EDAFF", opacity: 0.5, rotate: 16, variant: "guitar" },
  { top: "86%", left: "16%", size: 28, color: "#00E5FF", opacity: 0.5, rotate: 8, variant: "headphones" },
  { top: "88%", left: "40%", size: 28, color: "#FF5A5F", opacity: 0.5, rotate: 18, variant: "eq" },
  { top: "90%", left: "66%", size: 26, color: "#1DB954", opacity: 0.48, rotate: -6, variant: "double-note" },
  { top: "94%", left: "12%", size: 24, color: "#FF5A5F", opacity: 0.48, rotate: -4, variant: "mic" },
];

export default async function Home() {
  const session = await auth0.getSession();

  if (!session) {
    return (
      <main
        className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-white"
        style={{
          background: "radial-gradient(120% 120% at 50% 0%, #3C008A 0%, #2D0159 40%, #1A003C 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.22),_transparent_60%)]" />
          <div className="absolute -top-48 -right-1/3 h-[540px] w-[540px] rounded-[52%] bg-[#00E5FF]/28 blur-[140px]" />
          <div className="absolute -bottom-60 -left-1/4 h-[620px] w-[580px] rounded-[55%] bg-[#1DB954]/24 blur-[150px]" />
          <div className="absolute top-[18%] left-1/3 h-[420px] w-[420px] rounded-[45%] bg-[#9B51E0]/28 blur-[130px]" />
          {heroMiniWaves.map((wave, index) => (
            <svg
              key={`wave-${index}`}
              className="absolute pointer-events-none"
              style={{
                top: wave.top,
                left: wave.left,
                width: wave.width,
                opacity: wave.opacity,
                transform: `rotate(${wave.rotate}deg) scale(${wave.scale})`,
                transformOrigin: "center",
              }}
              viewBox="0 0 1440 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 260 Q 360 150 720 260 T 1440 260"
                stroke={wave.color}
                strokeWidth="40"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.8"
              />
            </svg>
          ))}
          {heroGlyphs.map((glyph, index) => (
            <svg
              key={`glyph-${index}`}
              className="absolute pointer-events-none"
              style={{
                top: glyph.top,
                left: glyph.left,
                width: glyph.size,
                height: glyph.size,
                opacity: glyph.opacity,
                transform: `rotate(${glyph.rotate}deg)`,
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke={glyph.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {glyph.variant === "double-note" ? (
                <>
                  <path d="M9 17V5l12-2v12" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="15" r="3" />
                </>
              ) : glyph.variant === "headphones" ? (
                <>
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <rect x="1" y="18" width="4" height="3" rx="1" />
                  <rect x="19" y="18" width="4" height="3" rx="1" />
                </>
              ) : glyph.variant === "mic" ? (
                <>
                  <rect x="9" y="2" width="6" height="11" rx="3" />
                  <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              ) : glyph.variant === "guitar" ? (
                <>
                  <path d="M6 2l3 3-2 2-3-3z" />
                  <path d="M11 7l6 6" />
                  <path d="M12 6l6 6" />
                  <circle cx="15" cy="15" r="3" />
                  <path d="M9 9L4 4l1-1 5 5z" />
                </>
              ) : (
                <>
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </>
              )}
            </svg>
          ))}
          {heroDots.map((dot, index) => (
            <span
              key={index}
              className="absolute rounded-full"
              style={{
                top: dot.top,
                left: dot.left,
                width: dot.size,
                height: dot.size,
                backgroundColor: dot.color,
                opacity: dot.opacity,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2 rounded-full border border-[#00E5FF]/35 bg-[#2D0159]/60 px-4 py-1 text-sm font-medium text-[#D1D5DB]/90 shadow-[0_0_30px_rgba(0,229,255,0.18)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B5FF00]" />
            Auth0 AI + Spotify
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Build with 100 million songs, 5 million podcasts, and more
          </h1>
          <p className="max-w-2xl text-pretty text-base text-[#D1D5DB]/90 sm:text-lg">
            Prototype music experiences by combining Spotify&apos;s massive catalog with secure,
            Auth0-powered access controls. Sign in to sync and explore your assistant conversations.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full bg-[#1DB954] text-[#0E021C] shadow-[0_0_35px_rgba(29,185,84,0.35)] transition hover:bg-[#17a54a] hover:shadow-[0_0_45px_rgba(29,185,84,0.45)] sm:w-auto"
            >
              <Link href="/auth/login">Sign in with Auth0</Link>
            </Button>

          </div>
        </div>
      </main>
    );
  }

  return (
    <Assistant
      auth0Domain={process.env.AUTH0_DOMAIN ?? ""}
      auth0ClientId={process.env.AUTH0_CLIENT_ID ?? ""}
    />
  );
}
