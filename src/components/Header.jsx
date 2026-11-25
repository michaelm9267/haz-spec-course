import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import SearchResults from "./SearchResults";
import { REGULATIONS, useRegulation } from "../regulations/RegulationContext";
import "../Styles/header.css";

const MAX_RESULTS = 20;

const search = (items, rawQuery) => {
  const query = rawQuery.toLowerCase().trim().replace(/\s+/g, " ");
  if (!query) return [];
  const starts = [];
  const contains = [];
  for (const item of items) {
    const un = item.un.toLowerCase();
    const psn = item.name.toLowerCase();
    if (un.startsWith(query) || un.replace(/^(un|na|id)/, "").startsWith(query) || psn.startsWith(query)) {
      starts.push(item);
    } else if (un.includes(query) || psn.includes(query)) {
      contains.push(item);
    }
  }
  // Prefix matches are more likely what the user wants, so rank them first.
  return [...starts, ...contains].slice(0, MAX_RESULTS);
};

const RegulationSwitch = () => {
  const { key, switchTo } = useRegulation();
  return (
    <div className="reg-switch" role="radiogroup" aria-label="Regulation">
      {Object.values(REGULATIONS).map((r) => (
        <button
          key={r.key}
          role="radio"
          aria-checked={r.key === key}
          className={r.key === key ? "active" : undefined}
          onClick={() => switchTo(r.key)}
          title={r.description}
        >
          {r.name}
        </button>
      ))}
    </div>
  );
};

const Header = () => {
  const { key, config, data } = useRegulation();
  const items = data?.items;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const results = useMemo(() => (items ? search(items, query) : []), [items, query]);

  // Close the dropdown when clicking anywhere outside the search box.
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectItem = (item) => {
    navigate(`/${key}/item/${item.id}`);
    setOpen(false);
    setQuery("");
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setHighlighted(0);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectItem(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showResults = open && query.trim() !== "";

  return (
    <header className="header">
      <NavLink to={`/${key}`} className="brand">
        Haz<span>Ref</span>
      </NavLink>
      <RegulationSwitch />
      <div className="search-bar" ref={containerRef}>
        <input
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          type="search"
          placeholder={`Search ${config.name} by UN number or shipping name`}
          aria-label="Search hazardous materials"
          aria-expanded={showResults}
          aria-controls="search-results"
          role="combobox"
          aria-autocomplete="list"
        />
        {showResults && (
          <SearchResults
            results={results}
            highlighted={highlighted}
            onHighlight={setHighlighted}
            onSelect={selectItem}
          />
        )}
      </div>
      <nav>
        <ul>
          <li>
            <NavLink to={`/${key}`} end>
              Tables
            </NavLink>
          </li>
          <li>
            <NavLink to="/compatibility">Compatibility</NavLink>
          </li>
          <li>
            <NavLink to="/declaration">Shipper's Dec</NavLink>
          </li>
          <li>
            <NavLink to="/dodaac">DoDAAC</NavLink>
          </li>
          <li>
            <NavLink to="/calculators">Calculators</NavLink>
          </li>
          <li>
            <NavLink to="/course">Course</NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
