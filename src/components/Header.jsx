import React, { useState } from "react";
import SearchResults from "./SearchResults";
import "../Styles/header.css"; 

const Header = ({ hazData, selectedItem, setSelectedItem }) => {
  const [searchResults, setSearchResults] = useState([]);
  

  const handleSearch = (e) => {
    const searchValue = e.target.value.toLowerCase().trim();

    if (searchValue === "") {
      // If the search bar is empty, clear the search results
      setSearchResults([]);
      setSelectedItem(null);
      return;
    }

    if (hazData && hazData.HazData) {
      const filteredData = hazData.HazData.filter((item) => {
        if (item) {
          const unNumber = item.UN ? item.UN.toLowerCase() : "";
          const psn = item.PSN ? item.PSN.toLowerCase() : "";

          return unNumber.includes(searchValue) || psn.includes(searchValue);
        }
        return false;
      }).slice(0, 20); // Limit to first 20 results

      setSearchResults(filteredData);
      setSelectedItem(null);
    } else {
      console.error("hazData.HazData is undefined");
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchResults([]); 
  };


  return (
    <header className="header">
      <h1>AFMAN 26-604</h1>
      <div className="search-bar">
  <div className="input-container">
    <input
      onChange={handleSearch}
      type="search"
      placeholder="UN Number or PSN"
    />
    {searchResults.length > 0 && (
      <SearchResults searchResults={searchResults} onSelectItem={handleSelectItem} />
    )}
  </div>
</div>
      <nav>
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/course">Course</a>
          </li>
          <li>
            <a href="/contact">Contact</a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
