import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import hazData from "./data-file/item-table.json";
import Layout from "./layout/Layout";
import HazardInfo from "./components/HazardInfo.jsx";
import HazTables from "./components/HazTables.jsx";
import Course from "./components/Course.jsx";

function App() {
  const [searchedData, setSearchedData] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  console.log(selectedItem);
  return (
    <div className="App">
    <Router>
      <Layout hazData={hazData} setSearchResults={setSearchResults} searchResults={searchResults} selectedItem={selectedItem} setSelectedItem={setSelectedItem} >
        <Routes>
          <Route path="/" element={!selectedItem && <HazTables hazData={hazData} setSelectedItem={setSelectedItem}/>} />
          <Route path="/course" element={!selectedItem && <Course />} />
        </Routes>
          {selectedItem && <HazardInfo item={searchedData} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />}
  
      </Layout>
    </Router>
    </div>
  );
}

export default App;

