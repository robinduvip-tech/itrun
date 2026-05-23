import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Providers from "@/pages/Providers";
import History from "@/pages/History";
import Settings from "@/pages/Settings";

function App() {
  useEffect(() => {
    // Default dark mode on mount
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
