import React from "react";

const SearchResults = ({ results, highlighted, onHighlight, onSelect }) => (
  <ul className="search-results" id="search-results" role="listbox">
    {results.length === 0 && <li className="no-results">No matches found</li>}
    {results.map((item, index) => (
      <li
        key={item.id}
        role="option"
        aria-selected={index === highlighted}
        className={index === highlighted ? "highlighted" : undefined}
        onMouseEnter={() => onHighlight(index)}
        // mousedown fires before the input loses focus, so the click always registers
        onMouseDown={(e) => {
          e.preventDefault();
          onSelect(item);
        }}
      >
        <strong>{item.un || "—"}</strong>
        <span>{item.name}</span>
      </li>
    ))}
  </ul>
);

export default SearchResults;
