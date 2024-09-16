import React from "react";
import Header from "../components/Header";

const Layout = ({
  children,
  hazData,
  searchResults,
  setSearchResults,
  selectedItem,
  setSelectedItem,
}) => {
  return (
    <div>
      <Header
        hazData={hazData}
        setSearchResults={setSearchResults}
        searchResults={searchResults}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
      {children}
    </div>
  );
};

export default Layout;
