const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Middleware to check admin
async function isAdmin(req, res, next) {
  const user = await User.findById(req.user.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
}

// List all users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const { role, isBlocked, search } = req.query;
    let query = {};
    
    if (role) query.role = role;
    if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user by ID
router.get('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user (admin only)
router.put('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const { username, email, role, isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, role, isBlocked },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Change user role
router.patch('/users/:id/role', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User role updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Block a user (set isBlocked=true)
router.patch('/users/:id/block', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User blocked', user });
  } catch (error) {
    res.status(500).json({ message: 'Error blocking user' });
  }
});

// Unblock a user (set isBlocked=false)
router.patch('/users/:id/unblock', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User unblocked', user });
  } catch (error) {
    res.status(500).json({ message: 'Error unblocking user' });
  }
});

// Delete a user
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted', user });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// List all products
router.get('/products', auth, isAdmin, async (req, res) => {
  try {
    const { vendor, category, isActive } = req.query;
    let query = {};
    
    if (vendor) query.vendor = vendor;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const products = await Product.find(query).populate('vendor', 'username');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// List all orders
router.get('/orders', auth, isAdmin, async (req, res) => {
  try {
    const { status, customer, vendor } = req.query;
    let query = {};
    
    if (status) query.status = status;
    if (customer) query.customer = customer;
    
    let orders = Order.find(query).populate('items.product').populate('customer', 'username');
    
    if (vendor) {
      // Filter orders by vendor's products
      const products = await Product.find({ vendor });
      const productIds = products.map(p => p._id);
      orders = orders.find({ 'items.product': { $in: productIds } });
    }
    
    const result = await orders.exec();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get analytics data
router.get('/analytics', auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['paid', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customer', 'username');
    
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } }
    ]);
    
    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentOrders,
      topProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

module.exports = router; 