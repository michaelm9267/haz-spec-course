import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import afman from "./afman";
import cfr from "./cfr";
import { findEquivalent } from "../utils/hazard";

export const REGULATIONS = { afman, cfr };
export const DEFAULT_REGULATION = "afman";
const STORAGE_KEY = "hazref.regulation";

// One load per regulation for the life of the page; switching back is instant.
const cache = {};
export const loadRegulation = (key) => (cache[key] ||= REGULATIONS[key].load());

const readPreference = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return REGULATIONS[saved] ? saved : DEFAULT_REGULATION;
  } catch {
    return DEFAULT_REGULATION;
  }
};

const writePreference = (key) => {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // storage unavailable (private mode etc.) — the URL still carries the choice
  }
};

const RegulationContext = createContext(null);

/**
 * The active regulation comes from the first URL segment (/afman/..., /cfr/...).
 * On pages without one (e.g. /course) the last-used regulation is kept.
 */
export const RegulationProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[1];
  const urlRegulation = REGULATIONS[segment] ? segment : null;

  const [preferred, setPreferred] = useState(readPreference);
  const [loaded, setLoaded] = useState({});
  const [error, setError] = useState(null);
  const key = urlRegulation || preferred;

  useEffect(() => {
    if (urlRegulation && urlRegulation !== preferred) {
      setPreferred(urlRegulation);
      writePreference(urlRegulation);
    }
  }, [urlRegulation, preferred]);

  useEffect(() => {
    let active = true;
    setError(null);
    loadRegulation(key)
      .then((data) => active && setLoaded((prev) => ({ ...prev, [key]: data })))
      .catch((err) => active && setError(err));
    return () => {
      active = false;
    };
  }, [key]);

  const data = loaded[key];

  /** Switch regulation, keeping the user on the equivalent page where possible. */
  const switchTo = useCallback(
    async (next) => {
      if (next === key) return;
      setPreferred(next);
      writePreference(next);
      if (!urlRegulation) return; // e.g. on /course: nothing to re-route

      const itemMatch = location.pathname.match(/^\/[^/]+\/item\/(\d+)/);
      if (itemMatch) {
        const current = data?.items[Number(itemMatch[1])];
        const nextData = await loadRegulation(next);
        const match = current && findEquivalent(current, nextData.items);
        if (match) {
          navigate(`/${next}/item/${match.id}`);
        } else {
          const q = current ? current.un || current.name : "";
          navigate(`/${next}?${new URLSearchParams({ q, nomatch: "1" })}`);
        }
        return;
      }

      const params = new URLSearchParams(location.search);
      params.delete("page");
      params.delete("nomatch");
      const query = params.toString();
      navigate(`/${next}${query ? `?${query}` : ""}`);
    },
    [key, urlRegulation, location, data, navigate]
  );

  return (
    <RegulationContext.Provider value={{ key, config: REGULATIONS[key], data, error, switchTo }}>
      {children}
    </RegulationContext.Provider>
  );
};

export const useRegulation = () => useContext(RegulationContext);
