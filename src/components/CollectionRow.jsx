// src/components/CollectionRow.jsx
import mobileHolder from "../assets/mobileHolder.jpg";
import bathSoap from "../assets/mackeUpHolder.jpg";
import kitchenBowl from "../assets/kitchenBowl.jpg";
import marbleTray from "../assets/marbleTray.jpg";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const collection = [
  {
    key: "mobileHolder",
    image: mobileHolder,
    link: "/decorative-products/category/office-supplies",
  },
  {
    key: "multipurpose",
    image: bathSoap,
    link: "/decorative-products/category/bathroom-accessories",
  },
  {
    key: "kitchenBowl",
    image: kitchenBowl,
    link: "/decorative-products/category/kitchen-serveware",
  },
  {
    key: "tray",
    image: marbleTray,
    link: "/decorative-products/category/storage-organization",
  },
];

export function CollectionRow() {
  const { t } = useTranslation();
  return (
    <section className="py-14 bg-marblewhite dark:bg-marbleblack">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center text-backnewswhite dark:text-backnewsdark">
          {t("home.ourCollection")}
        </h2>

        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 sm:gap-6 md:gap-8">
          {collection.map((item) => (
            <Link
              to={item.link}
              key={item.key}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-backnewswhite dark:focus-visible:ring-backnewsdark rounded-2xl"
            >
              <div className="overflow-hidden rounded-2xl shadow transition-shadow group-hover:shadow-lg w-full aspect-[4/5] bg-gray-100 dark:bg-gray-800">
                <img
                  src={item.image}
                  alt={t(`home.collection.${item.key}`)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  fetchPriority="high"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="mt-3 sm:mt-4 block text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">
                {t(`home.collection.${item.key}`)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
