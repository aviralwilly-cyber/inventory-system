import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { orderBy } from 'lodash';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/style.css';
// import ParticlesBackground from './ParticlesBackground';
import { Link } from 'react-router-dom';
import { 
  addInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem 
} from '../api/inventoryApi';

const InventoryTable = () => {
  console.log("Component rendered");
  
  // Helper function to safely handle dates
  const formatDate = (timestamp, isMobile = false) => {
    const date = timestamp instanceof Date 
      ? timestamp 
      : timestamp?.toDate?.() 
      ? timestamp.toDate() 
      : new Date(timestamp || Date.now());
    
    return isMobile 
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : date.toLocaleDateString();
  };
  
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    price: '',
    threshold: '10',
    category: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // New states for enhancements
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [history, setHistory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  const categories = [
    { id: 'pops', label: 'Pops' },
    { id: 'alcohol', label: 'Alcohol' },
    { id: 'drinks', label: 'Drinks' },
    { id: 'food', label: 'Food' },
    { id: 'supplies', label: 'Supplies' }
  ];

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Real-time Firestore listener
  useEffect(() => {
    setLoading(true);
    const q = collection(db, 'inventory');
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const itemsList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            // Ensure all fields have default values
            name: data.name || 'Unknown Item',
            quantity: data.quantity || '0', // Keep as string
            price: data.price || 0,
            threshold: data.threshold || 10,
            category: data.category || '',
            timestamp: data.timestamp || new Date(), // Keep original timestamp, helper will handle conversion
            ...data
          };
        });
        setItems(itemsList);
        setLoading(false);
        setError(null);
      },
      (error) => {
        setError("Failed to load inventory");
        setLoading(false);
        console.error('Error fetching items:', error);
        // Set empty array to prevent further errors
        setItems([]);
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Auto-save notification when form has data
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((newItem.name || newItem.category) && !editingId) {
        // Could show a "Draft saved" indicator here if desired
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [newItem, editingId]);

  // Enhanced filtering and sorting
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // Apply search filter with safe null checking
    if (searchTerm) {
      result = result.filter(item => {
        // Safe null checking
        if (!item || !item.name || typeof item.name !== 'string') {
          return false;
        }
        return item.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    // Apply category filter
    if (filterCategory) {
      result = result.filter(item => item.category === filterCategory);
    }
    
    // Apply sorting
    return orderBy(result, [sortField], [sortDirection]);
  }, [items, searchTerm, filterCategory, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchTerm]);

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!newItem.name.trim()) errors.name = 'Name is required';
    if (!newItem.category) errors.category = 'Category is required';
    if (!newItem.quantity.trim()) errors.quantity = 'Quantity is required';
    if (!newItem.price || isNaN(newItem.price)) errors.price = 'Valid price required';
    return errors;
  };

  // Track actions in history
  const trackAction = (type, item, previousState = null) => {
    setHistory(prev => [...prev, { type, item, previousState, timestamp: new Date() }]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      const itemData = {
        name: newItem.name,
        quantity: newItem.quantity.trim(), // Keep as string
        price: parseFloat(newItem.price),
        threshold: parseInt(newItem.threshold),
        category: newItem.category
      };

      if (editingId) {
        const oldItem = items.find(item => item.id === editingId);
        await updateInventoryItem(editingId, itemData);
        trackAction('update', { id: editingId, ...itemData }, oldItem);
        setNotification('Item updated successfully');
        setEditingId(null);
        setShowAddModal(false); // Close modal only when editing
      } else {
        const result = await addInventoryItem(itemData);
        trackAction('add', result);
        setNotification('Item added successfully');
        // Keep modal open when adding new items
      }
      
      // Reset form
      setNewItem({ name: '', quantity: '', price: '', threshold: '10', category: '' });
      setEditingId(null);
      setFormErrors({});
      
      // Auto-hide notification
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification(error.message || 'An error occurred');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle delete with history tracking
  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const deletedItem = items.find(item => item.id === id);
        await deleteInventoryItem(id);
        trackAction('delete', deletedItem);
        setNotification('Item deleted successfully');
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        setNotification(error.message || 'Failed to delete item');
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  // Undo functionality
  const handleUndo = async () => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    try {
      if (lastAction.type === 'add') {
        await deleteInventoryItem(lastAction.item.id);
      } else if (lastAction.type === 'update') {
        await updateInventoryItem(lastAction.item.id, lastAction.previousState);
      } else if (lastAction.type === 'delete') {
        await addInventoryItem(lastAction.item);
      }
      
      setHistory(prev => prev.slice(0, -1));
      setNotification('Action undone');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setNotification('Failed to undo action');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Quantity', 'Price', 'Status', 'Last Updated'];
    const csvContent = [
      headers.join(','),
      ...filteredItems.map(item => [
        `"${item.name}"`,
        `"${item.category}"`,
        item.quantity,
        item.price,
        item.quantity <= item.threshold ? 'Low Stock' : 'In Stock',
        formatDate(item.timestamp)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // FIXED: Safe startEditing function with proper null checks
  const startEditing = (item) => {
    setEditingId(item.id);
    setNewItem({
      name: item.name || '',
      quantity: item.quantity || '',
      price: (item.price || 0).toString(),
      threshold: (item.threshold || 10).toString(),
      category: item.category || ''
    });
    setShowAddModal(true);
  };

  const clearFilters = () => {
    setFilterCategory('');
    setSearchTerm('');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const tableElement = document.querySelector('.table-container');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    return sum + (qty * (item.price || 0));
  }, 0);
  const lowStockItems = items.filter(item => {
    const qty = parseInt(item.quantity) || 0;
    return qty <= (item.threshold || 10);
  }).length;

  // Notification component
  const Notification = ({ message }) => (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50"
    >
      {message}
      <button
        onClick={() => setNotification(null)}
        className="ml-2 text-white hover:text-gray-200"
      >
        ×
      </button>
    </motion.div>
  );

  // Modal component for Add/Edit form
  const FormModal = () => (
    <AnimatePresence>
      {(showAddModal || editingId) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddModal(false);
            setEditingId(null);
            setFormErrors({});
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`bg-white rounded-lg shadow-xl p-6 ${isMobile ? 'w-full max-w-md' : 'w-full max-w-2xl'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                  setFormErrors({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div className={`${isMobile ? '' : 'col-span-2'}`}>
                <label className="block text-base font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="Item Name"
                  className={`form-input w-full text-lg ${formErrors.name ? 'border-red-500' : ''}`}
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                  autoFocus
                  ref={(input) => {
                    // Auto-focus on name field when modal opens
                    if (input && (showAddModal || editingId)) {
                      setTimeout(() => input.focus(), 100);
                    }
                  }}
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="text"
                  placeholder="e.g., 5 or 2 boxes of pop coke"
                  className={`form-input w-full text-lg ${formErrors.quantity ? 'border-red-500' : ''}`}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  required
                />
                {formErrors.quantity && <p className="text-red-500 text-sm mt-1">{formErrors.quantity}</p>}
              </div>
              
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  className={`form-input w-full text-lg ${formErrors.price ? 'border-red-500' : ''}`}
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  required
                />
                {formErrors.price && <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>}
              </div>
              
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Threshold</label>
                <input
                  type="number"
                  placeholder="Low Stock Threshold"
                  className="form-input w-full text-lg"
                  value={newItem.threshold}
                  onChange={(e) => setNewItem({ ...newItem, threshold: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-base font-medium text-gray-700 mb-1">Category</label>
                <select
                  className={`form-input w-full bg-white text-lg ${formErrors.category ? 'border-red-500' : ''}`}
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  required
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
              </div>
              
              <div className={`${isMobile ? '' : 'col-span-2'} flex gap-2 mt-4`}>
                <button type="submit" className="button-primary flex-1">
                  {editingId ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setNewItem({ name: '', quantity: '', price: '', threshold: '10', category: '' });
                    setFormErrors({});
                  }}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* <ParticlesBackground /> */}
      <AnimatePresence>
        {notification && <Notification message={notification} />}
      </AnimatePresence>
      <FormModal />
      
      <div className={`dashboard-container flex relative ${isMobile ? 'pb-20' : ''}`}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-lg shadow-lg lg:hidden"
          >
            <span className="text-2xl">{sidebarOpen ? '✕' : '☰'}</span>
          </button>
        )}

        {/* Error Alert */}
        {error && (
          <div className="fixed top-16 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Sidebar with mobile overlay */}
        <div className={`
          ${isMobile ? 'fixed inset-0 z-40' : 'relative'}
          ${sidebarOpen ? 'block' : 'hidden'}
        `}>
          {/* Mobile overlay backdrop */}
          {isMobile && sidebarOpen && (
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          <div className={`
            bg-white ${isMobile ? 'w-80' : 'w-96'} min-h-screen shadow-lg
            ${isMobile ? 'absolute left-0 top-0 h-full overflow-y-auto' : ''}
          `}>
            <div className="px-6 py-4 border-b">
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-indigo-600`}>
                Front Of House Dashboard
              </h1>
            </div>

            <div className="px-6 py-4">
              <button 
                onClick={() => setStatsOpen(!statsOpen)} 
                className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors w-full"
              >
                <span>Statistics Overview</span>
                <span className="ml-auto">{statsOpen ? '▼' : '▶'}</span>
              </button>
            </div>

            {statsOpen && (
              <div className="px-6 py-4 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <strong>Dashboard Information:</strong> This dashboard is for managing the F.O.H inventory. You can add, edit, and delete items here. 
                    This is not for the B.O.H inventory. If you need to manage the B.O.H inventory, please use the B.O.H dashboard.
                  </p>
                </div>

                <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row justify-between items-stretch gap-8'}`}>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">Total Items</h2>
                    <div className="flex items-center mt-2">
                      <span className="text-2xl mr-2">📦</span>
                      <span className="text-2xl font-bold text-black">{totalItems}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">Total Value</h2>
                    <div className="flex items-center mt-2">
                      <span className="text-2xl mr-2">💰</span>
                      <span className="text-2xl font-bold text-black">${totalValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-bold">Low Stock Items</h2>
                  <div className="flex items-center mt-2">
                    <span className="text-2xl mr-2">⚠️</span>
                    <span className="text-2xl font-bold text-black">{lowStockItems}</span>
                  </div>
                </div>

                {/* Quick Actions - Moved to upper section */}
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={exportToCSV}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    <span className="mr-1">💾</span>
                    <span>Export to CSV</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setEditingId(null);
                      setNewItem({ name: '', quantity: '', price: '', threshold: '10', category: '' });
                      setFormErrors({});
                      setShowAddModal(true);
                    }}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    <span className="mr-1">➕</span>
                    <span>Add More Items</span>
                  </button>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  
                  {history.length > 0 && (
                    <button 
                      onClick={handleUndo}
                      className="flex items-center justify-center px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors w-full text-lg font-medium"
                    >
                      <span className="mr-2 text-xl">↩️</span>
                      <span>Undo Last Action</span>
                    </button>
                  )}
                  
                  <Link 
                    to="/check-list" 
                    className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors w-full text-lg font-medium"
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <span className="mr-2 text-xl">📋</span>
                    <span>Order</span>
                  </Link>
                  
                  <Link 
                    to="/kitchen-binder" 
                    className="flex items-center justify-center px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors w-full text-lg font-medium"
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <span className="mr-2 text-xl">📚</span>
                    <span>Kitchen Binder</span>
                  </Link>
                  
                  <Link 
                    to="/area-51" 
                    className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors w-full text-lg font-medium"
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <span className="mr-2 text-xl">📦</span>
                    <span>FOH Inventory Management</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content flex-1">
          <header className={`navbar ${isMobile ? 'pl-16' : ''}`}>
            <div className="flex items-center justify-between flex-wrap">
              <div className="flex items-center flex-1">
                <div className="ml-4">
                  <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold`}>
                    Manage your inventory items
                  </h2>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Link 
                  to="/check-list" 
                  className={`px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors ${isMobile ? 'mr-2 mt-2' : 'mr-2'} text-lg font-medium`}
                >
                  <span className="mr-2 text-xl">📋</span>
                  <span>{isMobile ? 'Order' : 'Order'}</span>
                </Link>
                
                <Link 
                  to="/kitchen-binder" 
                  className={`px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors ${isMobile ? 'mr-2 mt-2' : 'mr-6'} text-lg font-medium`}
                >
                  <span className="mr-2 text-xl">📚</span>
                  <span>{isMobile ? 'Binder' : 'Kitchen Binder'}</span>
                </Link>
              </div>
            </div>
          </header>

          <main className={`${isMobile ? 'px-4' : 'px-6'}`}>
            
            {/* Filters and Table */}
            <div className="table-container mt-6">
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                  <h3 className="text-lg font-semibold">Inventory Items</h3>
                  <span className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items 
                    {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                  </span>
                </div>
                
                {/* Search bar - Made shorter */}
                <div className="mb-4 max-w-md">
                  <input
                    type="text"
                    placeholder="Search items..."
                    className="form-input w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Filters - Only category filter now */}
                <div className="mb-4 max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                  <select
                    className="form-input w-full bg-white"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Active filters display */}
                {(filterCategory || searchTerm) && (
                  <div className="flex justify-between items-center mb-2 flex-wrap">
                    <div className="flex flex-wrap gap-2">
                      {searchTerm && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs flex items-center">
                          Search: "{searchTerm}"
                          <button 
                            onClick={() => setSearchTerm('')}
                            className="ml-1 text-indigo-600 hover:text-indigo-900"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {filterCategory && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs flex items-center">
                          Category: {categories.find(c => c.id === filterCategory)?.label || filterCategory}
                          <button 
                            onClick={() => setFilterCategory('')}
                            className="ml-1 text-indigo-600 hover:text-indigo-900"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={clearFilters}
                      className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 md:mt-0"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
              
              {/* Loading state */}
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {/* Table */}
              {!loading && (
                <div className="bg-white rounded-lg shadow-sm">
                  {isMobile && (
                    <div className="text-center text-sm text-gray-600 py-2 bg-gray-50">
                      <span>👉 Swipe left to see all columns 👈</span>
                    </div>
                  )}
                  <div className={`${isMobile ? 'overflow-x-auto pb-4' : ''} max-h-96 overflow-y-auto`} style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="inventory-table w-full" style={{ minWidth: isMobile ? '700px' : 'auto' }}>
                      <thead className="sticky top-0 bg-white">
                        <tr>
                          <th 
                            className={`cursor-pointer ${isMobile ? 'sticky left-0 bg-gray-50 z-10 p-4' : ''}`}
                            onClick={() => handleSort('name')}
                          >
                            Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="cursor-pointer p-4"
                            onClick={() => handleSort('category')}
                          >
                            Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="cursor-pointer p-4"
                            onClick={() => handleSort('quantity')}
                          >
                            Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="p-4">Status</th>
                          <th 
                            className="cursor-pointer p-4"
                            onClick={() => handleSort('timestamp')}
                          >
                            Updated {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="text-center p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {currentItems.length > 0 ? (
                            currentItems.map((item) => {
                              // Extract numeric value from quantity string for comparison
                              const quantityNum = parseInt(item.quantity) || 0;
                              const isLowStock = quantityNum <= (item.threshold || 10);
                              return (
                                <motion.tr
                                  key={item.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <td className={isMobile ? 'sticky left-0 bg-white z-10 p-4' : 'p-4'}>
                                    <div>
                                      <div className="font-medium">{item.name || 'Unknown Item'}</div>
                                      <div className="text-sm text-gray-500">${parseFloat(item.price || 0).toFixed(2)}</div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    {item.category ? (
                                      <span 
                                        className="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium capitalize cursor-pointer hover:bg-gray-200 inline-block"
                                        onClick={() => setFilterCategory(item.category)}
                                        title="Filter by this category"
                                      >
                                        {item.category}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <div className="text-sm">
                                      <div className="font-medium">{item.quantity || '0'}</div>
                                      <div className="text-gray-500">Min: {item.threshold || 10}</div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                      isLowStock 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : 'bg-green-100 text-green-700 border border-green-200'
                                    } ${isMobile ? 'text-xs' : ''}`}>
                                      {isLowStock ? 'Low' : 'OK'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm">
                                      {formatDate(item.timestamp, isMobile)}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-1 justify-center">
                                      <button
                                        onClick={() => startEditing(item)}
                                        className={`action-button text-blue-600 hover:bg-blue-50 rounded-lg ${isMobile ? 'p-3' : 'p-2'}`}
                                        title="Edit Item"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className={`action-button text-red-600 hover:bg-red-50 rounded-lg ${isMobile ? 'p-3' : 'p-2'}`}
                                        title="Delete Item"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="6" className="text-center py-4 text-gray-500">
                                {searchTerm || filterCategory 
                                  ? 'No items match your current filters' 
                                  : 'No items found'
                                }
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center px-4 py-3 bg-gray-50 border-t">
                      <div className="flex items-center justify-center space-x-2 w-full">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <span className="ml-4 text-sm text-gray-600">
                          {itemsPerPage} items per page
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="overflow-x-auto">
            <div className="flex flex-nowrap p-2 gap-2" style={{ minWidth: 'max-content' }}>
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center px-4 py-2 bg-indigo-100 rounded-lg min-w-[80px]"
              >
                <span className="text-2xl mb-1">📊</span>
                <span className="text-xs">Stats</span>
              </button>
              
              <button
                onClick={() => {
                  setEditingId(null);
                  setNewItem({ name: '', quantity: '', price: '', threshold: '10', category: '' });
                  setFormErrors({});
                  setShowAddModal(true);
                }}
                className="flex flex-col items-center px-4 py-2 bg-green-100 rounded-lg min-w-[80px]"
              >
                <span className="text-2xl mb-1">➕</span>
                <span className="text-xs">Add Item</span>
              </button>
              
              <Link 
                to="/check-list" 
                className="flex flex-col items-center px-4 py-2 bg-yellow-100 rounded-lg min-w-[80px]"
              >
                <span className="text-2xl mb-1">📋</span>
                <span className="text-xs">Order</span>
              </Link>
              
              <button
                onClick={() => {
                  const element = document.querySelector('.table-container');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex flex-col items-center px-4 py-2 bg-blue-100 rounded-lg min-w-[80px]"
              >
                <span className="text-2xl mb-1">📦</span>
                <span className="text-xs">Inventory</span>
              </button>
              
              <button
                onClick={clearFilters}
                className={`flex flex-col items-center px-4 py-2 ${(filterCategory || searchTerm) ? 'bg-red-100' : 'bg-gray-100'} rounded-lg min-w-[80px]`}
              >
                <span className="text-2xl mb-1">🔍</span>
                <span className="text-xs">Clear Filter</span>
              </button>
              
              <button
                onClick={handleRefresh}
                className="flex flex-col items-center px-4 py-2 bg-purple-100 rounded-lg min-w-[80px]"
                disabled={isRefreshing}
              >
                <span className="text-2xl mb-1">🔄</span>
                <span className="text-xs">{isRefreshing ? 'Loading...' : 'Refresh'}</span>
              </button>
              
              <button
                onClick={() => {
                  alert(`Total Items: ${totalItems}\nTotal Value: ${totalValue.toFixed(2)}\nLow Stock: ${lowStockItems}`);
                }}
                className="flex flex-col items-center px-4 py-2 bg-orange-100 rounded-lg min-w-[80px]"
              >
                <span className="text-2xl mb-1">💰</span>
                <span className="text-xs">Summary</span>
              </button>
              
              {history.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="flex flex-col items-center px-4 py-2 bg-pink-100 rounded-lg min-w-[80px]"
                >
                  <span className="text-2xl mb-1">↩️</span>
                  <span className="text-xs">Undo</span>
                </button>
              )}
              
              <button
                onClick={exportToCSV}
                className="flex flex-col items-center px-4 py-2 bg-teal-100 rounded-lg min-w-[80px]"
              >
                <span className="text-2xl mb-1">💾</span>
                <span className="text-xs">Export</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable;