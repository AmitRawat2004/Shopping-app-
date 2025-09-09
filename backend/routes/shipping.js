const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Calculate shipping cost
router.post('/calculate', auth, async (req, res) => {
  try {
    const { items, destination, shippingMethod = 'standard' } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }
    
    if (!destination) {
      return res.status(400).json({ message: 'Destination address is required' });
    }
    
    // Calculate total weight and dimensions
    let totalWeight = 0;
    let totalValue = 0;
    
    for (const item of items) {
      // Simulate product weight (in kg) - replace with actual product data
      const itemWeight = 0.5; // Default weight per item
      totalWeight += itemWeight * item.quantity;
      totalValue += (item.price || 0) * item.quantity;
    }
    
    // Shipping rates based on method and destination
    const shippingRates = {
      standard: {
        base: 5.99,
        perKg: 2.50,
        maxDays: 7
      },
      express: {
        base: 12.99,
        perKg: 4.00,
        maxDays: 3
      },
      overnight: {
        base: 24.99,
        perKg: 6.00,
        maxDays: 1
      }
    };
    
    const rate = shippingRates[shippingMethod] || shippingRates.standard;
    const shippingCost = rate.base + (totalWeight * rate.perKg);
    
    // Apply free shipping for orders over $50
    const finalShippingCost = totalValue > 50 ? 0 : shippingCost;
    
    res.json({
      shippingCost: finalShippingCost,
      estimatedDays: rate.maxDays,
      shippingMethod,
      totalWeight: totalWeight.toFixed(2),
      freeShipping: totalValue > 50
    });
  } catch (error) {
    console.error('Shipping calculation error:', error);
    res.status(500).json({ message: 'Error calculating shipping' });
  }
});

// Get available shipping methods
router.get('/methods', async (req, res) => {
  try {
    const shippingMethods = [
      {
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-7 business days',
        basePrice: 5.99,
        perKgPrice: 2.50
      },
      {
        id: 'express',
        name: 'Express Shipping',
        description: '2-3 business days',
        basePrice: 12.99,
        perKgPrice: 4.00
      },
      {
        id: 'overnight',
        name: 'Overnight Shipping',
        description: 'Next business day',
        basePrice: 24.99,
        perKgPrice: 6.00
      }
    ];
    
    res.json(shippingMethods);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shipping methods' });
  }
});

// Track delivery
router.get('/track/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = await User.findById(req.user.userId);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check permissions
    if (user.role === 'customer' && order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Simulate tracking information (replace with actual tracking service)
    const trackingInfo = {
      orderId: orderId,
      trackingNumber: order.trackingNumber || `TRK${orderId.slice(-8).toUpperCase()}`,
      status: order.status,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      updates: [
        {
          status: 'Order Placed',
          location: 'Warehouse',
          timestamp: order.createdAt,
          description: 'Order has been placed and is being processed'
        },
        {
          status: 'Processing',
          location: 'Warehouse',
          timestamp: new Date(order.createdAt.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          description: 'Order is being prepared for shipment'
        }
      ]
    };
    
    // Add more updates based on order status
    if (order.status === 'shipped') {
      trackingInfo.updates.push({
        status: 'Shipped',
        location: destination,
        timestamp: new Date(order.updatedAt),
        description: 'Package has been shipped'
      });
    }
    
    if (order.status === 'delivered') {
      trackingInfo.updates.push({
        status: 'Delivered',
        location: destination,
        timestamp: new Date(order.updatedAt),
        description: 'Package has been delivered'
      });
    }
    
    res.json(trackingInfo);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ message: 'Error fetching tracking information' });
  }
});

// Save shipping address
router.post('/address', auth, async (req, res) => {
  try {
    const { 
      street, 
      city, 
      state, 
      zipCode, 
      country, 
      phone, 
      isDefault = false 
    } = req.body;
    
    if (!street || !city || !state || !zipCode || !country) {
      return res.status(400).json({ message: 'All address fields are required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const address = {
      street,
      city,
      state,
      zipCode,
      country,
      phone,
      isDefault
    };
    
    // If this is the first address or marked as default, set it as default
    if (!user.addresses || user.addresses.length === 0 || isDefault) {
      if (user.addresses) {
        user.addresses.forEach(addr => addr.isDefault = false);
      }
      address.isDefault = true;
    }
    
    if (!user.addresses) {
      user.addresses = [];
    }
    
    user.addresses.push(address);
    await user.save();
    
    res.json({
      message: 'Shipping address saved successfully',
      address
    });
  } catch (error) {
    console.error('Save address error:', error);
    res.status(500).json({ message: 'Error saving shipping address' });
  }
});

// Get user's shipping addresses
router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.addresses || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching addresses' });
  }
});

// Update shipping address
router.put('/addresses/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      street, 
      city, 
      state, 
      zipCode, 
      country, 
      phone, 
      isDefault = false 
    } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user || !user.addresses) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === id);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Update address
    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      street,
      city,
      state,
      zipCode,
      country,
      phone,
      isDefault
    };
    
    // If marked as default, update other addresses
    if (isDefault) {
      user.addresses.forEach((addr, index) => {
        if (index !== addressIndex) {
          addr.isDefault = false;
        }
      });
    }
    
    await user.save();
    
    res.json({
      message: 'Address updated successfully',
      address: user.addresses[addressIndex]
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Error updating address' });
  }
});

// Delete shipping address
router.delete('/addresses/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(req.user.userId);
    if (!user || !user.addresses) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === id);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    const deletedAddress = user.addresses[addressIndex];
    user.addresses.splice(addressIndex, 1);
    
    // If deleted address was default and there are other addresses, set first as default
    if (deletedAddress.isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    
    await user.save();
    
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Error deleting address' });
  }
});

// Set default shipping address
router.patch('/addresses/:id/default', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(req.user.userId);
    if (!user || !user.addresses) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === id);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Set all addresses as non-default
    user.addresses.forEach(addr => addr.isDefault = false);
    
    // Set selected address as default
    user.addresses[addressIndex].isDefault = true;
    
    await user.save();
    
    res.json({
      message: 'Default address updated successfully',
      address: user.addresses[addressIndex]
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ message: 'Error setting default address' });
  }
});

module.exports = router; 