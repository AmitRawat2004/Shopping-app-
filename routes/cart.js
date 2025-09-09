const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get current user's cart
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can use cart' });
    }
    let cart = await Cart.findOne({ customer: user._id }).populate('items.product');
    if (!cart) cart = new Cart({ customer: user._id, items: [] });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart' });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can use cart' });
    }
    const { product, quantity } = req.body;
    if (!product || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Product and valid quantity required' });
    }
    let cart = await Cart.findOne({ customer: user._id });
    if (!cart) cart = new Cart({ customer: user._id, items: [] });
    const itemIndex = cart.items.findIndex(i => i.product.toString() === product);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product, quantity });
    }
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error adding to cart' });
  }
});

// Remove item from cart
router.post('/remove', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can use cart' });
    }
    const { product } = req.body;
    let cart = await Cart.findOne({ customer: user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    cart.items = cart.items.filter(i => i.product.toString() !== product);
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error removing from cart' });
  }
});

// Clear cart
router.post('/clear', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can use cart' });
    }
    let cart = await Cart.findOne({ customer: user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    cart.items = [];
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error clearing cart' });
  }
});

module.exports = router; 