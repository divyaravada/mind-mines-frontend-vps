// src/components/HomeCarousel.jsx
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { useState, useRef, useEffect, useMemo } from "react";
import { homeCategories as rawCategories } from "../data/homeCategories";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function HomeCarousel() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const timer = useRef(null);

  // Safety: ensure it's an array
  const categories = useMemo(() => {
    const arr = Array.isArray(rawCategories) ? rawCategories : [];
    return arr.filter(
      (c) => c.id !== "countertops" && c.id !== "dream_kitchen"
    );
  }, []);

  const [sliderRef, slider] = useKeenSlider({
    loop: true,
    slideChanged(s) {
      setCurrentSlide(s.track.details.rel);
    },
    slides: { perView: 1 },
    renderMode: "performance",
    dragSpeed: 1.8,
  });

  useEffect(() => {
    if (!slider?.current) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => slider.current?.next(), 4000);
    return () => timer.current && clearInterval(timer.current);
  }, [slider]);

  const pauseAutoplay = () => timer.current && clearInterval(timer.current);
  const resumeAutoplay = () => {
    if (slider?.current) {
      timer.current = setInterval(() => slider.current?.next(), 4000);
    }
  };

  // If categories missing, render a simple fallback instead of crashing
  if (!categories.length) {
    return (
      <div className="relative w-full h-[60vh] flex items-center justify-center bg-gray-200 dark:bg-gray-800">
        <div className="text-center px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            {t("home.heroFallback.title")}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {t("home.heroFallback.subtitle")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[32rem] overflow-hidden">
      <div
        ref={sliderRef}
        className="keen-slider h-full md:h-full"
        onMouseEnter={pauseAutoplay}
        onMouseLeave={resumeAutoplay}
      >
        {categories.map((cat, idx) => (
          <div
            key={cat.id ?? idx}
            className="keen-slider__slide relative flex items-end bg-black"
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} / ${categories.length}`}
          >
            <img
              src={cat.image}
              alt={t(`home.categories.${cat.id}.heading`, cat.id)}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              loading="eager"
            />
            <div className="relative z-10 p-8 md:p-12 max-w-3xl">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow mb-2">
                {t(`home.categories.${cat.id}.heading`, cat.id)}
              </h2>
              <div className="w-16 border-b-2 border-white mb-4" />
              <p className="text-base md:text-lg text-gray-100 max-w-xl mb-8 drop-shadow">
                {t(`home.categories.${cat.id}.description`, "")}
              </p>

              {/* If slide is countertops, show secondary CTA to quote page */}
              {cat.id === "countertops" ? (
                <div className="flex gap-3 flex-wrap">
                  <Link
                    to={cat.link}
                    className="inline-block bg-white/90 hover:bg-white text-marbleblack font-bold px-6 py-2 rounded-xl transition"
                  >
                    {t(`home.categories.${cat.id}.button`)}
                  </Link>
                  <a
                    href="https://wa.me/491704658188?text=Hello%20MindMines%2C%20I%20would%20like%20a%20kitchen%20countertop%20quote."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-green-100 hover:bg-green-200 text-green-900 font-bold px-6 py-2 rounded-xl transition"
                  >
                    WhatsApp
                  </a>
                </div>
              ) : (
                <Link
                  to={cat.link}
                  className="inline-block bg-white/90 hover:bg-white text-marbleblack font-bold px-6 py-2 rounded-xl transition"
                >
                  {t(`home.categories.${cat.id}.button`, t("common.shopNow"))}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="absolute left-1/2 bottom-8 -translate-x-1/2 flex gap-2 z-20">
        {categories.map((_, idx) => (
          <button
            key={idx}
            className={`w-4 h-4 rounded-full border-2 border-white bg-white/40 hover:bg-white transition ${
              currentSlide === idx ? "bg-white shadow-lg" : ""
            }`}
            onClick={() => slider.current?.moveToIdx(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
