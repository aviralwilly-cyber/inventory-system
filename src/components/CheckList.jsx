import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import ParticlesBackground from './ParticlesBackground';

const CheckList = () => {
  const [checkListItems, setCheckListItems] = useState([]);
  const [date, setDate] = useState('');
  const [needToOrder, setNeedToOrder] = useState('');
  const [orderReceivedDate, setOrderReceivedDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCheckListItems();
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
    } catch (error) {
      console.error('Error fetching checklist items:', error);
    } finally {
      setIsLoading(false);
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
      setIsModalOpen(false);
      
      // Refresh list
      fetchCheckListItems();
    } catch (error) {
      console.error('Error handling checklist item:', error);
    }
  };

  const handleDelete = async (id) => {
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

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <ParticlesBackground />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Check List</h1>
          <div className="flex space-x-4">
            <Link to="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition">
              Dashboard
            </Link>
            <Link to="/inventory" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition">
              Inventory
            </Link>
            <button 
              onClick={() => {
                setIsUpdateMode(false);
                setDate('');
                setNeedToOrder('');
                setOrderReceivedDate('');
                setCurrentItemId(null);
                setIsModalOpen(true);
              }}
              className="inventory-button px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Add New Item
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
                    <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="w-2/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Need to Order</th>
                    <th className="w-2/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Order Received (Note)</th>
                    <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {checkListItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.needToOrder}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.orderReceivedDate}</td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <button 
                          onClick={() => handleUpdate(item)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          Update
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
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
            <p className="text-gray-600 dark:text-gray-300">No checklist items found.</p>
          </div>
        )}
      </div>

      {/* Modal for adding/updating items */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content dark:bg-gray-800">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
              {isUpdateMode ? 'Update Check List Item' : 'Add New Check List Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-gray-700 dark:text-gray-300 col-span-1 text-right">Date:</label>
                <div className="col-span-3">
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-gray-700 dark:text-gray-300 col-span-1 text-right">Need to Order:</label>
                <div className="col-span-3">
                  <input 
                    type="text" 
                    value={needToOrder} 
                    onChange={(e) => setNeedToOrder(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    placeholder="Enter items that need to be ordered"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-start">
                <label className="text-gray-700 dark:text-gray-300 col-span-1 text-right pt-2">Order Received (Note):</label>
                <div className="col-span-3">
                  <textarea 
                    value={orderReceivedDate} 
                    onChange={(e) => setOrderReceivedDate(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white modal-body"
                    placeholder="Add notes Optional(for example: about when order was received)"
                    rows="4"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="modal-cancel mr-3 px-4 py-2 border rounded text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="modal-button px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {isUpdateMode ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckList;