import { HashRouter as Router, Navigate, Route, Routes, useParams } from "react-router-dom";
import { REGULATIONS, RegulationProvider, useRegulation } from "./regulations/RegulationContext";
import Layout from "./layout/Layout";
import HazardInfo from "./components/HazardInfo.jsx";
import HazTables from "./components/HazTables.jsx";
import Course from "./components/Course.jsx";
import Calculators from "./components/Calculators.jsx";
import Compatibility from "./components/Compatibility.jsx";
import ShippersDeclaration from "./components/ShippersDeclaration.jsx";
import DodaacLookup from "./components/DodaacLookup.jsx";
import NotFound from "./components/NotFound.jsx";

/** "/" goes to the tables for the last-used regulation. */
const Home = () => {
  const { key } = useRegulation();
  return <Navigate to={`/${key}`} replace />;
};

/** Renders the page once the regulation in the URL is valid and its data has loaded. */
const RegulationPage = ({ children }) => {
  const { reg } = useParams();
  const { data, error } = useRegulation();
  if (!REGULATIONS[reg]) return <NotFound />;
  if (error) return <p className="status">Couldn't load the {REGULATIONS[reg].name} data. Try reloading the page.</p>;
  if (!data) return <p className="status">Loading {REGULATIONS[reg].name}…</p>;
  return children;
};

// HashRouter is used so deep links and page refreshes work on GitHub Pages,
// which has no server-side fallback to index.html.
function App() {
  return (
    <Router>
      <RegulationProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/course" element={<Course />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/compatibility" element={<Compatibility />} />
            <Route path="/declaration" element={<ShippersDeclaration />} />
            <Route path="/dodaac" element={<DodaacLookup />} />
            <Route path="/:reg" element={<RegulationPage><HazTables /></RegulationPage>} />
            <Route path="/:reg/item/:id" element={<RegulationPage><HazardInfo /></RegulationPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </RegulationProvider>
    </Router>
  );
}

export default App;
