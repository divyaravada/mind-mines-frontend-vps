import { giftName } from "../features/promos/christmasApi";
import { fmtEUR } from "../lib/money";

export default function ChristmasGiftSelector({
  gifts,
  giftId,
  onChange,
  locale,
}) {
  const de = locale.startsWith("de");
  return (
    <fieldset className="my-4 min-w-0 w-full max-w-full rounded-xl border border-emerald-700 p-4">
      <legend className="px-2 font-semibold">
        {de ? "Weihnachtsgeschenk" : "Christmas gift"}
      </legend>
      <div className="flex min-w-0 w-full snap-x gap-3 overflow-x-auto px-1 pb-2">
        {gifts.map((gift) => {
          const title = giftName(gift, de);
          const selected = gift.id === giftId;
          return (
            <button
              key={gift.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : gift.id)}
              className={`w-36 shrink-0 snap-start rounded-lg border p-2 text-left text-sm ${selected ? "border-emerald-600 ring-2 ring-emerald-500" : "border-gray-300 dark:border-gray-600"}`}
            >
              {gift.image && (
                <img
                  src={gift.image}
                  alt=""
                  loading="lazy"
                  className="mb-2 h-20 w-full rounded object-cover"
                />
              )}
              <span className="block font-medium">{title}</span>
              <span>{fmtEUR(Number(gift.final_price_gross), locale)}</span>
            </button>
          );
        })}
      </div>
      {!gifts.length && (
        <p className="text-sm">
          {de
            ? "Derzeit sind keine Geschenkartikel verfügbar."
            : "No gift products are currently available."}
        </p>
      )}
    </fieldset>
  );
}
