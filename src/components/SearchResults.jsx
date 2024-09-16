import React from "react";

const SearchResults = ({ searchResults, onSelectItem }) => {
  return (
    <div className="search-results">
      <ul>
        {searchResults.map((item, index) => (
          <li key={index} onClick={() => onSelectItem(item)}>
            <strong>{item.UN}</strong> - {item.PSN}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchResults;
