import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from './ParticlesBackground';
import '../styles/style.css';

const Area51 = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updateAnimation, setUpdateAnimation] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchInventory();
  }, []);

  // FIXED: Safe filtering with proper null checking
  // Separate effect to reset pagination only when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    try {
      const filtered = inventory.filter(item => {
        // Check if item and item.name exist before using toLowerCase
        if (!item || !item.name || typeof item.name !== 'string') {
          return false; // Skip items without valid names
        }
        return item.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredInventory(filtered);
    } catch (error) {
      console.error('Error filtering inventory:', error);
      setFilteredInventory(inventory); // Show all items if filtering fails
    }
  }, [searchTerm, inventory]);

  const fetchInventory = async () => {
    try {
      setError(null); // Clear any previous errors
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          // Ensure required fields have default values
          name: data.name || 'Unknown Item',
          category: data.category || '',
          price: data.price || 0,
          quantity: data.quantity || 0,
          threshold: data.threshold || 10,
          ...data
        };
      });
      setInventory(items);
      setFilteredInventory(items);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory. Please check your connection.');
      setLoading(false);
      // Set empty arrays to prevent further errors
      setInventory([]);
      setFilteredInventory([]);
    }
  };

  const updateQuantity = async (itemId, change) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = Math.max(0, (item.quantity || 0) + change);
    
    try {
      await updateDoc(doc(db, 'inventory', itemId), {
        quantity: newQuantity,
        timestamp: Timestamp.now()
      });

      setInventory(prev => 
        prev.map(i => 
          i.id === itemId ? { ...i, quantity: newQuantity } : i
        )
      );

      // Trigger animation
      setUpdateAnimation({ [itemId]: change > 0 ? 'increase' : 'decrease' });
      setTimeout(() => setUpdateAnimation({}), 300);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Failed to update quantity. Please try again.');
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('area51Auth');
      navigate('/foh');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force navigation even if sessionStorage fails
      window.location.href = '/foh';
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-red-50 to-red-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Connection Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={fetchInventory}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
        <ParticlesBackground />
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Area 51...</h2>
          <p className="text-gray-500 mt-2">Accessing restricted inventory data</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ParticlesBackground />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6">
        {/* Error Alert */}
        {error && (
          <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-6 border border-purple-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-3xl">🚀</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Area 51
                  </h1>
                  <p className="text-gray-600 text-sm">Restricted Access Zone</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Link
                  to="/inventory"
                  className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
                >
                  <span className="text-lg">📊</span>
                  <span>Main Dashboard</span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity"></div>
                </Link>
                
                <Link
                  to="/check-list"
                  className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
                >
                  <span className="text-lg">📋</span>
                  <span>Check List</span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity"></div>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
                >
                  <span className="text-lg">🔒</span>
                  <span>Logout</span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity"></div>
                </button>
              </div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 mb-4 border border-purple-100">
              <p className="text-gray-700 mb-4 font-medium">Quick adjust inventory quantities with precision controls</p>
              
              {/* Search and Items Per Page */}
              <div className="flex justify-between items-center gap-4">
                <div className="max-w-md flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="form-input w-full pl-10 rounded-lg border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 rounded-lg px-4 py-2 border border-purple-200">
                  <label className="text-sm text-gray-700 font-medium whitespace-nowrap">Items per page:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="form-input bg-white border-purple-200 focus:border-purple-500 focus:ring-purple-500 rounded-lg text-sm min-w-[70px]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-3 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-purple-600">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-purple-600">{Math.min(indexOfLastItem, filteredInventory.length)}</span> of <span className="font-semibold text-purple-600">{filteredInventory.length}</span> items
                </p>
                {searchTerm && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      🔍 "{searchTerm}"
                    </span>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="inventory-table w-full">
                <thead className="sticky top-0 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
                  <tr>
                    <th className="text-left font-semibold text-gray-700 p-4">Item Name</th>
                    <th className="text-left font-semibold text-gray-700 p-4">Category</th>
                    <th className="text-center font-semibold text-gray-700 p-4">Quantity</th>
                    <th className="text-center font-semibold text-gray-700 p-4">Status</th>
                    <th className="text-center font-semibold text-gray-700 p-4">Quick Adjust</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {currentItems.length > 0 ? (
                      currentItems.map((item) => {
                        const isLowStock = (item.quantity || 0) <= (item.threshold || 10);
                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200 border-b border-gray-100"
                          >
                            <td className="p-4">
                              <div>
                                <div className="font-medium">{item.name || 'Unknown Item'}</div>
                                <div className="text-sm text-gray-500">${parseFloat(item.price || 0).toFixed(2)}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              {item.category ? (
                                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-xs font-semibold capitalize border border-purple-200">
                                  {item.category}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-medium">—</span>
                              )}
                            </td>
                            <td className="text-center p-4">
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={item.quantity}
                                  initial={{ scale: 1 }}
                                  animate={{ 
                                    scale: updateAnimation[item.id] ? 1.2 : 1,
                                    color: updateAnimation[item.id] === 'increase' ? '#10b981' : 
                                           updateAnimation[item.id] === 'decrease' ? '#ef4444' : '#000000'
                                  }}
                                  transition={{ duration: 0.3 }}
                                  className="text-sm"
                                >
                                  <div className="font-medium">{item.quantity || 0}</div>
                                  <div className="text-gray-500">/{item.threshold || 10}</div>
                                </motion.div>
                              </AnimatePresence>
                            </td>
                            <td className="text-center p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                isLowStock 
                                  ? 'bg-red-100 text-red-700 border border-red-200' 
                                  : 'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                {isLowStock ? 'Low' : 'OK'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1 justify-center flex-wrap">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateQuantity(item.id, -5)}
                                  className="group relative px-3 py-2 text-xs bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold min-w-[45px]"
                                >
                                  <span className="relative z-10">-5</span>
                                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-lg transition-opacity"></div>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="group relative px-3 py-2 text-xs bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold min-w-[45px]"
                                >
                                  <span className="relative z-10">-1</span>
                                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-lg transition-opacity"></div>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="group relative px-3 py-2 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold min-w-[45px]"
                                >
                                  <span className="relative z-10">+1</span>
                                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-lg transition-opacity"></div>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateQuantity(item.id, 5)}
                                  className="group relative px-3 py-2 text-xs bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold min-w-[45px]"
                                >
                                  <span className="relative z-10">+5</span>
                                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-lg transition-opacity"></div>
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-2xl">🔍</span>
                            </div>
                            <div className="text-gray-500">
                              <p className="font-medium">No items found</p>
                              {searchTerm && <p className="text-sm">Try adjusting your search: "{searchTerm}"</p>}
                            </div>
                            {searchTerm && (
                              <button
                                onClick={() => setSearchTerm('')}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 text-sm font-medium"
                              >
                                Clear Search
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-t border-purple-100">
                <div className="flex items-center justify-center space-x-3 w-full">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className={`group relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                        : 'text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>←</span>
                      <span>Previous</span>
                    </span>
                    {currentPage !== 1 && (
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
                    )}
                  </button>
                  
                  {getPageNumbers().map((number, index) => (
                    <React.Fragment key={index}>
                      {number === '...' ? (
                        <span className="px-3 py-1 text-gray-500 font-medium">...</span>
                      ) : (
                        <button
                          onClick={() => paginate(number)}
                          className={`group relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 min-w-[40px] ${
                            currentPage === number
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                              : 'text-gray-700 hover:text-white bg-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-500 border border-purple-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5'
                          }`}
                        >
                          <span className="relative z-10">{number}</span>
                          {currentPage !== number && (
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"></div>
                          )}
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`group relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                        : 'text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>Next</span>
                      <span>→</span>
                    </span>
                    {currentPage !== totalPages && (
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
                    )}
                  </button>

                  <div className="ml-6 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg border border-purple-200">
                    <span className="text-sm text-gray-700 font-medium">
                      <span className="text-purple-600">{itemsPerPage}</span> items per page
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Area51;