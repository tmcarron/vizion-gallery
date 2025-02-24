import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import VizionaryPage from "./pages/VizionaryPage";
import { MusicProvider } from "./Player/MusicContext";
import DataFetching from "./DataFetching";

const App = () => {
  return (
    <MusicProvider>
      <DataFetching />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/vizionaryportal" element={<VizionaryPage />} />
        </Routes>
      </Router>
    </MusicProvider>
  );
};
export default App;
