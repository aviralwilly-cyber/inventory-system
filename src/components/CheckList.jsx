import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link, useNavigate } from 'react-router-dom';

const CheckList = () => {
  const [checkListItems, setCheckListItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [date, setDate] = useState('');
  const [needToOrder, setNeedToOrder] = useState('');
  const [orderReceivedDate, setOrderReceivedDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // cards or table
  
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
      
      const lowStock = items.filter(item => item.quantity <= item.threshold);
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  const getItemStatus = (itemId) => {
    const item = checkedItems[itemId];
    if (!item) return 'pending';
    if (item.received) return 'completed';
    if (item.ordered) return 'ordered';
    return 'pending';
  };

  const getStatusDisplay = (status, isLowStock = false) => {
    switch (status) {
      case 'completed':
        return { 
          text: '✅ Completed', 
          class: 'bg-green-50 border-green-200 text-green-800',
          bgClass: 'bg-green-50',
          priority: 4
        };
      case 'ordered':
        return { 
          text: '📦 Ordered - Awaiting Delivery', 
          class: 'bg-blue-50 border-blue-200 text-blue-800',
          bgClass: 'bg-blue-50',
          priority: 3
        };
      case 'pending':
        if (isLowStock) {
          return { 
            text: '🚨 URGENT - Low Stock!', 
            class: 'bg-red-50 border-red-200 text-red-800',
            bgClass: 'bg-red-50',
            priority: 1
          };
        }
        return { 
          text: '⏳ Ready to Order', 
          class: 'bg-orange-50 border-orange-200 text-orange-800',
          bgClass: 'bg-orange-50',
          priority: 2
        };
      default:
        return { 
          text: '❓ Unknown Status', 
          class: 'bg-gray-50 border-gray-200 text-gray-800',
          bgClass: 'bg-gray-50',
          priority: 5
        };
    }
  };

  const getFilteredItems = () => {
    let filtered = checkListItems.filter(item => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!item.needToOrder?.toLowerCase().includes(searchLower) && 
            !item.orderReceivedDate?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      if (statusFilter !== 'all') {
        const status = getItemStatus(item.id);
        if (statusFilter === 'needs-action' && status === 'completed') return false;
        if (statusFilter === 'completed' && status !== 'completed') return false;
        if (statusFilter === 'pending' && status !== 'pending') return false;
        if (statusFilter === 'ordered' && status !== 'ordered') return false;
      }
      
      return true;
    });

    // Sort by priority (urgent items first)
    filtered.sort((a, b) => {
      const statusA = getItemStatus(a.id);
      const statusB = getItemStatus(b.id);
      const displayA = getStatusDisplay(statusA, a.autoGenerated);
      const displayB = getStatusDisplay(statusB, b.autoGenerated);
      return displayA.priority - displayB.priority;
    });

    return filtered;
  };

  const handleQuickStatusChange = async (itemId, newStatus) => {
    const newCheckedState = {
      ...checkedItems,
      [itemId]: {
        ordered: newStatus === 'ordered' || newStatus === 'completed',
        received: newStatus === 'completed'
      }
    };
    setCheckedItems(newCheckedState);
    
    try {
      await updateDoc(doc(db, 'checkList', itemId), {
        ordered: newCheckedState[itemId].ordered,
        received: newCheckedState[itemId].received,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isUpdateMode && currentItemId) {
        await updateDoc(doc(db, 'checkList', currentItemId), {
          date,
          needToOrder,
          orderReceivedDate,
          ordered: checkedItems[currentItemId]?.ordered || false,
          received: checkedItems[currentItemId]?.received || false,
          updatedAt: new Date()
        });
      } else {
        const newDoc = await addDoc(collection(db, 'checkList'), {
          date,
          needToOrder,
          orderReceivedDate,
          ordered: false,
          received: false,
          createdAt: new Date()
        });
        
        setCheckedItems(prev => ({
          ...prev,
          [newDoc.id]: { ordered: false, received: false }
        }));
      }
      
      setDate('');
      setNeedToOrder('');
      setOrderReceivedDate('');
      setIsUpdateMode(false);
      setCurrentItemId(null);
      setIsModalOpen(false);
      
      fetchCheckListItems();
    } catch (error) {
      console.error('Error handling checklist item:', error);
    }
  };

  const handlePasswordSubmit = async () => {
    if (password === '1234') {
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

  const filteredItems = getFilteredItems();
  const totalItems = checkListItems.length;
  const completedItems = checkListItems.filter(item => getItemStatus(item.id) === 'completed').length;
  const orderedItems = checkListItems.filter(item => getItemStatus(item.id) === 'ordered').length;
  const pendingItems = checkListItems.filter(item => getItemStatus(item.id) === 'pending').length;
  const urgentItems = checkListItems.filter(item => getItemStatus(item.id) === 'pending' && item.autoGenerated).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                📋 Order Checklist
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Quick and easy order management</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {viewMode === 'cards' ? '📋 Table View' : '🎴 Card View'}
              </button>
            </div>
          </div>



          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back
            </button>
            <Link 
              to="/" 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              🏠 Dashboard
            </Link>
            <Link 
              to="/inventory" 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              📦 Inventory
            </Link>
            {lowStockItems.length > 0 && (
              <button 
                onClick={addLowStockToChecklist}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors animate-pulse"
              >
                🚨 Add {lowStockItems.length} Low Stock Items
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
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ➕ Add New Order
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="🔍 Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({totalItems})
              </button>
              <button
                onClick={() => setStatusFilter('needs-action')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'needs-action' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Action Needed ({pendingItems + orderedItems})
              </button>
            </div>
          </div>
        </div>

        {/* Items Display */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredItems.length > 0 ? (
          viewMode === 'cards' ? (
            // Card View - More User Friendly
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => {
                const status = getItemStatus(item.id);
                const statusDisplay = getStatusDisplay(status, item.autoGenerated);
                
                return (
                  <div 
                    key={item.id} 
                    className={`${statusDisplay.bgClass} border-2 ${statusDisplay.class.split(' ')[1]} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 ${
                      item.autoGenerated ? 'border-l-8 border-l-red-500' : ''
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-4">
                      <span className={`inline-block px-3 py-1 text-sm font-bold rounded-full ${statusDisplay.class}`}>
                        {statusDisplay.text}
                      </span>
                      {item.autoGenerated && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          AUTO
                        </span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{item.needToOrder}</h3>
                      <p className="text-sm text-gray-600 mb-1">📅 {item.date}</p>
                      {item.orderReceivedDate && (
                        <p className="text-sm text-gray-500">📝 {item.orderReceivedDate}</p>
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="space-y-2">
                      {status === 'pending' && (
                        <button
                          onClick={() => handleQuickStatusChange(item.id, 'ordered')}
                          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-lg"
                        >
                          📦 Mark as Ordered
                        </button>
                      )}
                      
                      {status === 'ordered' && (
                        <button
                          onClick={() => handleQuickStatusChange(item.id, 'completed')}
                          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-lg"
                        >
                          ✅ Mark as Received
                        </button>
                      )}

                      {status === 'completed' && (
                        <div className="w-full px-4 py-3 bg-green-100 text-green-800 rounded-lg text-center font-medium">
                          ✅ Order Complete!
                        </div>
                      )}

                      {/* Secondary Actions */}
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => handleUpdate(item)}
                          className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Table View - Compact
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item & Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quick Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item) => {
                      const status = getItemStatus(item.id);
                      const statusDisplay = getStatusDisplay(status, item.autoGenerated);
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${statusDisplay.class}`}>
                              {statusDisplay.text}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{item.needToOrder}</div>
                            <div className="text-sm text-gray-500">{item.date}</div>
                          </td>
                          <td className="px-6 py-4">
                            {status === 'pending' && (
                              <button
                                onClick={() => handleQuickStatusChange(item.id, 'ordered')}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                              >
                                📦 Order
                              </button>
                            )}
                            {status === 'ordered' && (
                              <button
                                onClick={() => handleQuickStatusChange(item.id, 'completed')}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                              >
                                ✅ Received
                              </button>
                            )}
                            {status === 'completed' && (
                              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm">Complete</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdate(item)} className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                              <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 text-sm">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">No orders found</h2>
            <p className="text-gray-600 mb-6">Start by adding items that need to be ordered</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ➕ Add Your First Order
            </button>
          </div>
        )}
      </div>

      {/* Modals remain the same */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {isUpdateMode ? '✏️ Update Order' : '➕ Add New Order'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📅 Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📦 Items to Order</label>
                  <input 
                    type="text" 
                    value={needToOrder} 
                    onChange={(e) => setNeedToOrder(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Enter items that need to be ordered"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📝 Notes</label>
                  <textarea 
                    value={orderReceivedDate} 
                    onChange={(e) => setOrderReceivedDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add notes (Optional)"
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {isUpdateMode ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">🔒 Enter Password</h2>
              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordSubmit}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckList;