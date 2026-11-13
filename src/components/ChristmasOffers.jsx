import { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChristmasCatalogue } from "../features/promos/christmasApi";

export default function ChristmasOffers() {
  const { pathname } = useLocation();
  const onOffersPage =
    pathname === "/" ||
    pathname === "/decorative-products" ||
    pathname.startsWith("/decorative-products/category/");
  return onOffersPage ? <Offers /> : null;
}

function Offers() {
  const { enabled } = useChristmasCatalogue();
  const { i18n } = useTranslation();
  const de = i18n.language?.startsWith("de");
  const dialog = useRef(null);
  if (!enabled) return null;

  const offers = de
    ? [
        [
          "Vasenangebot",
          "Zu einer teilnehmenden Vase erhalten Sie eine identische Vase gratis, solange der Vorrat reicht.",
        ],
        [
          "Ein Artikel und ein Geschenk",
          "Wählen Sie einen kostenlosen Artikel aus dem Geschenksortiment.",
        ],
        [
          "Zwei Artikel und ein Geschenk",
          "25 % Rabatt auf zwei Artikel und ein Geschenk aus dem Geschenksortiment.",
        ],
      ]
    : [
        [
          "Vase offer",
          "Buy an eligible vase and get an identical vase free while stocks last.",
        ],
        [
          "One item and a gift",
          "Choose a complimentary item from the gift selection.",
        ],
        [
          "Two items and a gift",
          "Get 25% off two items and a gift from the gift selection.",
        ],
      ];

  return (
    <section
      className="bg-emerald-950 px-4 py-3 text-white"
      aria-label={de ? "Weihnachtsangebote" : "Christmas offers"}
    >
      <div className="mx-auto flex max-w-7xl snap-x gap-3 overflow-x-auto pb-1">
        {offers.map(([title]) => (
          <button
            key={title}
            type="button"
            onClick={() => dialog.current.showModal()}
            className="shrink-0 snap-start rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-800"
          >
            {title}
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="christmas-offers-title"
        className="m-auto max-h-[90dvh] w-[min(92vw,34rem)] overflow-y-auto rounded-xl bg-emerald-950 p-6 text-white backdrop:bg-black/70"
      >
        <form method="dialog" className="float-right">
          <button type="submit" className="underline">
            {de ? "Schließen" : "Close"}
          </button>
        </form>
        <h2 id="christmas-offers-title" className="mb-4 text-xl font-semibold">
          {de ? "Weihnachtsangebote" : "Christmas offers"}
        </h2>
        {offers.map(([title, description]) => (
          <article key={title} className="mb-4">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-emerald-100">{description}</p>
          </article>
        ))}
        <p className="mb-4 text-sm text-emerald-100">
          {de
            ? "Pro Bestellung gilt das beste verfügbare Angebot."
            : "The best available offer applies once per order."}
        </p>
        <Link
          to="/decorative-products"
          onClick={() => dialog.current.close()}
          className="underline"
        >
          {de ? "Produkte ansehen" : "Browse products"}
        </Link>
      </dialog>
    </section>
  );
}
