import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChristmasCatalogue } from "../features/promos/christmasApi";

const OFFER_COPY = {
  en: [
    [
      "Vases · Buy one, get one free",
      "Buy an eligible vase and get a second vase of the same SKU free, while stocks last.",
    ],
    [
      "Buy one item · Choose a gift",
      "Buy a qualifying item and choose a free gift from the selected products priced under €80.",
    ],
    [
      "Buy two items · Save 25% + get a gift",
      "Get 25% off two qualifying paid items and choose one free gift from the selected products priced under €80.",
    ],
  ],
  de: [
    [
      "Vasen · 1 kaufen, 1 gratis",
      "Beim Kauf einer teilnehmenden Vase erhalten Sie eine zweite Vase desselben Artikels gratis, solange der Vorrat reicht.",
    ],
    [
      "1 Artikel kaufen · Geschenk wählen",
      "Kaufen Sie einen teilnehmenden Artikel und wählen Sie ein Gratisgeschenk aus den ausgewählten Produkten unter 80 €.",
    ],
    [
      "2 Artikel kaufen · 25 % Rabatt + Geschenk",
      "Sparen Sie 25 % auf zwei teilnehmende Artikel und wählen Sie ein Gratisgeschenk aus den ausgewählten Produkten unter 80 €.",
    ],
  ],
};

export default function ChristmasOffers({ placement }) {
  const { pathname } = useLocation();

  const route = pathname.replace(/\/+$/, "") || "/";
  const home = route === "/";
  const products =
    route === "/decorative-products" ||
    /^\/decorative-products\/category\/[^/]+$/.test(route);
  const cart = route === "/cart";
  const ticker = placement === "ticker";

  if (ticker ? !home : !home && !products && !cart) return null;

  return <Offers key={route} ticker={ticker} home={home} cart={cart} />;
}

function Offers({ ticker, home, cart }) {
  const { active, enabled } = useChristmasCatalogue();
  const { i18n } = useTranslation();
  const de = i18n.language?.startsWith("de");
  const offers = OFFER_COPY[de ? "de" : "en"];
  const dialog = useRef(null);

  const track = useRef(null);
  const titleId = useId();
  const [selected, setSelected] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!active) setDialogOpen(false);
  }, [active]);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!active || !ticker || paused || hovered || focused || dialogOpen)
      return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (motion.matches || document.hidden || !track.current) return;
      const { scrollLeft, clientWidth, scrollWidth } = track.current;
      if (clientWidth === 0) return;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 2;
      track.current.scrollTo({
        left: atEnd ? 0 : scrollLeft + clientWidth,
        behavior: "smooth",
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [active, ticker, paused, hovered, focused, dialogOpen]);

  if (!active) return null;

  const heading = de ? "Weihnachtsangebote" : "Christmas offers";
  const [selectedTitle, description] = offers[selected];

  function move(direction) {
    const row = track.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth });
  }

  function openOffer(index) {
    setSelected(index);
    setDialogOpen(true);
    dialog.current.showModal();
  }

  return (
    <section
      aria-label={heading}
      className={
        ticker
          ? "bg-emerald-950 text-white"
          : "bg-emerald-950 px-4 py-4 text-white"
      }
    >
      <div
        className={
          ticker
            ? "mx-auto flex max-w-5xl items-center gap-2 px-3"
            : "mx-auto max-w-7xl"
        }
      >
        {!ticker && <h2 className="mb-3 text-lg font-semibold">{heading}</h2>}
        <div
          className={
            ticker
              ? "flex min-w-0 flex-1 items-center gap-2"
              : "flex items-center gap-2"
          }
        >
          {(home || ticker) && (
            <button
              type="button"
              className="shrink-0 p-2"
              onClick={() => move(-1)}
              aria-label={de ? "Vorheriges Angebot" : "Previous offer"}
            >
              ‹
            </button>
          )}
          <div
            ref={track}
            className={
              home
                ? "flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto"
                : "flex min-w-0 flex-1 snap-x gap-3 overflow-x-auto pb-1"
            }
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setFocused(false);
            }}
          >
            {offers.map(([title], index) => (
              <button
                key={index}
                type="button"
                aria-haspopup="dialog"
                onClick={() => openOffer(index)}
                className={
                  ticker
                    ? "w-full flex-none snap-start px-2 py-2 text-center text-sm font-semibold hover:underline"
                    : `${home ? "w-full" : "w-64 max-w-full"} shrink-0 snap-start rounded-lg border border-emerald-600 px-4 py-3 text-left text-sm font-semibold hover:bg-emerald-800`
                }
              >
                {title}
              </button>
            ))}
          </div>
          {(home || ticker) && (
            <button
              type="button"
              className="shrink-0 p-2"
              onClick={() => move(1)}
              aria-label={de ? "Nächstes Angebot" : "Next offer"}
            >
              ›
            </button>
          )}
        </div>
        {ticker && (
          <button
            type="button"
            className="shrink-0 px-2 py-1 text-xs underline"
            onClick={() => setPaused(!paused)}
          >
            {paused ? (de ? "Start" : "Play") : "Pause"}
          </button>
        )}
        {!ticker && !enabled && (
          <p className="mt-2 text-sm text-emerald-100">
            {de
              ? "Derzeit sind diese Angebote im Checkout nicht verfügbar."
              : "These offers are currently unavailable at checkout."}
          </p>
        )}
      </div>
      <dialog
        ref={dialog}
        onClose={() => setDialogOpen(false)}
        aria-labelledby={titleId}
        className="m-auto max-h-[90dvh] w-[min(92vw,34rem)] overflow-y-auto rounded-xl bg-emerald-950 p-6 text-white backdrop:bg-black/70"
      >
        <form method="dialog" className="mb-3 flex justify-end">
          <button type="submit" className="underline">
            {de ? "Schließen" : "Close"}
          </button>
        </form>
        <h2 id={titleId} className="mb-3 text-xl font-semibold">
          {selectedTitle}
        </h2>
        <p className="mb-4 text-emerald-100">{description}</p>

        <p className="mb-4 text-sm text-emerald-100">
          {enabled
            ? de
              ? "Pro Bestellung gilt das beste verfügbare Angebot. Maximal ein Gratisartikel pro Bestellung."
              : "The best available offer applies, with a maximum of one free item per order."
            : de
              ? "Derzeit im Checkout nicht verfügbar."
              : "Currently unavailable at checkout."}
        </p>
        {(!cart || enabled) && (
          <Link
            to={cart ? "/cart" : "/decorative-products"}
            onClick={() => dialog.current.close()}
            className="underline"
          >
            {cart
              ? de
                ? "Zurück zum Warenkorb"
                : "Back to cart"
              : de
                ? "Produkte ansehen"
                : "Browse products"}
          </Link>
        )}
      </dialog>
    </section>
  );
}
