'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

const SVG_PREFIX = '/login_caurosel/';
const svgTextCache = new Map<string, string>();

export interface LoginCarouselSlide {
  readonly src: string;
  readonly alt: string;
}

export interface LoginHeroCarouselProps {
  slides: readonly LoginCarouselSlide[];
  autoAdvanceMs?: number;
  /** `dark` = solid brand panel (pale text for errors / empty states) */
  panelTone?: 'default' | 'dark';
}

function CarouselSvg({
  src,
  alt,
  panelTone,
}: {
  src: string;
  alt: string;
  panelTone: 'default' | 'dark';
}) {
  const [markup, setMarkup] = useState<string | null>(() => svgTextCache.get(src) ?? null);
  const [failed, setFailed] = useState(false);
  const soft = panelTone === 'dark' ? 'text-white/90' : 'text-slate-50';

  useEffect(() => {
    if (!src.startsWith(SVG_PREFIX)) {
      void Promise.resolve().then(() => setFailed(true));
      return;
    }

    const cached = svgTextCache.get(src);
    if (cached) {
      void Promise.resolve().then(() => {
        setMarkup(cached);
        setFailed(false);
      });
      return;
    }

    let cancelled = false;
    setMarkup(null);
    setFailed(false);

    const run = async () => {
      try {
        const res = await fetch(src, { cache: 'force-cache' });
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        if (!text.includes('<svg')) throw new Error('not svg');
        svgTextCache.set(src, text);
        if (!cancelled) setMarkup(text);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return (
      <div
        className={`rounded-xl border border-white/20 bg-white/10 px-6 py-8 text-center text-sm ${soft}`}
      >
        Could not load this illustration. Check files under{' '}
        <code className="rounded bg-black/20 px-1 py-0.5 text-xs">public/login_caurosel/</code>.
      </div>
    );
  }

  if (!markup) {
    return (
      <div
        className={`h-40 w-full max-w-sm animate-pulse rounded-2xl ${panelTone === 'dark' ? 'bg-white/15' : 'bg-white/10'}`}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center drop-shadow-md [&>svg]:mx-auto [&>svg]:block [&>svg]:h-auto [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full ${panelTone === 'dark' ? '[&>svg]:opacity-95' : ''}`}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export default function LoginHeroCarousel({
  slides: slidesProp,
  autoAdvanceMs = 7500,
  panelTone = 'default',
}: LoginHeroCarouselProps) {
  const slides = useMemo(
    () => slidesProp.filter((s) => Boolean(s.src)),
    [slidesProp]
  );
  const [index, setIndex] = useState(0);

  const safeIndex = slides.length ? index % slides.length : 0;
  const current = slides[safeIndex];

  const setSlideIndex = useCallback((next: number) => {
    setIndex(next);
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || autoAdvanceMs <= 0) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoAdvanceMs);
    return () => window.clearInterval(id);
  }, [slides.length, autoAdvanceMs]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!slides.length) return;
      setIndex((i) => (i + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  const showArrows = slides.length > 1;
  const emptyMuted =
    panelTone === 'dark' ? 'border-white/25 bg-white/5 text-white/80' : 'border-white/25 bg-white/5 text-slate-100/90';

  if (!slides.length) {
    return (
      <div
        className={`flex min-h-[min(42vh,420px)] w-full items-center justify-center rounded-2xl border border-dashed p-8 text-center text-sm ${emptyMuted}`}
      >
        Add slides in{' '}
        <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs">app/login/login-carousel-slides.ts</code>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col items-center justify-center py-2">
      <div className="relative mx-auto box-border flex h-[min(38vh,380px)] w-full min-w-0 max-w-lg items-center justify-center px-11 sm:h-[min(42vh,420px)] sm:px-12">
        <CarouselSvg key={current.src} src={current.src} alt={current.alt} panelTone={panelTone} />

        {showArrows && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-md backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Previous slide"
            >
              <ChevronLeft className="!text-2xl" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-md backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Next slide"
            >
              <ChevronRight className="!text-2xl" />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-2 pt-2 pb-2" role="tablist" aria-label="Carousel slides">
          {slides.map((slide, i) => (
            <button
              key={`${i}-${slide.src}`}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              onClick={() => setSlideIndex(i)}
              className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                i === safeIndex ? 'w-7 bg-white' : 'w-2 bg-white/35 hover:bg-white/55'
              }`}
              aria-label={`Show slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
