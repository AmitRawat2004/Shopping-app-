const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create payment intent
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { orderId, amount, currency = 'USD' } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ message: 'Order ID and amount are required' });
    }

    const user = await User.findById(req.user.userId);
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order is not pending payment' });
    }
    
    // Simulate payment intent creation (replace with actual payment gateway)
    const paymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount * 100, // Convert to cents
      currency: currency,
      status: 'requires_payment_method',
      orderId: orderId,
      clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`
    };
    
    res.json({
      paymentIntent,
      message: 'Payment intent created successfully'
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
});

// Confirm payment
router.post('/confirm', auth, async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    
    if (!paymentIntentId || !orderId) {
      return res.status(400).json({ message: 'Payment intent ID and order ID are required' });
    }
    
    const user = await User.findById(req.user.userId);
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Simulate payment confirmation (replace with actual payment gateway)
    order.status = 'paid';
    order.paymentStatus = 'paid';
    order.paymentMethod = 'card';
    await order.save();
    
    res.json({
      message: 'Payment confirmed successfully',
      order: {
        id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
});

// Process refund
router.post('/refund', auth, async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ message: 'Order ID and amount are required' });
    }
    
    const user = await User.findById(req.user.userId);
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Only admin or the customer can request refund
    if (user.role !== 'admin' && order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Order is not paid' });
    }
    
    if (amount > order.total) {
      return res.status(400).json({ message: 'Refund amount cannot exceed order total' });
    }
    
    // Simulate refund processing (replace with actual payment gateway)
    const refund = {
      id: `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      reason: reason || 'Customer request',
      status: 'succeeded',
      orderId: orderId
    };
    
    // Update order status if full refund
    if (amount === order.total) {
      order.status = 'refunded';
      order.paymentStatus = 'refunded';
    }
    
    await order.save();
    
    res.json({
      refund,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Error processing refund' });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const { page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (user.role === 'customer') {
      query.customer = user._id;
    }
    
    const orders = await Order.find(query)
      .select('_id total status paymentStatus paymentMethod createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('customer', 'username');
    
    const total = await Order.countDocuments(query);
    
    res.json({
      payments: orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
});

// Payment webhook (for payment gateway callbacks)
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // Handle different webhook events
    switch (type) {
      case 'payment_intent.succeeded':
        // Update order status when payment succeeds
        if (data.object.metadata && data.object.metadata.orderId) {
          await Order.findByIdAndUpdate(data.object.metadata.orderId, {
            status: 'paid',
            paymentStatus: 'paid'
          });
        }
        break;
        
      case 'payment_intent.payment_failed':
        // Handle failed payment
        if (data.object.metadata && data.object.metadata.orderId) {
          await Order.findByIdAndUpdate(data.object.metadata.orderId, {
            paymentStatus: 'failed'
          });
        }
        break;
        
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ message: 'Webhook error' });
  }
});

module.exports = router; 