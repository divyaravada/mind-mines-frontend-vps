// src/components/ProductSearch.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import http from "../services/http"; // axios instance

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function ProductSearch({ t }) {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q.trim(), 300);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // [{id, title_en, title_de, image}]
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  // fetch suggestions
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!dq) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        // DRF SearchFilter: ?search=<q>
        const { data } = await http.get("products/", {
          params: { search: dq, page_size: 6 },
        });
        if (!cancel) {
          setResults(Array.isArray(data?.results) ? data.results : data);
          setOpen(true);
          setActiveIdx(-1);
        }
      } catch (e) {
        if (!cancel) setResults([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [dq]);

  // click outside to close
  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goToResult = useCallback(
    (item) => {
      if (!item) return;
      setOpen(false);
      setQ("");
      // match your backend route
      navigate(`/decorative-products/${item.id}/${item.slug}`);
    },
    [navigate],
  );

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) {
        goToResult(results[activeIdx]);
      } else if (results[0]) {
        goToResult(results[0]);
      }
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={onKeyDown}
        className="rounded px-3 py-1 pl-8 w-40 md:w-64 bg-gray-100 dark:bg-gray-800
            text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none"
        placeholder={t("navbar.searchPlaceholder")}
        aria-label={t("navbar.searchPlaceholder")}
      />
      <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
      {!!q && (
        <button
          aria-label={t("common.clear")}
          className="absolute right-2 top-1.5"
          onClick={() => {
            setQ("");
            setResults([]);
            setOpen(false);
          }}
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}

      {open && (q || loading) && (
        <div className="absolute mt-1 w-[18rem] md:w-[22rem] z-50 rounded border border-gray-200 dark:border-gray-700 shadow-lg bg-marblewhite dark:bg-marbleblack text-gray-900 dark:text-gray-100">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              {t("common.searching")}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              {t("common.noResults")}
            </div>
          ) : (
            <ul role="listbox" className="max-h-80 overflow-auto">
              {results.map((p, idx) => (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={idx === activeIdx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(-1)}
                  onClick={() => goToResult(p)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                    idx === activeIdx ? "bg-gray-100 dark:bg-gray-800" : ""
                  }`}
                >
                  {/* optional thumbnail if your serializer returns it */}
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      className="w-8 h-8 object-cover rounded"
                      fetchPriority="high"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.title_en || p.title_de || p.title || `#${p.id}`}
                    </div>
                    {/* optionally show price or category */}
                    {p.price != null && (
                      <div className="text-xs text-gray-500">
                        €{Number(p.price).toFixed(2)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {/* View all link (optional) */}
          {results.length > 0 && (
            <button
              className="w-full text-left px-3 py-2 text-xs text-gray-600 border-t hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                navigate(`/search?query=${encodeURIComponent(q)}`);
              }}
            >
              {t("common.viewAllResults")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
