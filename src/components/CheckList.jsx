import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link, useNavigate } from 'react-router-dom';
import ParticlesBackground from './ParticlesBackground';

const CheckList = () => {
  const [checkListItems, setCheckListItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [date, setDate] = useState('');
  const [needToOrder, setNeedToOrder] = useState('');
  const [orderReceivedDate, setOrderReceivedDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [notificationSummary, setNotificationSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [autoAddLowStock, setAutoAddLowStock] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCheckListItems();
    fetchInventoryItems();
  }, []);

  const fetchCheckListItems = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'checkList'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCheckListItems(items);
      
      // Initialize checked state for existing items
      const checkedState = {};
      items.forEach(item => {
        checkedState[item.id] = {
          ordered: item.ordered || false,
          received: item.received || false
        };
      });
      setCheckedItems(checkedState);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown Item',
          quantity: data.quantity || 0,
          threshold: data.threshold || 10,
          category: data.category || '',
          price: data.price || 0,
          ...data
        };
      });
      
      // Filter low stock items
      const lowStock = items.filter(item => item.quantity <= item.threshold);
      setInventoryItems(items);
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isUpdateMode && currentItemId) {
        // Update existing item
        await updateDoc(doc(db, 'checkList', currentItemId), {
          date,
          needToOrder,
          orderReceivedDate,
          ordered: checkedItems[currentItemId]?.ordered || false,
          received: checkedItems[currentItemId]?.received || false,
          updatedAt: new Date()
        });
      } else {
        // Add new item
        const newDoc = await addDoc(collection(db, 'checkList'), {
          date,
          needToOrder,
          orderReceivedDate,
          ordered: false,
          received: false,
          createdAt: new Date()
        });
        
        // Update checked items state
        setCheckedItems({
          ...checkedItems,
          [newDoc.id]: { ordered: false, received: false }
        });
      }
      
      // Reset form
      setDate('');
      setNeedToOrder('');
      setOrderReceivedDate('');
      setIsUpdateMode(false);
      setCurrentItemId(null);
      
      // Close modal
      setIsModalOpen(false);
      
      // Refresh list
      fetchCheckListItems();
    } catch (error) {
      console.error('Error handling checklist item:', error);
    }
  };

  const handlePasswordSubmit = async () => {
    // Simple password check (you should implement proper authentication)
    if (password === '1234') { // Change this to your desired password
      setShowPasswordModal(false);
      setPassword('');
      
      if (pendingAction) {
        if (pendingAction.type === 'delete') {
          await deleteItem(pendingAction.id);
        }
        setPendingAction(null);
      }
    } else {
      alert('Incorrect password');
      setPassword('');
    }
  };

  const handleDelete = (id) => {
    setPendingAction({ type: 'delete', id });
    setShowPasswordModal(true);
  };

  const deleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'checkList', id));
      fetchCheckListItems();
    } catch (error) {
      console.error('Error deleting checklist item:', error);
    }
  };

  const handleUpdate = (item) => {
    setDate(item.date);
    setNeedToOrder(item.needToOrder);
    setOrderReceivedDate(item.orderReceivedDate || '');
    setCurrentItemId(item.id);
    setIsUpdateMode(true);
    setIsModalOpen(true);
  };

  const handleCheckboxChange = async (itemId, type) => {
    const newCheckedState = {
      ...checkedItems,
      [itemId]: {
        ...checkedItems[itemId],
        [type]: !checkedItems[itemId][type]
      }
    };
    setCheckedItems(newCheckedState);
    
    // Update in database
    try {
      await updateDoc(doc(db, 'checkList', itemId), {
        [type]: newCheckedState[itemId][type],
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating checkbox state:', error);
    }
  };

  const generatePurchaseSummary = () => {
    const orderedItems = checkListItems.filter(item => 
      checkedItems[item.id]?.ordered && !checkedItems[item.id]?.received
    );
    
    let summary = '';
    
    // Add low stock items section
    if (lowStockItems.length > 0) {
      summary += '🚨 LOW STOCK ALERTS:\n\n';
      lowStockItems.forEach(item => {
        const percentageLeft = ((item.quantity / item.threshold) * 100).toFixed(0);
        summary += `• ${item.name} - Only ${item.quantity} left (${percentageLeft}% of threshold)\n`;
        summary += `  Category: ${item.category || 'N/A'} | Price: ${item.price.toFixed(2)}\n`;
        summary += `  ⚠️ Need to order: ${item.threshold - item.quantity + 10} units\n\n`;
      });
      summary += `Total low stock items: ${lowStockItems.length}\n`;
      summary += '\n' + '─'.repeat(50) + '\n\n';
    }
    
    // Add manually created orders section
    if (orderedItems.length > 0) {
      summary += '📋 PENDING ORDERS:\n\n';
      orderedItems.forEach(item => {
        summary += `• ${item.needToOrder}\n`;
        summary += `  Ordered on: ${item.date}\n`;
        if (item.orderReceivedDate) {
          summary += `  Notes: ${item.orderReceivedDate}\n`;
        }
        summary += '\n';
      });
      summary += `Total pending orders: ${orderedItems.length}\n`;
    }
    
    if (lowStockItems.length === 0 && orderedItems.length === 0) {
      summary = '✅ All items are well stocked and all orders have been received!';
    } else {
      summary += '\n' + '─'.repeat(50) + '\n';
      summary += `📊 SUMMARY: ${lowStockItems.length} low stock alerts, ${orderedItems.length} pending orders`;
    }
    
    setNotificationSummary(summary);
    setShowSummary(true);
  };

  const addLowStockToChecklist = async () => {
    if (lowStockItems.length === 0) {
      alert('No low stock items to add!');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      for (const item of lowStockItems) {
        const orderQuantity = item.threshold - item.quantity + 10;
        await addDoc(collection(db, 'checkList'), {
          date: today,
          needToOrder: `${item.name} - Order ${orderQuantity} units (Low Stock Auto-Added)`,
          orderReceivedDate: `Auto-generated: Current stock ${item.quantity}/${item.threshold}`,
          ordered: false,
          received: false,
          createdAt: new Date(),
          autoGenerated: true,
          inventoryItemId: item.id
        });
      }
      
      alert(`Added ${lowStockItems.length} low stock items to order list!`);
      fetchCheckListItems();
      fetchInventoryItems();
    } catch (error) {
      console.error('Error adding low stock items:', error);
      alert('Failed to add low stock items to checklist');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <ParticlesBackground />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Order Check List</h1>
            {lowStockItems.length > 0 && (
              <p className="text-red-600 dark:text-red-400 mt-2 text-lg font-medium">
                ⚠️ {lowStockItems.length} items are low on stock!
              </p>
            )}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-lg font-medium"
            >
              ← Back
            </button>
            <Link to="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition text-lg font-medium">
              Dashboard
            </Link>
            <Link to="/inventory" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition text-lg font-medium">
              Inventory
            </Link>
            <button 
              onClick={generatePurchaseSummary}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-lg font-medium"
            >
              📊 Purchase Summary
            </button>
            {lowStockItems.length > 0 && (
              <button 
                onClick={addLowStockToChecklist}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-lg font-medium animate-pulse"
              >
                🚨 Add Low Stock Items
              </button>
            )}
            <button 
              onClick={() => {
                setIsUpdateMode(false);
                setDate('');
                setNeedToOrder('');
                setOrderReceivedDate('');
                setCurrentItemId(null);
                setIsModalOpen(true);
              }}
              className="inventory-button px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-lg font-medium"
            >
              ➕ Add New Order
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : checkListItems.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="w-16 px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">✓ Ordered</th>
                    <th className="w-16 px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">✓ Received</th>
                    <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="w-2/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Need to Order</th>
                    <th className="w-2/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                    <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {checkListItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${item.autoGenerated ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={checkedItems[item.id]?.ordered || false}
                          onChange={() => handleCheckboxChange(item.id, 'ordered')}
                          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={checkedItems[item.id]?.received || false}
                          onChange={() => handleCheckboxChange(item.id, 'received')}
                          className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {item.date}
                        {item.autoGenerated && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Auto</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">{item.needToOrder}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.orderReceivedDate}</td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button 
                          onClick={() => handleUpdate(item)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4 text-base"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-base"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300 text-lg">No order items found.</p>
          </div>
        )}
      </div>

      {/* Modal for adding/updating items */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content dark:bg-gray-800 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
              {isUpdateMode ? 'Update Order Item' : 'Add New Order Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-gray-700 dark:text-gray-300 col-span-1 text-right text-lg font-medium">Date:</label>
                <div className="col-span-3">
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-gray-700 dark:text-gray-300 col-span-1 text-right text-lg font-medium">Need to Order:</label>
                <div className="col-span-3">
                  <input 
                    type="text" 
                    value={needToOrder} 
                    onChange={(e) => setNeedToOrder(e.target.value)}
                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg"
                    required
                    placeholder="Enter items that need to be ordered"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-start">
                <label className="text-gray-700 dark:text-gray-300 col-span-1 text-right pt-3 text-lg font-medium">Notes:</label>
                <div className="col-span-3">
                  <textarea 
                    value={orderReceivedDate} 
                    onChange={(e) => setOrderReceivedDate(e.target.value)}
                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white modal-body text-lg"
                    placeholder="Add notes (Optional - e.g., order details, delivery info)"
                    rows="4"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="modal-cancel mr-3 px-6 py-3 border rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 text-lg font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="modal-button px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg font-medium"
                >
                  {isUpdateMode ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content dark:bg-gray-800 max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
              Enter Password
            </h2>
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg"
                placeholder="Enter password to proceed"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setPendingAction(null);
                  }}
                  className="px-6 py-3 border rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 text-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 text-lg font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Summary Modal */}
      {showSummary && (
        <div className="modal-overlay">
          <div className="modal-content dark:bg-gray-800 max-w-3xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-3">
              📊 Purchase Order Summary
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                Generated on {new Date().toLocaleDateString()}
              </span>
            </h2>
            
            {lowStockItems.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🚨</span> Low Stock Alerts ({lowStockItems.length})
                </h3>
                <div className="space-y-3">
                  {lowStockItems.map((item) => {
                    const percentageLeft = ((item.quantity / item.threshold) * 100).toFixed(0);
                    const orderQuantity = item.threshold - item.quantity + 10;
                    return (
                      <div key={item.id} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-red-200 dark:border-red-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-lg text-gray-800 dark:text-white">{item.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Category: {item.category || 'N/A'} | Price: ${item.price.toFixed(2)}
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">
                              Current Stock: {item.quantity}/{item.threshold} ({percentageLeft}% of threshold)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-700 dark:text-red-400">
                              Order: {orderQuantity} units
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {checkListItems.filter(item => checkedItems[item.id]?.ordered && !checkedItems[item.id]?.received).length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="text-2xl">📋</span> Pending Orders ({checkListItems.filter(item => checkedItems[item.id]?.ordered && !checkedItems[item.id]?.received).length})
                </h3>
                <div className="space-y-3">
                  {checkListItems.filter(item => checkedItems[item.id]?.ordered && !checkedItems[item.id]?.received).map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-lg text-gray-800 dark:text-white">{item.needToOrder}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Ordered on: {item.date}</p>
                      {item.orderReceivedDate && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Notes: {item.orderReceivedDate}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-600 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockItems.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-600 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pending Orders</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {checkListItems.filter(item => checkedItems[item.id]?.ordered && !checkedItems[item.id]?.received).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-lg font-medium"
              >
                🖨️ Print Summary
              </button>
              <button
                onClick={() => setShowSummary(false)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckList;