// src/components/LightboxModal.jsx
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Carousel } from "react-responsive-carousel";
import ReactPlayer from "react-player";
import "react-responsive-carousel/lib/styles/carousel.min.css";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function LightboxModal({
  open,
  items,
  index,
  originRect,
  title,
  onIndexChange,
  onClose,
}) {
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  // zoom / pan state
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const stageRef = useRef(null);
  const pointers = useRef(new Map());
  const pinchRef = useRef({ startDist: 0, startScale: 1, cx: 0, cy: 0 });
  const dragRef = useRef({ down: false, sx: 0, sy: 0, stx: 0, sty: 0 });

  // open/close animation
  const [animState, setAnimState] = useState("enter"); // enter | shown | exit
  const [from, setFrom] = useState(null);

  // double-tap
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // ESC, arrows
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      // when changing slide, reset zoom
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, resetZoom]);

  // set origin animation
  useEffect(() => {
    if (!open) return;
    if (originRect) {
      setFrom({
        left: originRect.left,
        top: originRect.top,
        width: originRect.width,
        height: originRect.height,
      });
    } else {
      setFrom(null);
    }
    setAnimState("enter");
    resetZoom();
    const id = requestAnimationFrame(() => setAnimState("shown"));
    return () => cancelAnimationFrame(id);
  }, [open, originRect, resetZoom]);

  // close with animation back to origin
  const requestClose = useCallback(() => {
    setAnimState("exit");
    // allow CSS transition to run, then call onClose
    window.setTimeout(() => {
      onClose?.();
      setAnimState("enter");
    }, 220);
  }, [onClose]);

  // keep carousel in sync
  const selected = clamp(index ?? 0, 0, Math.max(0, list.length - 1));

  // pan boundaries (simple clamp)
  const clampPan = useCallback((nextTx, nextTy, nextScale) => {
    // loose bounds: allow some movement; clamp to viewport-ish range
    const max = 0.5 * (nextScale - 1) * 1000; // heuristic
    return {
      tx: clamp(nextTx, -max, max),
      ty: clamp(nextTy, -max, max),
    };
  }, []);

  const setZoomAtPoint = useCallback(
    (nextScale, clientX, clientY) => {
      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      const px = clientX - rect.left - rect.width / 2;
      const py = clientY - rect.top - rect.height / 2;

      // keep point under finger by adjusting translation
      const ratio = nextScale / scale;
      const nextTx = (tx - px) * ratio + px;
      const nextTy = (ty - py) * ratio + py;

      const clamped = clampPan(nextTx, nextTy, nextScale);
      setScale(nextScale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    },
    [scale, tx, ty, clampPan],
  );

  // Pointer events for pinch/pan
  const onPointerDown = useCallback(
    (e) => {
      // allow carousel swipe when not zoomed
      if (!stageRef.current) return;

      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture?.(e.pointerId);

      // double tap detection (touch / pen)
      if (e.pointerType !== "mouse") {
        const now = Date.now();
        const dt = now - lastTap.current.t;
        const dx = Math.abs(e.clientX - lastTap.current.x);
        const dy = Math.abs(e.clientY - lastTap.current.y);

        if (dt < 260 && dx < 28 && dy < 28) {
          // double tap -> toggle zoom at point
          const next = scale > 1 ? 1 : 2.5;
          if (next === 1) resetZoom();
          else setZoomAtPoint(next, e.clientX, e.clientY);
          lastTap.current = { t: 0, x: 0, y: 0 };
          return;
        }
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }

      const pts = Array.from(pointers.current.values());
      if (pts.length === 1 && scale > 1) {
        dragRef.current = {
          down: true,
          sx: e.clientX,
          sy: e.clientY,
          stx: tx,
          sty: ty,
        };
      }

      if (pts.length === 2) {
        // start pinch
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        pinchRef.current.startDist = dist || 1;
        pinchRef.current.startScale = scale;
        pinchRef.current.cx = (a.x + b.x) / 2;
        pinchRef.current.cy = (a.y + b.y) / 2;
      }
    },
    [scale, tx, ty, resetZoom, setZoomAtPoint],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const pts = Array.from(pointers.current.values());

      // pinch
      if (pts.length === 2) {
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const ratio = dist / (pinchRef.current.startDist || 1);
        const nextScale = clamp(pinchRef.current.startScale * ratio, 1, 4);
        setZoomAtPoint(nextScale, pinchRef.current.cx, pinchRef.current.cy);
        return;
      }

      // drag (only when zoomed)
      if (dragRef.current.down && scale > 1) {
        const dx = e.clientX - dragRef.current.sx;
        const dy = e.clientY - dragRef.current.sy;
        const nextTx = dragRef.current.stx + dx;
        const nextTy = dragRef.current.sty + dy;
        const clamped = clampPan(nextTx, nextTy, scale);
        setTx(clamped.tx);
        setTy(clamped.ty);
      }
    },
    [scale, clampPan, setZoomAtPoint],
  );

  const onPointerUp = useCallback((e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinchRef.current.startDist = 0;
    }
    dragRef.current.down = false;
  }, []);

  // wheel zoom (desktop)
  const onWheel = useCallback(
    (e) => {
      if (!open) return;
      e.preventDefault();
      const delta = -e.deltaY;
      const step = delta > 0 ? 1.12 : 0.9;
      const nextScale = clamp(scale * step, 1, 4);
      if (nextScale === 1) resetZoom();
      else setZoomAtPoint(nextScale, e.clientX, e.clientY);
    },
    [open, scale, resetZoom, setZoomAtPoint],
  );

  // reset zoom when slide changes
  const handleChange = useCallback(
    (i) => {
      resetZoom();
      onIndexChange?.(i);
    },
    [onIndexChange, resetZoom],
  );

  if (!open) return null;

  const overlayStyle = (() => {
    // Animate from clicked thumbnail (originRect) -> fullscreen
    if (!from) return {};
    if (animState === "shown") return {};
    if (animState === "enter") {
      // start from origin
      const sx = from.width / window.innerWidth;
      const sy = from.height / window.innerHeight;
      const cx = from.left + from.width / 2 - window.innerWidth / 2;
      const cy = from.top + from.height / 2 - window.innerHeight / 2;
      return {
        transformOrigin: "center",
        transform: `translate(${cx}px, ${cy}px) scale(${sx}, ${sy})`,
        opacity: 0.2,
      };
    }
    // exit: go back to origin
    const sx = from.width / window.innerWidth;
    const sy = from.height / window.innerHeight;
    const cx = from.left + from.width / 2 - window.innerWidth / 2;
    const cy = from.top + from.height / 2 - window.innerHeight / 2;
    return {
      transformOrigin: "center",
      transform: `translate(${cx}px, ${cy}px) scale(${sx}, ${sy})`,
      opacity: 0.2,
    };
  })();

  const content = (
    <div
      className="fixed inset-0 z-[999999] bg-black"
      style={{
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        overscrollBehavior: "none",
      }}
      onWheel={onWheel}
    >
      <style>{`
        .mm-fs,
        .mm-fs .carousel-root,
        .mm-fs .carousel.carousel-slider,
        .mm-fs .slider-wrapper.axis-horizontal,
        .mm-fs .slider,
        .mm-fs .slide {
          width: 100vw !important;
          height: 100dvh !important;
        }
        .mm-fs .slide {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #000 !important;
        }
        /* keep thumbs visible but not too tall */
        .mm-fs .thumbs-wrapper { margin: 0 !important; padding: 8px 0 12px !important; }
        .mm-fs .thumbs { padding: 0 10px !important; }
        .mm-fs .thumb img { object-fit: cover !important; }
        .mm-fs .control-dots { display: none !important; }
        .mm-fs .control-arrow { z-index: 1000002 !important; }
        /* allow swipe left/right, but we handle pinch/pan on stage */
        .mm-fs .slider-wrapper.axis-horizontal { touch-action: pan-x !important; }
      `}</style>

      {/* animated wrapper */}
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={overlayStyle}
      >
        {/* top bar */}
        <div
          className="fixed left-0 right-0 z-[1000003] flex items-center justify-between px-4 py-3"
          style={{ top: 0, paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <div className="text-white/80 text-sm truncate pr-2">
            {title || ""}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (scale > 1) resetZoom();
                else setScale(2.5);
              }}
              className="px-3 py-2 rounded-md bg-white/15 text-white text-lg"
              title="Zoom"
            >
              {scale > 1 ? "−" : "+"}
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="px-3 py-2 rounded-md bg-white/15 text-white text-lg"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* viewer */}
        <div
          className="mm-fs"
          style={{
            width: "100vw",
            height: "100dvh",
            paddingTop: "calc(max(12px, env(safe-area-inset-top)) + 56px)",
          }}
        >
          <Carousel
            selectedItem={selected}
            onChange={handleChange}
            showThumbs
            showStatus={false}
            infiniteLoop
            useKeyboardArrows
            swipeable={scale === 1} // ✅ when zoomed, disable carousel swipe
            emulateTouch={scale === 1}
            dynamicHeight={false}
            preventMovementUntilSwipeScrollTolerance
            swipeScrollTolerance={8}
          >
            {list.map((m, i) =>
              m?.media_type === "video" && m?.video ? (
                <div
                  key={i}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div className="w-full max-w-5xl px-4">
                    <ReactPlayer src={m.video} controls width="100%" />
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="w-full h-full flex items-center justify-center bg-black"
                >
                  {/* stage: handles pinch/pan */}
                  <div
                    ref={stageRef}
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      touchAction: "none", // ✅ important for pinch/pan
                      userSelect: "none",
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  >
                    <img
                      src={m?.image}
                      alt=""
                      draggable={false}
                      className="max-w-full max-h-full object-contain select-none"
                      style={{
                        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                        transformOrigin: "center",
                        transition: pointers.current.size
                          ? "none"
                          : "transform 120ms ease-out",
                      }}
                    />
                  </div>

                  {/* hint */}
                  <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 text-white/70 text-xs">
                    Pinch / wheel to zoom • Double-tap to zoom • Swipe to
                    navigate
                  </div>
                </div>
              ),
            )}
          </Carousel>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
