// src/components/StoneGallery.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

export default function StoneGallery({
  images = [],
  stoneType = "Stone",
  stoneId,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [bgPos, setBgPos] = useState("center");
  const [trackEvent] = useTrackEventMutation();

  const active = images[activeIndex] ?? "";
  const { t } = useTranslation();

  const onMove = (e) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setBgPos(`${x}% ${y}%`);
  };

  const handleThumbClick = (i) => {
    setActiveIndex(i);
    try {
      trackEvent({
        event_type: "stone_gallery_image_click",
        stone_id: stoneId ?? null,
        index: i,
      });
    } catch {
      /* ignore tracking failures */
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
      {/* Thumbnails */}
      <div className="flex md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-y-auto max-h-[560px] md:pr-2">
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            onClick={() => handleThumbClick(i)}
            className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg cursor-pointer border transition
            ${
              i === activeIndex
                ? "border-backnewswhite ring-2 ring-backnewswhite/40"
                : "border-gray-300 dark:border-gray-600"
            }`}
            fetchPriority="high"
            loading="lazy"
            decoding="async"
            alt=""
          />
        ))}
      </div>

      {/* Main + details */}
      <div className="flex-1 grid md:grid-cols-[minmax(0,600px)_1fr] gap-4 md:gap-6">
        {/* Main image with zoom */}
        <div
          className="w-full aspect-[4/3] md:h-[560px] border rounded-xl bg-no-repeat bg-contain md:bg-cover bg-center dark:border-gray-700"
          style={{
            backgroundImage: `url(${active})`,
            backgroundPosition: bgPos,
          }}
          onMouseMove={onMove}
          onMouseLeave={() => setBgPos("center")}
        >
          <img
            src={active}
            alt="Stone"
            className="w-full h-full object-contain opacity-0"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Right details */}
        <div className="flex flex-col gap-4 text-sm text-gray-800 dark:text-gray-200">
          <h2 className="text-2xl font-semibold capitalize">{stoneType}</h2>

          {/* Colors */}
          <div>
            <p className="font-semibold mb-2">
              {t("naturalStone.stone1.availableColors")}
            </p>
            <div className="flex flex-wrap gap-2">
              {["white", "black", "gray", "beige", "green", "maroon"].map(
                (color) => (
                  <div
                    key={color}
                    className="w-6 h-6 rounded-full border shadow-sm cursor-default"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                )
              )}
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="font-semibold mb-2">
              {t("naturalStone.stone1.features")}
            </p>
            <ul className="list-disc ml-5 text-gray-700 dark:text-gray-300 space-y-1">
              {t("naturalStone.stone1.featureList", {
                returnObjects: true,
              }).map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
          </div>

          {/* Usage */}
          <div>
            <p className="font-semibold mb-2">
              {t("naturalStone.stone1.usedFor")}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {t("naturalStone.stone1.usage")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
