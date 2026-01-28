import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function distance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export default function LightboxModal({
  open,
  images,
  index,
  onIndexChange,
  onClose,
  originRect, // DOMRect from clicked image
  altPrefix = "Image",
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const overlayRef = useRef(null);
  const imgWrapRef = useRef(null);

  // --- Gesture refs (pinch + pan) ---
  const gestureRef = useRef({
    mode: "none", // "pan" | "pinch"
    startScale: 1,
    startPan: { x: 0, y: 0 },
    startDist: 0,
    startMid: { x: 0, y: 0 },
    lastTapAt: 0,
  });

  // Reset zoom when image changes / open closes
  useEffect(() => {
    if (open) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, index]);

  const currentSrc = images?.[index];

  const canPrev = index > 0;
  const canNext = index < (images?.length ?? 0) - 1;

  const goPrev = useCallback(() => {
    if (canPrev) onIndexChange(index - 1);
  }, [canPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (canNext) onIndexChange(index + 1);
  }, [canNext, index, onIndexChange]);

  // ESC to close, arrows to navigate
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

  // Close on backdrop click (but not when zoomed/panning)
  const onBackdropMouseDown = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Double-tap zoom (mobile)
  const toggleDoubleTapZoom = useCallback((clientX, clientY) => {
    const wrap = imgWrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    // transform-origin in percentages
    const ox = ((clientX - rect.left) / rect.width) * 100;
    const oy = ((clientY - rect.top) / rect.height) * 100;

    wrap.style.transformOrigin = `${ox}% ${oy}%`;

    setPan({ x: 0, y: 0 });
    setScale((prev) => (prev > 1 ? 1 : 2.5));
  }, []);

  // Touch handlers: pinch-to-zoom + pan + double-tap
  const onTouchStart = (e) => {
    if (!open) return;

    // Double-tap detection
    if (e.touches.length === 1) {
      const now = Date.now();
      const dt = now - gestureRef.current.lastTapAt;
      gestureRef.current.lastTapAt = now;

      if (dt > 0 && dt < 300) {
        const t = e.touches[0];
        toggleDoubleTapZoom(t.clientX, t.clientY);
        return;
      }

      gestureRef.current.mode = "pan";
      gestureRef.current.startPan = { ...pan };
      gestureRef.current.startScale = scale;
      gestureRef.current.startMid = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      return;
    }

    if (e.touches.length === 2) {
      gestureRef.current.mode = "pinch";
      gestureRef.current.startScale = scale;
      gestureRef.current.startPan = { ...pan };
      gestureRef.current.startDist = distance(e.touches[0], e.touches[1]);
      gestureRef.current.startMid = midpoint(e.touches[0], e.touches[1]);
    }
  };

  const onTouchMove = (e) => {
    if (!open) return;
    if (!imgWrapRef.current) return;

    // Prevent page scroll while interacting
    e.preventDefault();

    if (gestureRef.current.mode === "pinch" && e.touches.length === 2) {
      const distNow = distance(e.touches[0], e.touches[1]);
      const ratio = distNow / (gestureRef.current.startDist || distNow);
      const nextScale = clamp(gestureRef.current.startScale * ratio, 1, 4);

      // Keep pinch centered (small panning support)
      const midNow = midpoint(e.touches[0], e.touches[1]);
      const dx = midNow.x - gestureRef.current.startMid.x;
      const dy = midNow.y - gestureRef.current.startMid.y;

      setScale(nextScale);

      // allow a little pan while pinching
      setPan({
        x: gestureRef.current.startPan.x + dx,
        y: gestureRef.current.startPan.y + dy,
      });

      return;
    }

    if (gestureRef.current.mode === "pan" && e.touches.length === 1) {
      // Pan only when zoomed in, otherwise let swipe/nav be handled by UI buttons
      if (scale <= 1) return;

      const t = e.touches[0];
      const dx = t.clientX - gestureRef.current.startMid.x;
      const dy = t.clientY - gestureRef.current.startMid.y;

      setPan({
        x: gestureRef.current.startPan.x + dx,
        y: gestureRef.current.startPan.y + dy,
      });
    }
  };

  const onTouchEnd = () => {
    gestureRef.current.mode = "none";
    // If zoomed out, reset pan
    if (scale <= 1) setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom (nice on desktop)
  const onWheel = (e) => {
    if (!open) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const step = delta > 0 ? 0.15 : -0.15;
    setScale((prev) => clamp(prev + step, 1, 4));
    if (scale <= 1) setPan({ x: 0, y: 0 });
  };

  // Opening animation origin
  const origin = useMemo(() => {
    if (!originRect) return null;
    return {
      left: originRect.left,
      top: originRect.top,
      width: originRect.width,
      height: originRect.height,
    };
  }, [originRect]);

  // Fullscreen target rect
  const fullscreenTarget = useMemo(() => {
    // These numbers feel good visually; you can tweak
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = Math.min(vw, vh) * 0.9;
    return {
      left: (vw - size) / 2,
      top: (vh - size) / 2,
      width: size,
      height: size,
    };
  }, [open, index]); // recalc on open/index changes

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onBackdropMouseDown}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 rounded-lg px-3 py-2 bg-white/10 text-white hover:bg-white/15"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Prev / Next */}
          <button
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 rounded-full w-12 h-12 bg-white/10 text-white hover:bg-white/15 disabled:opacity-40"
            onClick={goPrev}
            disabled={!canPrev}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 rounded-full w-12 h-12 bg-white/10 text-white hover:bg-white/15 disabled:opacity-40"
            onClick={goNext}
            disabled={!canNext}
            aria-label="Next image"
          >
            ›
          </button>

          {/* Animated zoom-from-origin container */}
          <motion.div
            className="relative"
            initial={
              origin
                ? {
                    x: origin.left,
                    y: origin.top,
                    width: origin.width,
                    height: origin.height,
                  }
                : { opacity: 0, scale: 0.95 }
            }
            animate={
              origin
                ? {
                    x: fullscreenTarget.left,
                    y: fullscreenTarget.top,
                    width: fullscreenTarget.width,
                    height: fullscreenTarget.height,
                  }
                : { opacity: 1, scale: 1 }
            }
            exit={
              origin
                ? {
                    x: origin.left,
                    y: origin.top,
                    width: origin.width,
                    height: origin.height,
                  }
                : { opacity: 0, scale: 0.95 }
            }
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            style={
              origin
                ? {
                    position: "fixed",
                    left: 0,
                    top: 0,
                  }
                : undefined
            }
          >
            {/* Image wrapper handles gestures */}
            <div
              ref={imgWrapRef}
              className="w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-xl touch-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onWheel={onWheel}
            >
              <img
                src={currentSrc}
                alt={`${altPrefix} – ${index + 1}`}
                className="w-full h-full object-contain select-none"
                draggable={false}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
                  transition:
                    gestureRef.current.mode === "none"
                      ? "transform 120ms ease"
                      : "none",
                }}
              />
            </div>

            {/* Small hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/40 px-3 py-1 rounded-full">
              Pinch / wheel to zoom • Double-tap to zoom • ← → to navigate
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
