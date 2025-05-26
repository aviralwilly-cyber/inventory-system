// import { collection, addDoc } from 'firebase/firestore';
// import { db } from '../config/firebase';

// const defaultItems = {
//   stationery: [
//     { name: 'Cello Tapes Small', price: 2.99, quantity: 50, threshold: 10 },
//     { name: 'Cello Tapes Big', price: 4.99, quantity: 30, threshold: 8 },
//     { name: 'Credit Note Sheets', price: 15.99, quantity: 200, threshold: 50 },
//     { name: 'Party Tray Menu', price: 0.99, quantity: 100, threshold: 25 },
//     { name: 'Paper Roll for Payment Machine', price: 3.99, quantity: 20, threshold: 5 },
//     { name: 'Paper Roll for Receipt Printer', price: 3.99, quantity: 20, threshold: 5 },
//     { name: 'Staples', price: 2.99, quantity: 1000, threshold: 200 },
//     { name: 'Sticky Notes', price: 1.99, quantity: 50, threshold: 10 },
//     { name: 'Takeout Menu', price: 0.50, quantity: 500, threshold: 100 },
//     { name: 'Tip Out Sheets', price: 0.25, quantity: 200, threshold: 50 }
//   ],
//   operations: [
//     { name: 'Birthday Candles', price: 1.99, quantity: 100, threshold: 20 },
//     { name: 'Chopsticks', price: 0.10, quantity: 1000, threshold: 200 },
//     { name: 'Doilies (soup napkins)', price: 0.05, quantity: 1000, threshold: 200 },
//     { name: 'Gloves', price: 0.20, quantity: 500, threshold: 100 },
//     { name: 'Hand Sanitizer', price: 4.99, quantity: 20, threshold: 5 },
//     { name: 'Kids Plastic Lid', price: 0.25, quantity: 200, threshold: 50 },
//     { name: 'Kids Plastic Mug', price: 0.99, quantity: 100, threshold: 25 },
//     { name: 'Candle Lighter', price: 2.99, quantity: 10, threshold: 3 },
//     { name: 'Meal Kits', price: 0.50, quantity: 500, threshold: 100 },
//     { name: 'Paper Napkins - dining 2 ply', price: 0.05, quantity: 2000, threshold: 500 },
//     { name: 'Pacer', price: 1.99, quantity: 20, threshold: 5 },
//     { name: 'Plastic Bag (S1,S3,S5)', price: 0.10, quantity: 1000, threshold: 200 },
//     { name: 'Straws', price: 0.02, quantity: 2000, threshold: 500 },
//     { name: 'Tooth Picks', price: 0.01, quantity: 1000, threshold: 200 },
//     { name: 'Tub lids for sauces', price: 0.15, quantity: 500, threshold: 100 },
//     { name: 'Tubs for sauces', price: 0.20, quantity: 500, threshold: 100 }
//   ],
//   beverages: [
//     { name: 'Barbican Pineapple', price: 2.99, quantity: 48, threshold: 12 },
//     { name: 'Barbican Strawberry', price: 2.99, quantity: 48, threshold: 12 },
//     { name: 'Bottled Water', price: 1.99, quantity: 96, threshold: 24 },
//     { name: 'Club Soda - Great Value', price: 1.49, quantity: 24, threshold: 6 },
//     { name: 'Coca Cola', price: 1.99, quantity: 48, threshold: 12 },
//     { name: 'Coke Zero', price: 1.99, quantity: 48, threshold: 12 },
//     { name: 'Crush', price: 1.99, quantity: 48, threshold: 12 },
//     { name: 'Pineapple Juice', price: 3.99, quantity: 12, threshold: 3 },
//     { name: 'Orange Juice - Oasis 960 ml', price: 3.99, quantity: 12, threshold: 3 },
//     { name: 'Mango Juice - Best 1 litre', price: 4.99, quantity: 12, threshold: 3 },
//     { name: 'Green Tea Bags', price: 0.10, quantity: 100, threshold: 25 },
//     { name: 'Sprite', price: 1.99, quantity: 48, threshold: 12 },
//     { name: 'Root Beer', price: 1.99, quantity: 48, threshold: 12 },
//     { name: 'Ice Tea', price: 1.99, quantity: 48, threshold: 12 },
//     { name: 'Perrier', price: 2.49, quantity: 24, threshold: 6 },
//     { name: 'Gingerale', price: 1.99, quantity: 48, threshold: 12 }
//   ],
//   desserts: [
//     { name: 'Ice Cream - Chocolate', price: 5.99, quantity: 12, threshold: 3 },
//     { name: 'Ice Cream - Vanilla', price: 5.99, quantity: 12, threshold: 3 },
//     { name: 'Fortune Cookies', price: 0.10, quantity: 1000, threshold: 200 },
//     { name: 'Chocolate Syrup - Smuckers', price: 4.99, quantity: 6, threshold: 2 },
//     { name: 'Brownies', price: 1.99, quantity: 48, threshold: 12 }
//   ],
//   saucePackets: [
//     { name: 'Soy Sauce Packets', price: 0.10, quantity: 1000, threshold: 200 },
//     { name: 'Chilli Sauce Packets', price: 0.10, quantity: 1000, threshold: 200 },
//     { name: 'Chilli Vinegar Packets', price: 0.10, quantity: 1000, threshold: 200 }
//   ],
//   janitorial: [
//     { name: 'Urinal Screen', price: 2.99, quantity: 10, threshold: 3 },
//     { name: 'Windex', price: 4.99, quantity: 6, threshold: 2 },
//     { name: 'Toilet Paper Roll', price: 0.99, quantity: 48, threshold: 12 },
//     { name: 'Urinal Puck', price: 1.99, quantity: 20, threshold: 5 },
//     { name: 'Table Top Spray - Pledge', price: 5.99, quantity: 6, threshold: 2 },
//     { name: 'Multi fold Paper Towel', price: 2.99, quantity: 24, threshold: 6 },
//     { name: 'Pine-Sol', price: 4.99, quantity: 6, threshold: 2 },
//     { name: 'Lysol Toilet Bowl Cleaner', price: 4.99, quantity: 6, threshold: 2 },
//     { name: 'Hand Soap', price: 3.99, quantity: 12, threshold: 3 },
//     { name: 'Garbage Bags - Spartano black 26"x36"', price: 0.25, quantity: 200, threshold: 50 },
//     { name: 'Garbage Bags - 12 litres', price: 0.20, quantity: 200, threshold: 50 },
//     { name: 'Clorox Disinfecting Spray', price: 5.99, quantity: 6, threshold: 2 },
//     { name: 'Brown Paper Roll', price: 3.99, quantity: 12, threshold: 3 }
//   ]
// };

// // Function to populate the inventory
// export const populateInventory = async () => {
//   try {
//     for (const category in defaultItems) {
//       for (const item of defaultItems[category]) {
//         await addDoc(collection(db, 'inventory'), {
//           ...item,
//           timestamp: new Date()
//         });
//       }
//     }
//     console.log('Inventory successfully populated!');
//   } catch (error) {
//     console.error('Error populating inventory:', error);
//   }
// };