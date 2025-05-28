import React, { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import '../styles/style.css';
import ParticlesBackground from './ParticlesBackground';
import { Link } from 'react-router-dom';

const InventoryTable = () => {
  console.log("Component rendered");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    price: '',
    threshold: '10',
    category: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false for mobile by default
  const [statsOpen, setStatsOpen] = useState(false); // Changed to false so menu is collapsed by default
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // Refs for date inputs
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

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
      // Open sidebar by default on desktop
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    console.log("Current items:", items);
    const fetchItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        const itemsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));
        setItems(itemsList.sort((a, b) => b.timestamp - a.timestamp));
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesDateRange = dateFilter.startDate || dateFilter.endDate ? 
      (!dateFilter.startDate || new Date(item.timestamp) >= new Date(dateFilter.startDate)) &&
      (!dateFilter.endDate || new Date(item.timestamp) <= new Date(dateFilter.endDate)) 
      : true;
    
    return matchesCategory && matchesDateRange;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, dateFilter]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of table when page changes
    const tableElement = document.querySelector('.table-container');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const clearFilters = () => {
    setFilterCategory('');
    setDateFilter({
      startDate: '',
      endDate: ''
    });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity || !newItem.price || !newItem.category) {
      alert("Please fill in all required fields including category");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'inventory'), {
        name: newItem.name,
        quantity: parseInt(newItem.quantity),
        price: parseFloat(newItem.price),
        threshold: parseInt(newItem.threshold),
        category: newItem.category,
        timestamp: new Date()
      });

      const newItemWithId = {
        id: docRef.id,
        ...newItem,
        quantity: parseInt(newItem.quantity),
        price: parseFloat(newItem.price),
        threshold: parseInt(newItem.threshold),
        timestamp: new Date()
      };

      setItems([newItemWithId, ...items]);
      setNewItem({ name: '', quantity: '', price: '', threshold: '10', category: '' });
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleUpdateItem = async (id) => {
    if (!newItem.category) {
      alert("Please select a category");
      return;
    }
    
    try {
      const itemRef = doc(db, 'inventory', id);
      const updateData = {
        name: newItem.name,
        quantity: parseInt(newItem.quantity),
        price: parseFloat(newItem.price),
        threshold: parseInt(newItem.threshold),
        category: newItem.category,
        timestamp: new Date()
      };
      
      await updateDoc(itemRef, updateData);
      setItems(items.map(item => item.id === id ? { ...item, ...updateData } : item));
      setNewItem({ name: '', quantity: '', price: '', threshold: '10', category: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
        setItems(items.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const itemsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      }));
      setItems(itemsList.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error refreshing items:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setNewItem({
      name: item.name,
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      threshold: (item.threshold || 10).toString(),
      category: item.category || ''
    });
  };

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const lowStockItems = items.filter(item => item.quantity <= (item.threshold || 10)).length;

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
      <ParticlesBackground />
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
                {/* Moved description here */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <strong>Dashboard Information:</strong> This dashboard is for managing the F.O.H inventory. You can add, edit, and delete items here. 
                    This is not for the B.O.H inventory. If you need to manage the B.O.H inventory, please use the B.O.H dashboard. 
                    This is a work in progress and will be updated soon. If you have any questions, please contact the developer. 
                    Thank you for using the F.O.H dashboard. - The Developer XO.
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
                
                <div>
                  {filterCategory && (
                    <button 
                      onClick={() => setFilterCategory('')}
                      className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Clear category filter
                    </button>
                  )}
                </div>
                
                <div className="mt-6">
                  <Link 
                    to="/check-list" 
                    className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors w-full"
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <span className="mr-2">📋</span>
                    <span>View Check List</span>
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
                  <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>
                    Manage your inventory items
                  </h2>
                  {/* Removed the description from here */}
                </div>
              </div>
              
              <Link 
                to="/check-list" 
                className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors ${isMobile ? 'mr-2 mt-2' : 'mr-6'}`}
              >
                <span className="mr-2">📋</span>
                <span>{isMobile ? 'List' : 'Check List'}</span>
              </Link>
            </div>
          </header>

          <main className={`${isMobile ? 'px-4' : 'px-6'}`}>
            {/* Add/Edit Form */}
            <div className={`form-container bg-white rounded-lg shadow-sm p-6 ${isMobile ? 'mr-0' : 'mr-6'}`}>
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                editingId ? handleUpdateItem(editingId) : handleAddItem(e);
              }} className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-6'} gap-4`}>
                <div className={`${isMobile ? '' : 'md:col-span-2'}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    placeholder="Item Name"
                    className="form-input w-full"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    placeholder="Quantity"
                    className="form-input w-full"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    className="form-input w-full"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
                  <input
                    type="number"
                    placeholder="Low Stock Threshold"
                    className="form-input w-full"
                    value={newItem.threshold}
                    onChange={(e) => setNewItem({ ...newItem, threshold: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="form-input w-full bg-white"
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
                </div>
                
                <div className={`flex gap-2 ${isMobile ? 'col-span-1' : ''}`}>
                  <button type="submit" className="button-primary flex-1">
                    {editingId ? 'Update Item' : 'Add Item'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setNewItem({ name: '', quantity: '', price: '', threshold: '10', category: '' });
                      }}
                      className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
            
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
                
                {/* Filters */}
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4 mb-4`}>
                  <div>
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      ref={startDateRef}
                      type="date"
                      className="form-input w-full bg-white"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      ref={endDateRef}
                      type="date"
                      className="form-input w-full"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Active filters display */}
                {(filterCategory || dateFilter.startDate || dateFilter.endDate) && (
                  <div className="flex justify-between items-center mb-2 flex-wrap">
                    <div className="flex flex-wrap gap-2">
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
                      {dateFilter.startDate && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs flex items-center">
                          From: {formatDate(dateFilter.startDate)}
                          <button 
                            onClick={() => setDateFilter({...dateFilter, startDate: ''})}
                            className="ml-1 text-indigo-600 hover:text-indigo-900"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {dateFilter.endDate && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs flex items-center">
                          To: {formatDate(dateFilter.endDate)}
                          <button 
                            onClick={() => setDateFilter({...dateFilter, endDate: ''})}
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
              
              {/* Table - Make it scrollable on mobile */}
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
                        <th className={isMobile ? 'sticky left-0 bg-gray-50 z-10' : ''}>Name</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length > 0 ? (
                        currentItems.map((item) => {
                          const isLowStock = item.quantity <= (item.threshold || 10);
                          return (
                            <tr key={item.id}>
                              <td className={isMobile ? 'sticky left-0 bg-white z-10' : ''}>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-gray-500">${parseFloat(item.price).toFixed(2)}</div>
                                </div>
                              </td>
                              <td>
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
                              <td>
                                <div className="text-sm">
                                  <div className="font-medium">{item.quantity}</div>
                                  <div className="text-gray-500">/{item.threshold || 10}</div>
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge ${
                                  isLowStock ? 'status-low-stock' : 'status-in-stock'
                                } ${isMobile ? 'text-xs' : ''}`}>
                                  {isLowStock ? 'Low' : 'OK'}
                                </span>
                              </td>
                              <td>
                                <span 
                                  className="text-sm cursor-pointer hover:text-indigo-600 inline-block"
                                  onClick={() => {
                                    const dateStr = item.timestamp.toISOString().split('T')[0];
                                    setDateFilter({
                                      startDate: dateStr,
                                      endDate: dateStr
                                    });
                                  }}
                                  title="Filter by this date"
                                >
                                  {isMobile ? 
                                    item.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                                    item.timestamp.toLocaleDateString()
                                  }
                                </span>
                              </td>
                              <td>
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => startEditing(item)}
                                    className={`action-button text-blue-600 ${isMobile ? 'p-3' : 'p-2'}`}
                                    title="Edit Item"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className={`action-button text-red-600 ${isMobile ? 'p-3' : 'p-2'}`}
                                    title="Delete Item"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-gray-500">
                            No items match your current filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center px-4 py-3 bg-gray-50 border-t">
                    <div className="flex items-center justify-center space-x-2 w-full">
                      {/* Page numbers */}
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

                      {/* Items per page indicator */}
                      <span className="ml-4 text-sm text-gray-600">
                        {itemsPerPage} items per page
                      </span>
                    </div>
                  </div>
                )}
              </div>
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
                  window.scrollTo({ top: 0, behavior: 'smooth' });
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
                <span className="text-xs">Check List</span>
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
                onClick={() => setFilterCategory('')}
                className={`flex flex-col items-center px-4 py-2 ${filterCategory ? 'bg-red-100' : 'bg-gray-100'} rounded-lg min-w-[80px]`}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable; 