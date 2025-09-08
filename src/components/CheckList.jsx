import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link, useNavigate } from 'react-router-dom';
import ParticlesBackground from './ParticlesBackground';

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
    if (item.received) return 'received';
    if (item.ordered) return 'ordered';
    return 'pending';
  };

  const getStatusDisplay = (status, isLowStock = false) => {
    switch (status) {
      case 'received':
        return { text: 'Received', class: 'bg-green-100 text-green-800 border-green-200' };
      case 'ordered':
        return { text: 'Ordered', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      default:
        return { 
          text: isLowStock ? 'Low Stock' : 'Pending', 
          class: isLowStock 
            ? 'bg-red-100 text-red-800 border-red-200' 
            : 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const getFilteredItems = () => {
    return checkListItems.filter(item => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!item.needToOrder?.toLowerCase().includes(searchLower) && 
            !item.orderReceivedDate?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      if (statusFilter !== 'all') {
        const status = getItemStatus(item.id);
        if (status !== statusFilter) return false;
      }
      
      return true;
    });
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

  const handleStatusChange = async (itemId, newStatus) => {
    const newCheckedState = {
      ...checkedItems,
      [itemId]: {
        ordered: newStatus === 'ordered' || newStatus === 'received',
        received: newStatus === 'received'
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
  const completedItems = checkListItems.filter(item => getItemStatus(item.id) === 'received').length;
  const pendingItemsCount = totalItems - completedItems;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ParticlesBackground />
      
      <div className="container mx-auto px-6 py-8">
        {/* Simplified Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Management System</h1>
              <div className="flex items-center gap-6 mt-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  Total: {totalItems}
                </span>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                  Pending: {pendingItemsCount}
                </span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                  Completed: {completedItems}
                </span>
                {lowStockItems.length > 0 && (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium animate-pulse">
                    Low Stock: {lowStockItems.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back
            </button>
            <Link 
              to="/" 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/inventory" 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Inventory
            </Link>
            {lowStockItems.length > 0 && (
              <button 
                onClick={addLowStockToChecklist}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Add Low Stock Items
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
              + Add New Order
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Orders</label>
              <input
                type="text"
                placeholder="Search by item name or notes"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Only</option>
                <option value="ordered">Ordered Only</option>
                <option value="received">Received Only</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredItems.length} of {totalItems} orders
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Item to Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item, index) => {
                    const status = getItemStatus(item.id);
                    const statusDisplay = getStatusDisplay(status, item.autoGenerated);
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'
                        } ${item.autoGenerated ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.date}
                          {item.autoGenerated && (
                            <div className="text-xs text-red-600 dark:text-red-400">Auto-Generated</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          <div className="font-medium">{item.needToOrder}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${statusDisplay.class}`}>
                            {statusDisplay.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {item.orderReceivedDate && (
                            <div className="max-w-xs truncate" title={item.orderReceivedDate}>
                              {item.orderReceivedDate}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            {status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'ordered')}
                                className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors"
                              >
                                Mark Ordered
                              </button>
                            )}
                            {(status === 'pending' || status === 'ordered') && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'received')}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                              >
                                Mark Received
                              </button>
                            )}
                            <button 
                              onClick={() => handleUpdate(item)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              No orders found
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Start by adding items that need to be ordered'
              }
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Your First Order
            </button>
          </div>
        )}
      </div>

      {/* Simple Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                {isUpdateMode ? 'Update Order Item' : 'Add New Order Item'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Need to Order
                  </label>
                  <input 
                    type="text" 
                    value={needToOrder} 
                    onChange={(e) => setNeedToOrder(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Enter items that need to be ordered"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea 
                    value={orderReceivedDate} 
                    onChange={(e) => setOrderReceivedDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add notes (Optional)"
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
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

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                Enter Password
              </h2>
              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
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