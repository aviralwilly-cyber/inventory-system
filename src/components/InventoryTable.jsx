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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

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

  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
      <ParticlesBackground />
      <div className="dashboard-container flex">
        <div className={`bg-white w-96 min-h-screen shadow-lg ${sidebarOpen ? '' : 'hidden'}`}>
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-indigo-600">Front Of House Dashboard</h1>
          </div>

          <div className="px-6 py-4">
            <button 
              onClick={() => setStatsOpen(!statsOpen)} 
              className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
            >
              <span>Statistics Overview</span>
              <span>{statsOpen ? '▼' : '▶'}</span>
            </button>
          </div>

          {statsOpen && (
            <div className="px-6 py-4 space-y-6">
              <div className="flex flex-row justify-between items-stretch gap-8">
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
                {/* "View Check List" button removed from here */}
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
              
              {/* Keep the sidebar Check List button */}
              <div className="mt-6">
                <Link 
                  to="/check-list" 
                  className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors w-full"
                >
                  <span className="mr-2">📋</span>
                  <span>View Check List</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="main-content flex-1">
          <header className="navbar">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="ml-4">
                  <h2 className="text-xl font-semibold">Manage your inventory items</h2>
                  <p className="text-sm text-gray-600">This dashboard is for managing the F.O.H 
                    inventory. You can add, edit, and delete items here. This is not for the B.O.H inventory.
                    If you need to manage the B.O.H inventory, please use the B.O.H dashboard.
                    This is a work in progress and will be updated soon.
                    If you have any questions, please contact the developer.
                    Thank you for using the F.O.H dashboard.
                    - The Developer XO .
                  </p>
                </div>
              </div>
              
              {/* Keep the header Check List button */}
              <Link 
                to="/check-list" 
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mr-6"
              >
                <span className="mr-2">  📋   </span>
                <span>Check List</span>
              </Link>
            </div>
          </header>

          <main className="px-6">
            <div className="form-container bg-white rounded-lg shadow-sm p-6 mr-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                editingId ? handleUpdateItem(editingId) : handleAddItem(e);
              }} className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
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
                
                <div className="flex gap-2">
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
            
            <div className="table-container mt-6">
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                  <h3 className="text-lg font-semibold">Inventory Items</h3>
                  <div className="flex items-center">
                    {/* "Check List" button removed from here */}
                    <span className="text-sm text-gray-500">
                      Showing {filteredItems.length} of {items.length} items
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                    <div className="flex items-center">
                      <input
                        ref={startDateRef}
                        type="date"
                        className="form-input w-full bg-white"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                      />
                      <button
                        type="button"
                        className="ml-2 p-1 hover:bg-gray-100 rounded"
                        onClick={() => startDateRef.current.showPicker()}
                      >
                        📅
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <div className="flex items-center">
                      <input
                        ref={endDateRef}
                        type="date"
                        className="form-input w-full"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                      />
                      <button
                        type="button"
                        className="ml-2 p-1 hover:bg-gray-100 rounded"
                        onClick={() => endDateRef.current.showPicker()}
                      >
                        📅
                      </button>
                    </div>
                  </div>
                </div>
                
                {(filterCategory || dateFilter.startDate || dateFilter.endDate) && (
                  <div className="flex justify-between items-center mb-2">
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
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
              
              <table className="inventory-table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Function</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const isLowStock = item.quantity <= (item.threshold || 10);
                      return (
                        <tr key={item.id}>
                          <td>
                            <div>
                              <div>{item.name}</div>
                              <div className="text-sm text-gray-500">${parseFloat(item.price).toFixed(2)}</div>
                            </div>
                          </td>
                          <td>
                            {item.category ? (
                              <span 
                                className="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium capitalize cursor-pointer hover:bg-gray-200"
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
                              Quantity: {item.quantity}
                              <br />
                              Threshold: {item.threshold || 10}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${
                              isLowStock ? 'status-low-stock' : 'status-in-stock'
                            }`}>
                              {isLowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td>
                            <span 
                              className="text-sm cursor-pointer hover:text-indigo-600"
                              onClick={() => {
                                const dateStr = item.timestamp.toISOString().split('T')[0];
                                setDateFilter({
                                  startDate: dateStr,
                                  endDate: dateStr
                                });
                              }}
                              title="Filter by this date"
                            >
                              {item.timestamp.toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditing(item)}
                                className="action-button text-blue-600"
                                title="Edit Item"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="action-button text-red-600"
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
          </main>
        </div>
      </div>
    </>
  );
};

export default InventoryTable;