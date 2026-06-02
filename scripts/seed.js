/**
 * AI Smart Dine — Database Seed Script
 * Run: node scripts/seed.js
 * Creates demo restaurants, tables, menus, and users
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User.model');
const Restaurant = require('./src/models/Restaurant.model');
const Table = require('./src/models/Table.model');
const MenuItem = require('./src/models/MenuItem.model');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Restaurant.deleteMany({}),
      Table.deleteMany({}),
      MenuItem.deleteMany({}),
    ]);
    console.log('🗑  Cleared existing data');

    // ── Users ──────────────────────────────────────────────────────────────
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@aismartdine.com',
      password: 'Admin@123',
      role: 'super_admin',
      isEmailVerified: true,
      isActive: true,
    });

    const restaurantAdmin = await User.create({
      name: 'Rajesh Kumar',
      email: 'admin@restaurant.com',
      password: 'Admin@123',
      role: 'restaurant_admin',
      phone: '+919876543210',
      isEmailVerified: true,
      isActive: true,
    });

    const waiter = await User.create({
      name: 'Arjun Singh',
      email: 'waiter@restaurant.com',
      password: 'Waiter@123',
      role: 'waiter',
      phone: '+919876543211',
      isEmailVerified: true,
      isActive: true,
    });

    const customer = await User.create({
      name: 'Priya Sharma',
      email: 'customer@test.com',
      password: 'Customer@123',
      role: 'customer',
      phone: '+919876543212',
      isEmailVerified: true,
      isActive: true,
    });

    console.log('👥 Users created: 4');

    // ── Restaurant ─────────────────────────────────────────────────────────
    const restaurant = await Restaurant.create({
      name: 'The Spice Garden',
      ownerId: restaurantAdmin._id,
      ownerName: 'Rajesh Kumar',
      gstNumber: '29AABCT1332L1ZD',
      address: '123 MG Road, Indiranagar, Bangalore - 560038',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      phone: '+918012345678',
      email: 'info@spicegarden.com',
      restaurantType: 'casual',
      floors: 2,
      totalTables: 15,
      seatingCapacity: 60,
      openingTime: '09:00',
      closingTime: '23:00',
      isOpen: true,
      gstPercentage: 18,
      serviceCharge: 5,
      description: 'Authentic South Indian & North Indian cuisine with a modern twist',
      cuisine: ['South Indian', 'North Indian', 'Chinese'],
    });

    // Link admin & waiter to restaurant
    await User.updateMany(
      { _id: { $in: [restaurantAdmin._id, waiter._id, customer._id] } },
      { restaurantId: restaurant._id }
    );

    console.log('🏢 Restaurant created:', restaurant.name);

    // ── Tables ─────────────────────────────────────────────────────────────
    const tableData = [
      { tableNumber: '1', floor: 1, seatingCapacity: 2, tableType: 'couple',  status: 'available' },
      { tableNumber: '2', floor: 1, seatingCapacity: 4, tableType: 'regular', status: 'available' },
      { tableNumber: '3', floor: 1, seatingCapacity: 4, tableType: 'regular', status: 'occupied'  },
      { tableNumber: '4', floor: 1, seatingCapacity: 6, tableType: 'family',  status: 'available' },
      { tableNumber: '5', floor: 1, seatingCapacity: 4, tableType: 'window',  status: 'reserved'  },
      { tableNumber: '6', floor: 1, seatingCapacity: 2, tableType: 'couple',  status: 'cleaning'  },
      { tableNumber: '7', floor: 2, seatingCapacity: 8, tableType: 'family',  status: 'available' },
      { tableNumber: '8', floor: 2, seatingCapacity: 4, tableType: 'regular', status: 'available' },
      { tableNumber: 'VIP-1', floor: 2, seatingCapacity: 6, tableType: 'vip', status: 'available' },
      { tableNumber: 'VIP-2', floor: 2, seatingCapacity: 8, tableType: 'vip', status: 'available' },
      { tableNumber: 'OUT-1', floor: 1, seatingCapacity: 4, tableType: 'outdoor', status: 'available' },
      { tableNumber: 'OUT-2', floor: 1, seatingCapacity: 4, tableType: 'outdoor', status: 'available' },
    ];

    const tables = await Table.insertMany(
      tableData.map(t => ({ ...t, restaurantId: restaurant._id }))
    );
    console.log(`🪑 Tables created: ${tables.length}`);

    // ── Menu Items ─────────────────────────────────────────────────────────
    const menuData = [
      // Starters
      { name: 'Veg Spring Rolls', category: 'starters', price: 180, isVeg: true, spicyLevel: 'mild', preparationTime: 12, totalOrders: 245, isPopular: true, description: 'Crispy spring rolls with mixed vegetables' },
      { name: 'Chicken Tikka', category: 'starters', price: 320, isVeg: false, spicyLevel: 'medium', preparationTime: 20, totalOrders: 389, isPopular: true, isBestSeller: true, description: 'Succulent chicken marinated in tandoori spices' },
      { name: 'Paneer Tikka', category: 'starters', price: 280, isVeg: true, spicyLevel: 'medium', preparationTime: 15, totalOrders: 312, isPopular: true, description: 'Soft paneer grilled with peppers and spices' },
      { name: 'Fish Fingers', category: 'starters', price: 290, isVeg: false, spicyLevel: 'mild', preparationTime: 15, totalOrders: 156 },
      { name: 'Samosa (2 pcs)', category: 'starters', price: 80, isVeg: true, spicyLevel: 'mild', preparationTime: 8, totalOrders: 520, isPopular: true },

      // Main Course
      { name: 'Chicken Biryani', category: 'main_course', price: 320, isVeg: false, spicyLevel: 'medium', preparationTime: 25, totalOrders: 678, isPopular: true, isBestSeller: true, description: 'Aromatic basmati rice with tender chicken pieces' },
      { name: 'Veg Biryani', category: 'main_course', price: 250, isVeg: true, spicyLevel: 'mild', preparationTime: 20, totalOrders: 423, isPopular: true },
      { name: 'Butter Chicken', category: 'main_course', price: 350, isVeg: false, spicyLevel: 'mild', preparationTime: 22, totalOrders: 567, isBestSeller: true, description: 'Rich, creamy tomato-based chicken curry' },
      { name: 'Palak Paneer', category: 'main_course', price: 280, isVeg: true, spicyLevel: 'mild', preparationTime: 18, totalOrders: 334 },
      { name: 'Dal Makhani', category: 'main_course', price: 240, isVeg: true, spicyLevel: 'none', preparationTime: 15, totalOrders: 289 },
      { name: 'Mutton Rogan Josh', category: 'main_course', price: 420, isVeg: false, spicyLevel: 'hot', preparationTime: 35, totalOrders: 178, description: 'Classic Kashmiri mutton curry' },
      { name: 'Fried Rice', category: 'main_course', price: 200, isVeg: true, spicyLevel: 'mild', preparationTime: 12, totalOrders: 445 },

      // Desserts
      { name: 'Gulab Jamun (2 pcs)', category: 'desserts', price: 100, isVeg: true, spicyLevel: 'none', preparationTime: 5, totalOrders: 389, isPopular: true },
      { name: 'Chocolate Brownie', category: 'desserts', price: 150, isVeg: true, spicyLevel: 'none', preparationTime: 5, totalOrders: 267 },
      { name: 'Ice Cream (2 scoops)', category: 'desserts', price: 120, isVeg: true, spicyLevel: 'none', preparationTime: 3, totalOrders: 445 },
      { name: 'Rasmalai (2 pcs)', category: 'desserts', price: 130, isVeg: true, spicyLevel: 'none', preparationTime: 5, totalOrders: 198 },

      // Drinks
      { name: 'Fresh Lime Soda', category: 'drinks', price: 80, isVeg: true, spicyLevel: 'none', preparationTime: 3, totalOrders: 612 },
      { name: 'Mango Lassi', category: 'drinks', price: 120, isVeg: true, spicyLevel: 'none', preparationTime: 5, totalOrders: 445, isPopular: true },
      { name: 'Coca Cola (330ml)', category: 'drinks', price: 60, isVeg: true, spicyLevel: 'none', preparationTime: 1, totalOrders: 789 },
      { name: 'Fresh Juice', category: 'drinks', price: 140, isVeg: true, spicyLevel: 'none', preparationTime: 5, totalOrders: 234 },
      { name: 'Masala Chai', category: 'drinks', price: 60, isVeg: true, spicyLevel: 'none', preparationTime: 5, totalOrders: 567 },

      // Combos
      { name: 'Biryani + Raita + Coke', category: 'combos', price: 360, isVeg: false, spicyLevel: 'medium', preparationTime: 25, totalOrders: 289, isPopular: true, description: 'Chicken biryani with raita and Coke — saves ₹60!' },
      { name: 'Veg Thali', category: 'combos', price: 280, isVeg: true, spicyLevel: 'mild', preparationTime: 20, totalOrders: 345, description: 'Dal, Paneer, Rice, Roti, Salad, Dessert' },
      { name: 'Family Meal (4 pax)', category: 'combos', price: 1200, isVeg: false, spicyLevel: 'mild', preparationTime: 35, totalOrders: 89, description: '2 Biryani + 2 Starters + 4 Drinks + 2 Desserts' },

      // Breads
      { name: 'Butter Naan', category: 'breads', price: 50, isVeg: true, spicyLevel: 'none', preparationTime: 8, totalOrders: 789 },
      { name: 'Garlic Naan', category: 'breads', price: 70, isVeg: true, spicyLevel: 'none', preparationTime: 8, totalOrders: 634 },
      { name: 'Tandoori Roti', category: 'breads', price: 40, isVeg: true, spicyLevel: 'none', preparationTime: 6, totalOrders: 890 },
    ];

    const menuItems = await MenuItem.insertMany(
      menuData.map(m => ({ ...m, restaurantId: restaurant._id, isAvailable: true }))
    );
    console.log(`🍽️  Menu items created: ${menuItems.length}`);

    console.log('\n✅ Seed completed successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📧 Test Credentials:');
    console.log('  Super Admin: superadmin@aismartdine.com / Admin@123');
    console.log('  Admin:       admin@restaurant.com / Admin@123');
    console.log('  Waiter:      waiter@restaurant.com / Waiter@123');
    console.log('  Customer:    customer@test.com / Customer@123');
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
