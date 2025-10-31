//src / components / LowStockBanner.jsx;
export default function LowStockBanner({ stock }) {
  if (stock == null) return null;
  const n = Number(stock);
  if (n <= 0) {
    return (
      <div className="mt-3 p-3 rounded bg-gray-100 text-gray-800 font-semibold">
        Out of stock — arriving soon. Order can be taken on demand.
      </div>
    );
  }
  if (n < 5) {
    return (
      <div className="mt-3 p-3 rounded bg-amber-100 text-amber-900 font-semibold">
        Hurry! Only {n} left in stock.
      </div>
    );
  }
  return null;
}
