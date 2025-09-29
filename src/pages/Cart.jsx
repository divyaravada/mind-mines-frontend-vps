// src/pages/Cart.jsx
import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  selectCartItems,
  selectCartCount,
  selectCartSubtotal,
  removeItem,
  updateQty,
  clearCart,
} from "../features/cart/cartSlice";
import {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from "../features/wishlist/wishlistApi";
import {
  Heart,
  HeartOff,
  Minus,
  Plus,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Truck,
} from "lucide-react";

const fmtEUR = (n) => `${n.toFixed(2)} €`;

export default function CartPage() {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const subtotal = useSelector(selectCartSubtotal);

  const access = useSelector((s) => s.auth?.access);
  const loggedIn = !!access;

  const { data: wl } = useGetWishlistQuery(undefined, { skip: !loggedIn });
  const wishlistIds = useMemo(
    () =>
      wl?.results
        ? wl.results.map((w) => Number(w.product))
        : Array.isArray(wl)
        ? wl.map((w) => Number(w.product))
        : [],
    [wl]
  );
  const [addW] = useAddToWishlistMutation();
  const [remW] = useRemoveFromWishlistMutation();

  const shippingFee = subtotal >= 100 || subtotal === 0 ? 0 : 0;
  const total = subtotal + shippingFee;

  const toggleWishlist = async (productId) => {
    if (!loggedIn) return;
    try {
      if (wishlistIds.includes(productId)) await remW(productId).unwrap();
      else await addW(productId).unwrap();
    } catch {}
  };

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4  text-backnewswhite dark:text-backnewsdark">
        <h1 className="text-2xl font-bold mb-4">Cart (0 items)</h1>
        <div className="bg-white rounded shadow p-8 text-center dark:bg-marbleblack">
          <p className="mb-6 text-gray-600">Your cart is empty.</p>
          <Link
            to="/decorative-products"
            className="inline-block px-5 py-3 rounded bg-marblewhite dark:text-backnewsdark text-white"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            Cart ({count} {count === 1 ? "item" : "items"})
          </h1>
          <button
            onClick={() => dispatch(clearCart())}
            className="text-red-500 hover:underline flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear cart
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => {
            const inWishlist = wishlistIds.includes(item.id);
            const lineTotal = item.price * item.qty;
            return (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow p-4 flex gap-4"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-28 h-28 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <div className="text-sm text-gray-500 capitalize">
                        {item.category}
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch(removeItem(item.id))}
                      className="text-red-500 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                    {item.dimensions && (
                      <div>
                        <span className="font-medium">Measurements: </span>
                        <span>{item.dimensions}</span>
                      </div>
                    )}
                    {item.weight && (
                      <div>
                        <span className="font-medium">Weight: </span>
                        <span>{item.weight}</span>
                      </div>
                    )}
                    {item.color && (
                      <div className="capitalize">
                        <span className="font-medium">Color: </span>
                        <span>{item.color}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Delivery: </span>
                      <span>6 – 11 business days</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border rounded">
                        <button
                          className="px-2 py-1"
                          onClick={() =>
                            dispatch(
                              updateQty({ id: item.id, qty: item.qty - 1 })
                            )
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            dispatch(
                              updateQty({
                                id: item.id,
                                qty: Number(e.target.value || 1),
                              })
                            )
                          }
                          className="w-12 text-center outline-none p-1"
                        />
                        <button
                          className="px-2 py-1"
                          onClick={() =>
                            dispatch(
                              updateQty({ id: item.id, qty: item.qty + 1 })
                            )
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        className={`rounded p-2 ${
                          inWishlist ? "text-red-500" : "text-gray-400"
                        }`}
                        onClick={() => loggedIn && toggleWishlist(item.id)}
                        title="Wishlist"
                      >
                        {inWishlist ? (
                          <Heart className="w-5 h-5" />
                        ) : (
                          <HeartOff className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-lg font-semibold">
                        {fmtEUR(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-3">We accept</div>
          <div className="flex flex-wrap items-center gap-3">
            <BrandBadge label="PayPal" />
            <BrandBadge label="Mastercard" />
            <BrandBadge label="VISA" />
            <BrandBadge label="Klarna" />
            <BrandBadge label="Apple Pay" />
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <aside className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 sticky top-24">
          <h2 className="text-xl font-semibold mb-4">Order Overview</h2>
          <div className="space-y-3 text-sm">
            <Row label="Subtotal" value={fmtEUR(subtotal)} />
            <Row
              label="Shipping fee"
              value={shippingFee === 0 ? "Free" : fmtEUR(shippingFee)}
            />
            <hr />
            <Row
              label={<span className="font-semibold">Total</span>}
              value={<span className="font-semibold">{fmtEUR(total)}</span>}
            />
            <div className="text-xs text-gray-500 mt-1">(incl. tax)</div>
          </div>

          <Link
            to="/checkout"
            className="mt-5 w-full inline-flex items-center justify-center py-3 rounded bg-marbleblack text-white font-semibold hover:bg-black/90 transition"
          >
            Checkout
          </Link>

          <div className="mt-6 space-y-3 text-sm text-gray-700">
            <Badge
              icon={<ShieldCheck className="w-4 h-4" />}
              text="Secure payment"
            />
            <Badge
              icon={<RotateCcw className="w-4 h-4" />}
              text="15 days return policy"
            />
            <Badge
              icon={<Truck className="w-4 h-4" />}
              text="Convenient & easy delivery"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1 bg-gray-100 rounded">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function BrandBadge({ label }) {
  return (
    <div className="px-3 py-1.5 rounded border bg-white shadow-sm text-xs font-semibold">
      {label}
    </div>
  );
}
