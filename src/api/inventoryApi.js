import { db } from '../config/firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// GET all items
export const getInventoryItems = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'inventory'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error('Failed to fetch items');
  }
};

// GET single item
export const getInventoryItem = async (id) => {
  try {
    const docRef = doc(db, 'inventory', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    throw new Error('Failed to fetch item');
  }
};

// POST new item
export const addInventoryItem = async (item) => {
  try {
    const docRef = await addDoc(collection(db, 'inventory'), {
      ...item,
      timestamp: new Date()
    });
    return { id: docRef.id, ...item };
  } catch (error) {
    throw new Error('Failed to add item');
  }
};

// PUT update item
export const updateInventoryItem = async (id, updates) => {
  try {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
    return { id, ...updates };
  } catch (error) {
    throw new Error('Failed to update item');
  }
};

// DELETE item
export const deleteInventoryItem = async (id) => {
  try {
    await deleteDoc(doc(db, 'inventory', id));
    return { id };
  } catch (error) {
    throw new Error('Failed to delete item');
  }
};