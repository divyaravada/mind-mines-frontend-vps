import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChristmasCatalogue } from "../features/promos/christmasApi";

const OFFER_IMAGES = ["vase-bogo", "one-item-gift", "two-items-discount-gift"];

const OFFER_COPY = {
  en: [
    [
      "Vases · Buy one, get one free",
      "Add one eligible vase to your cart. If a second identical vase is in stock and this is your best available offer, it is added for €0 at checkout.",
    ],
    [
      "Buy one item · Choose a gift",
      "Add one eligible product to your cart, then choose one free gift from the Christmas gift list. Each gift on the list is priced under €80.",
    ],
    [
      "Buy two items · Save 15% + get a gift",
      "Add two eligible products to your cart. This offer takes 15% off both items and lets you choose one free gift from the Christmas gift list (under €80).",
    ],
  ],
  de: [
    [
      "Vasen · 1 kaufen, 1 gratis",
      "Legen Sie eine teilnehmende Vase in den Warenkorb. Ist eine zweite identische Vase verfügbar und ist dies Ihr bestes Angebot, erhalten Sie die zweite Vase an der Kasse für 0 €.",
    ],
    [
      "1 Artikel kaufen · Geschenk wählen",
      "Legen Sie einen teilnehmenden Artikel in den Warenkorb und wählen Sie ein Gratisgeschenk aus der Weihnachtsgeschenkliste. Alle Geschenke auf der Liste kosten unter 80 €.",
    ],
    [
      "2 Artikel kaufen · 15 % Rabatt + Geschenk",
      "Legen Sie zwei teilnehmende Artikel in den Warenkorb. Sie erhalten mit diesem Angebot 15 % Rabatt auf beide Artikel und wählen ein Gratisgeschenk aus der Weihnachtsgeschenkliste (unter 80 €).",
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
  const carousel = home && !ticker;

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
    if (!active || !home || paused || hovered || focused || dialogOpen) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(
      () => {
        if (motion.matches || document.hidden || !track.current) return;
        const { scrollLeft, clientWidth, scrollWidth } = track.current;
        if (clientWidth === 0) return;
        const atEnd = scrollLeft + clientWidth >= scrollWidth - 2;
        track.current.scrollTo({
          left: atEnd ? 0 : scrollLeft + clientWidth,
          behavior: "smooth",
        });
      },
      ticker ? 4500 : 8000,
    );
    return () => window.clearInterval(timer);
  }, [active, home, ticker, paused, hovered, focused, dialogOpen]);

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
          : carousel
            ? "bg-gradient-to-br from-[#082f27] via-[#104337] to-[#06241d] px-2 py-5 text-white sm:px-6"
            : "bg-emerald-950 px-4 py-4 text-white"
      }
    >
      <div
        className={
          ticker
            ? "mx-auto flex max-w-5xl items-center gap-2 px-3"
            : carousel
              ? "mx-auto w-full"
              : "mx-auto max-w-7xl"
        }
      >
        {!ticker && (
          <h2
            className={
              carousel
                ? "mb-4 text-center font-serif text-xl text-amber-100 sm:text-2xl"
                : "mb-3 text-lg font-semibold"
            }
          >
            {heading}
          </h2>
        )}

        <div
          className={
            carousel
              ? "flex items-center gap-1 sm:gap-4"
              : "flex min-w-0 flex-1 items-center gap-2"
          }
        >
          {(home || ticker) && (
            <button
              type="button"
              className={
                carousel
                  ? "h-8 w-8 shrink-0 rounded-full border border-amber-100/40 text-2xl leading-none hover:bg-white/10 sm:h-11 sm:w-11"
                  : "shrink-0 px-2 py-1"
              }
              onClick={() => move(-1)}
              aria-label={de ? "Vorheriges Angebot" : "Previous offer"}
            >
              ‹
            </button>
          )}
          <div
            ref={track}
            style={home ? { scrollbarWidth: "none" } : undefined}
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
            {offers.map(([title, details], index) => (
              <button
                key={index}
                type="button"
                aria-haspopup="dialog"
                onClick={() => openOffer(index)}
                className={
                  ticker
                    ? "w-full flex-none snap-start px-2 py-2 text-center text-sm font-semibold hover:underline"
                    : carousel
                      ? "flex w-full shrink-0 snap-start items-center rounded-2xl bg-white/5 px-4 py-6 text-left hover:bg-white/10 focus-visible:outline focus-visible:-outline-offset-4 focus-visible:outline-amber-200 sm:px-8 lg:h-[500px]"
                      : "w-64 max-w-full shrink-0 snap-start rounded-lg border border-emerald-600 px-4 py-3 text-left text-sm font-semibold hover:bg-emerald-800"
                }
              >
                {carousel ? (
                  <span className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-5 md:grid-cols-2 md:gap-10 lg:gap-16">
                    <img
                      src={`${process.env.PUBLIC_URL || ""}/christmas-offers/${OFFER_IMAGES[index]}.png`}
                      alt=""
                      width="384"
                      height="384"
                      className="mx-auto aspect-square w-full max-w-[240px] rounded-xl object-contain shadow-xl md:max-w-[420px]"
                    />
                    <span>
                      <span className="block font-serif text-3xl font-semibold leading-tight text-amber-50 lg:text-5xl">
                        {title}
                      </span>
                      <span className="mt-3 block text-base font-normal leading-relaxed text-emerald-50 md:text-lg">
                        {details}
                      </span>
                      <span className="mt-5 inline-flex rounded-full bg-amber-100 px-5 py-2 text-sm font-semibold text-emerald-950">
                        {de ? "Angebot ansehen" : "View offer"}{" "}
                        <span aria-hidden="true" className="ml-2">
                          →
                        </span>
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="block">{title}</span>
                )}
              </button>
            ))}
          </div>
          {(home || ticker) && (
            <button
              type="button"
              className={
                carousel
                  ? "h-8 w-8 shrink-0 rounded-full border border-amber-100/40 text-2xl leading-none hover:bg-white/10 sm:h-11 sm:w-11"
                  : "shrink-0 px-2 py-1"
              }
              onClick={() => move(1)}
              aria-label={de ? "Nächstes Angebot" : "Next offer"}
            >
              ›
            </button>
          )}
        </div>
        {home && (
          <button
            type="button"
            className={`${carousel ? "mx-auto mt-3 block" : ""} shrink-0 px-2 py-1 text-xs underline`}
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
