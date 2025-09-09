const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Customer places an order
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can place orders' });
    }
    const { items, shippingAddress } = req.body; // items: [{ product, quantity }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      // Apply offer/discount if any
      const discount = product.offer || 0;
      const price = product.price * (1 - discount / 100);
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        priceAtPurchase: price,
      });
      total += price * item.quantity;
      
      // Update stock
      await Product.findByIdAndUpdate(product._id, { stock: product.stock - item.quantity });
    }
    const order = new Order({
      customer: user._id,
      items: orderItems,
      total,
      shippingAddress,
    });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error placing order' });
  }
});

// Get single order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const order = await Order.findById(req.params.id).populate('items.product').populate('customer', 'username');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user can view this order
    if (user.role === 'customer' && order.customer._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (user.role === 'vendor') {
      // Check if vendor has products in this order
      const productIds = order.items.map(item => item.product._id);
      const vendorProducts = await Product.find({ vendor: user._id, _id: { $in: productIds } });
      if (vendorProducts.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// Update order (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update orders' });
    }
    
    const { status, total, shippingAddress } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, total, shippingAddress },
      { new: true, runValidators: true }
    ).populate('items.product').populate('customer', 'username');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order' });
  }
});

// Cancel order
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check permissions
    if (user.role === 'customer' && order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (user.role === 'vendor') {
      const productIds = order.items.map(item => item.product);
      const vendorProducts = await Product.find({ vendor: user._id, _id: { $in: productIds } });
      if (vendorProducts.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Only allow cancellation if order is pending or paid
    if (!['pending', 'paid'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    
    // Restore stock if order is cancelled
    if (order.status === 'paid') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }
    
    order.status = 'cancelled';
    await order.save();
    
    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling order' });
  }
});

// Get orders by status
router.get('/status/:status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const { status } = req.params;
    
    let query = { status };
    
    if (user.role === 'customer') {
      query.customer = user._id;
    } else if (user.role === 'vendor') {
      const products = await Product.find({ vendor: user._id });
      const productIds = products.map(p => p._id);
      query['items.product'] = { $in: productIds };
    }
    
    const orders = await Order.find(query).populate('items.product').populate('customer', 'username');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders by status' });
  }
});

// Customer: view their orders
router.get('/mine', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can view their orders' });
    }
    const orders = await Order.find({ customer: user._id }).populate('items.product');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your orders' });
  }
});

// Vendor: view orders for their products
router.get('/vendor', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can view their orders' });
    }
    // Find all products by this vendor
    const products = await Product.find({ vendor: user._id });
    const productIds = products.map(p => p._id);
    // Find all orders containing these products
    const orders = await Order.find({ 'items.product': { $in: productIds } }).populate('items.product').populate('customer', 'username');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor orders' });
  }
});

// Customer marks order as paid (simulate payment)
router.patch('/:id/pay', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can pay for orders' });
    }
    const order = await Order.findOne({ _id: req.params.id, customer: user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order is not pending' });
    }
    order.status = 'paid';
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// Vendor updates order status (shipped, delivered, cancelled)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can update order status' });
    }
    const { status } = req.body;
    const validStatuses = ['shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    // Vendor can only update orders for their products
    const products = await Product.find({ vendor: user._id });
    const productIds = products.map(p => p._id);
    const order = await Order.findOne({ _id: req.params.id, 'items.product': { $in: productIds } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found or not related to your products' });
    }
    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status' });
  }
});

module.exports = router; 