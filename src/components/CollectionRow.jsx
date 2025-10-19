// src/components/CollectionRow.jsx
import mobileHolder from "../assets/mobileHolder.jpg";
import bathSoap from "../assets/mackeUpHolder.jpg";
import kitchenBowl from "../assets/kitchenBowl.jpg";
import marbleTray from "../assets/marbleTray.jpg";
import { useTranslation } from "react-i18next";

const collection = [
  { key: "mobileHolder", image: mobileHolder },
  { key: "multipurpose", image: bathSoap },
  { key: "kitchenBowl", image: kitchenBowl },
  { key: "tray", image: marbleTray },
];

export function CollectionRow() {
  const { t } = useTranslation();
  return (
    <section className="py-14 bg-[#f8fcfe] dark:bg-marbleblack">
      <h2 className="text-3xl font-bold mb-8 text-center text-[#ec8b0b] dark:text-[#578d49]">
        {t("home.ourCollection")}
      </h2>
      <div className="w-full mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {collection.map((item) => (
          <div key={item.key} className="flex flex-col items-center group">
            <div className="overflow-hidden rounded-2xl shadow-lg w-full aspect-[4/5] bg-gray-100 dark:bg-gray-800">
              <img
                src={item.image}
                alt={t(`home.collection.${item.key}`)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {t(`home.collection.${item.key}`)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
