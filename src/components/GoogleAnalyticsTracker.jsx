import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { pageview } from "../lib/ga";
import { isPrerender } from "../utils/isPrerender";

export default function GoogleAnalyticsTracker() {
  const location = useLocation();
  const analyticsAllowed = useSelector((s) => !!s.cookies?.consent?.analytics);

  useEffect(() => {
    if (!analyticsAllowed) return;
    if (isPrerender) return null;
    pageview(location.pathname + location.search);
  }, [location.pathname, location.search, analyticsAllowed]);

  return null;
}
