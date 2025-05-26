import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import FOH from './components/FOH';
import InventoryTable from './components/InventoryTable';
import CheckList from './components/CheckList';

function App() {
  useEffect(() => {
    // Check user's preferred color scheme
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/foh" element={<FOH />} />
        <Route path="/inventory" element={<InventoryTable />} />
        <Route path="/check-list" element={<CheckList />} />
      </Routes>
    </Router>
  );
}

export default App;