import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import FOH from './components/FOH';
import InventoryTable from './components/InventoryTable';
import CheckList from './components/CheckList';
import Area51 from './components/Area51'; // Fixed import
import Area51ProtectedRoute from './components/Area51ProtectedRoute';
import './styles/style.css'; // Import your global styles

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
        <Route 
          path="/area-51-inventory" 
          element={
            <Area51ProtectedRoute>
              <Area51 />
            </Area51ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;