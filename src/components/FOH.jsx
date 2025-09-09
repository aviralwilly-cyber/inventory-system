// src/components/FOH.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { INVENTORY_CATEGORIES as categories } from '../constants/categories';
import '../styles/Modal.css';
// import ParticlesBackground from './ParticlesBackground';

const FOH = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [userRole, setUserRole] = useState(null); // 'admin', 'inventory', or 'area51'
  
  // Checklist state variables
  const [checkListItems, setCheckListItems] = useState([]);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [date, setDate] = useState('');
  const [needToOrder, setNeedToOrder] = useState('');
  const [orderReceivedDate, setOrderReceivedDate] = useState('');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);

  // Effect to handle automatic redirection for inventory and area51 users
  useEffect(() => {
    if (isLoggedIn && userRole === 'inventory') {
      navigate('/inventory');
    } else if (isLoggedIn && userRole === 'area51') {
      // Store Area 51 authentication and navigate
      sessionStorage.setItem('area51Auth', 'true');
      navigate('/area-51-inventory');
    }
  }, [isLoggedIn, userRole, navigate]);

  // Fetch inventory from Firestore
  useEffect(() => {
    if (isLoggedIn && userRole === 'admin') {
      const fetchInventory = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'inventory'));
          const itemsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            lastUpdated: doc.data().timestamp?.toDate().toISOString().split('T')[0]
          }));
          
          setInventoryItems(itemsList);
          setFilteredItems(itemsList);
        } catch (error) {
          console.error('Error fetching inventory:', error);
        }
      };
  
      fetchInventory();

      // Also fetch checklist items for user 12345
      const fetchCheckListItems = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'checkList'));
          const items = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdDate: doc.data().createdAt?.toDate?.().toISOString?.().split('T')[0] || ''
          }));
          setCheckListItems(items);
        } catch (error) {
          console.error('Error fetching checklist items:', error);
        }
      };

      fetchCheckListItems();
    }
  }, [isLoggedIn, userRole]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (userIdInput === '12345') {
      setIsLoggedIn(true);
      setUserRole('admin'); // For checklist view
      setErrorMessage('');
      setIsOpen(true); // Open the FOH management modal for admin
    } else if (userIdInput === '5555') {
      setIsLoggedIn(true);
      setUserRole('inventory');
      setErrorMessage('');
      // Will be redirected to inventory by the useEffect
    } else if (userIdInput === '8900') {
      setIsLoggedIn(true);
      setUserRole('area51');
      setErrorMessage('');
      // Will be redirected to Area 51 by the useEffect
    } else {
      setErrorMessage('Invalid User ID. Please try again.');
    }
    setUserIdInput('');
  };
  
  // Checklist functions
  const fetchCheckListItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'checkList'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdDate: doc.data().createdAt?.toDate?.().toISOString?.().split('T')[0] || ''
      }));
      setCheckListItems(items);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
    }
  };

  const handleChecklistSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isUpdateMode && currentItemId) {
        // Update existing item
        await updateDoc(doc(db, 'checkList', currentItemId), {
          date,
          needToOrder,
          orderReceivedDate,
          updatedAt: new Date()
        });
      } else {
        // Add new item
        await addDoc(collection(db, 'checkList'), {
          date,
          needToOrder,
          orderReceivedDate,
          createdAt: new Date()
        });
      }
      
      // Reset form
      setDate('');
      setNeedToOrder('');
      setOrderReceivedDate('');
      setIsUpdateMode(false);
      setCurrentItemId(null);
      
      // Close modal
      setIsChecklistModalOpen(false);
      
      // Refresh list
      fetchCheckListItems();
    } catch (error) {
      console.error('Error handling checklist item:', error);
    }
  };

  const handleDeleteChecklist = async (id) => {
    try {
      await deleteDoc(doc(db, 'checkList', id));
      fetchCheckListItems();
    } catch (error) {
      console.error('Error deleting checklist item:', error);
    }
  };

  const handleUpdateChecklist = (item) => {
    setDate(item.date);
    setNeedToOrder(item.needToOrder);
    setOrderReceivedDate(item.orderReceivedDate || '');
    setCurrentItemId(item.id);
    setIsUpdateMode(true);
    setIsChecklistModalOpen(true);
  };

  // Handle category selection
  const handleCategoryChange = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  // Filter items
  useEffect(() => {
    if (inventoryItems.length > 0) {
      let result = inventoryItems;
      
      if (selectedCategories.length > 0) {
        result = result.filter(item => selectedCategories.includes(item.category));
      }
      
      setFilteredItems(result);
    }
  }, [selectedCategories, inventoryItems]);

  const goToInventory = () => {
    navigate('/inventory');
    setIsOpen(false);
  };

  // If not logged in, show login form
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center">
        {/* <ParticlesBackground /> */}
        <div className="relative z-10 bg-white rounded-xl shadow-2xl p-8 w-96">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            FOH Login
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="password"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter User ID"
                required
              />
            </div>
            {errorMessage && (
              <p className="text-red-500 text-sm">{errorMessage}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              Login
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-600 text-center">
            Authorized User ID's only. Contact the Dev.   
          </p>
          {/* Optional: Add a hint about available user IDs for development */}
          {/* <div className="mt-4 text-xs text-gray-500 text-center">
            <p>12345 - Admin | 5555 - Inventory | 8900 - Area 51</p>
          </div> */}
        </div>
      </div>
    );
  }

  // If logged in with ID 5555, this component won't actually render
  // because we navigate directly to /inventory
  // But as a fallback:
  if (isLoggedIn && userRole === 'inventory') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-20">
        {/* <ParticlesBackground /> */}
        <h1 className="text-2xl font-bold mb-4">Redirecting to Inventory Management...</h1>
        <p>If you're not redirected automatically, click the button below:</p>
        <button
          onClick={goToInventory}
          className="mt-4 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Go to Inventory Management
        </button>
      </div>
    );
  }

  // If logged in with ID 8900, this component won't actually render
  // because we navigate directly to Area 51
  // But as a fallback:
  if (isLoggedIn && userRole === 'area51') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-start pt-20">
        {/* <ParticlesBackground /> */}
        <h1 className="text-2xl font-bold mb-4">Redirecting to Area 51...</h1>
        <p>If you're not redirected automatically, click the button below:</p>
        <button
          onClick={() => navigate('/area-51-inventory')}
          className="mt-4 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
        >
          Go to Area 51
        </button>
      </div>
    );
  }

  // If logged in with ID 12345, show FOH management content
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* <ParticlesBackground /> */}
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-20">
        <h1 className="text-2xl font-bold mb-4">Front of House Management</h1>

        <button
          onClick={() => setIsOpen(true)}
          className="modal-button px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Open FOH Management
        </button>

        {/* FOH Modal */}
        {isOpen && (
          <div className="modal-overlay fixed inset-0 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50">
            <div className="modal-container w-full max-w-5xl bg-white rounded-xl shadow-2xl mx-4 transform transition-all my-8">
              <div className="modal-header flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  Front of House Management
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="modal-close-button text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="modal-body p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="filter-section space-y-4">
                  <div className="category-filters">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Category:</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryChange(category.id)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            selectedCategories.includes(category.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {category.label}
                        </button>
                      ))}
                      {selectedCategories.length > 0 && (
                        <button
                          onClick={() => setSelectedCategories([])}
                          className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="inventory-table-container overflow-y-auto max-h-96">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.length > 0 ? (
                        filteredItems.map(item => {
                          const isLowStock = item.quantity <= (item.threshold || 10);
                          
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 whitespace-nowrap">{item.name}</td>
                              <td className="py-3 px-4 whitespace-nowrap capitalize">{item.category}</td>
                              <td className="py-3 px-4 whitespace-nowrap">${item.price?.toFixed(2)}</td>
                              <td className="py-3 px-4 whitespace-nowrap">{item.quantity}</td>
                              <td className="py-3 px-4 whitespace-nowrap">{item.threshold || 10}</td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  isLowStock 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {isLowStock ? 'Low Stock' : 'In Stock'}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">{item.lastUpdated}</td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-4 text-center text-gray-500">
                            No items found matching your criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="space-y-4 mt-6">
                  <button
                    onClick={goToInventory}
                    className="inventory-button w-full px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all duration-200 ease-in-out transform hover:scale-102 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg"
                  >
                    Inventory Management
                  </button>
                  
                  {/* Add Area 51 Button for Admin */}
                  <button
                    onClick={() => {
                      sessionStorage.setItem('area51Auth', 'true');
                      navigate('/area-51-inventory');
                    }}
                    className="inventory-button w-full px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-all duration-200 ease-in-out transform hover:scale-102 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 shadow-md hover:shadow-lg"
                  >
                    🚀 Area 51 - Quick Adjust
                  </button>
                </div>
                
                {/* Checklist Section - Separated with visual divider */}
                <div className="mt-10 pt-8 border-t-2 border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-800">Check List Items</h3>
                    <button
                      onClick={() => {
                        setIsUpdateMode(false);
                        setDate('');
                        setNeedToOrder('');
                        setOrderReceivedDate('');
                        setCurrentItemId(null);
                        setIsChecklistModalOpen(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-md"
                    >
                      Add New Item
                    </button>
                  </div>
                  
                  {checkListItems.length > 0 ? (
                    <div className="overflow-y-auto max-h-80 border border-gray-200 rounded-lg shadow-inner">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Need to Order</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Received (Note)</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {checkListItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 whitespace-nowrap">{item.date}</td>
                              <td className="py-3 px-4">{item.needToOrder}</td>
                              <td className="py-3 px-4">{item.orderReceivedDate}</td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleUpdateChecklist(item)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Update
                                </button>
                                <button
                                  onClick={() => handleDeleteChecklist(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-inner">
                      <p className="text-gray-500">No checklist items found.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="modal-cancel px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-all duration-200 ease-in-out transform hover:scale-102 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Checklist Add/Edit Modal */}
        {isChecklistModalOpen && (
          <div className="modal-overlay fixed inset-0 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50">
            <div className="modal-container w-full max-w-xl bg-white rounded-xl shadow-2xl mx-4 transform transition-all my-8">
              <div className="modal-header flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isUpdateMode ? 'Update Check List Item' : 'Add New Check List Item'}
                </h2>
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="modal-close-button text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="modal-body p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <form onSubmit={handleChecklistSubmit} className="space-y-6">
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <label className="text-gray-700 col-span-1 text-right">Date:</label>
                    <div className="col-span-3">
                      <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <label className="text-gray-700 col-span-1 text-right">Need to Order:</label>
                    <div className="col-span-3">
                      <input 
                        type="text" 
                        value={needToOrder} 
                        onChange={(e) => setNeedToOrder(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        placeholder="Enter items that need to be ordered"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 items-start">
                    <label className="text-gray-700 col-span-1 text-right pt-2">Order Received (Note):</label>
                    <div className="col-span-3">
                      <textarea 
                        value={orderReceivedDate} 
                        onChange={(e) => setOrderReceivedDate(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add notes (Optional, for example: about when order was received)"
                        rows="4"
                      />
                    </div>
                  </div>
                </form>
              </div>
              
              <div className="modal-footer flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                <button 
                  type="button" 
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="modal-cancel px-4 py-2 border rounded text-gray-700 bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleChecklistSubmit}
                  className="modal-button px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {isUpdateMode ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FOH;