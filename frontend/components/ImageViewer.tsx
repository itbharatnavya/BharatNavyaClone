"use client";

// Full-screen image viewer (Amazon-style). Open it with a list of images and a start index.
// - Zoom: + / - buttons, mouse wheel, double-click (or double-tap), pinch on touch screens.
// - Move around a zoomed image by dragging; the image can't be dragged off screen.
// - Previous / next arrows, arrow keys, swipe (when not zoomed) and a thumbnail strip.
// - Escape, the close button or a click on the dark area closes it; focus returns to the opener.
// Styles: .iv-* in app/counter-soft-system.css.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ViewerImage { src: string; alt?: string }

const MIN = 1, MAX = 4, STEP = 0.5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function ImageViewer({ images, start = 0, onClose, title }: { images: ViewerImage[]; start?: number; onClose: () => void; title?: string }) {
  const [index, setIndex] = useState(clamp(start, 0, Math.max(0, images.length - 1)));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTap = useRef(0);
  const opener = useRef<Element | null>(null);

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const go = useCallback((d: number) => { setIndex((i) => (i + d + images.length) % images.length); reset(); }, [images.length]);

  // Keep the zoomed image covering the stage: limit panning to the overflow.
  const limit = useCallback((p: { x: number; y: number }, z: number) => {
    const s = stage.current, im = img.current;
    if (!s || !im) return p;
    const mx = Math.max(0, (im.offsetWidth * z - s.clientWidth) / 2), my = Math.max(0, (im.offsetHeight * z - s.clientHeight) / 2);
    return { x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) };
  }, []);
  const zoomTo = useCallback((z: number) => { const n = clamp(z, MIN, MAX); setZoom(n); setPan((p) => (n === 1 ? { x: 0, y: 0 } : limit(p, n))); }, [limit]);

  useEffect(() => {
    opener.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && images.length > 1) go(1);
      else if (e.key === "ArrowLeft" && images.length > 1) go(-1);
      else if (e.key === "+" || e.key === "=") setZoom((z) => clamp(z + STEP, MIN, MAX));
      else if (e.key === "-") { setZoom((z) => clamp(z - STEP, MIN, MAX)); setPan({ x: 0, y: 0 }); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [go, images.length, onClose]);

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setZoom((z) => { const n = clamp(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN, MAX); if (n === 1) setPan({ x: 0, y: 0 }); return n; }); };
    s.addEventListener("wheel", onWheel, { passive: false });
    return () => s.removeEventListener("wheel", onWheel);
  }, []);

  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    } else drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
  }
  function move(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      zoomTo(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist));
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (zoom > 1) setPan(limit({ x: d.px + dx, y: d.py + dy }, zoom));
  }
  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    // Swipe between images when not zoomed.
    if (zoom === 1 && d.moved && Math.abs(dx) > 50 && images.length > 1) { go(dx < 0 ? 1 : -1); return; }
    if (!d.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300) { zoomTo(zoom > 1 ? 1 : 2.5); lastTap.current = 0; }
      else lastTap.current = now;
    }
  }

  if (!images.length) return null;
  const current = images[index];

  return createPortal(<div className="iv" role="dialog" aria-modal="true" aria-label={title ? `${title} images` : "Images"}>
    <div className="iv-bar">
      <span className="iv-count">{images.length > 1 ? `${index + 1} / ${images.length}` : ""}{title ? <b>{title}</b> : null}</span>
      <div className="iv-tools">
        <button type="button" onClick={() => zoomTo(zoom - STEP)} disabled={zoom <= MIN} aria-label="Zoom out"><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
        <span className="iv-zoom">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => zoomTo(zoom + STEP)} disabled={zoom >= MAX} aria-label="Zoom in"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
        <button type="button" onClick={reset} disabled={zoom === 1} aria-label="Fit to screen"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>
        <button type="button" className="iv-close" onClick={onClose} aria-label="Close" autoFocus><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      </div>
    </div>

    <div ref={stage} className={`iv-stage${zoom > 1 ? " is-zoomed" : ""}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClick={(e) => { if (e.target === e.currentTarget && zoom === 1) onClose(); }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} key={current.src} src={current.src} alt={current.alt || ""} draggable={false}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
      {images.length > 1 && <>
        <button type="button" className="iv-nav is-prev" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(-1)} aria-label="Previous image"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6" /></svg></button>
        <button type="button" className="iv-nav is-next" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(1)} aria-label="Next image"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg></button>
      </>}
    </div>

    {images.length > 1 && <div className="iv-thumbs">
      {images.map((image, i) => <button key={`${image.src}-${i}`} type="button" aria-label={`Image ${i + 1}`} aria-current={i === index ? "true" : undefined} onClick={() => { setIndex(i); reset(); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="" loading="lazy" />
      </button>)}
    </div>}
    <p className="iv-hint">Scroll or pinch to zoom · drag to move · double-click to zoom in</p>
  </div>, document.body);
}
