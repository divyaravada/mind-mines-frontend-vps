import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { pageview } from "../lib/ga";

export default function GoogleAnalyticsTracker() {
  const isPrerender = process.env.REACT_APP_PRERENDER === "true";

  const location = useLocation();
  const analyticsAllowed = useSelector((s) => !!s.cookies?.consent?.analytics);

  useEffect(() => {
    if (!analyticsAllowed) return;
    if (isPrerender) return null;
    pageview(location.pathname + location.search);
  }, [location.pathname, location.search, analyticsAllowed]);

  return null;
}
