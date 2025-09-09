const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Multer setup for product images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/products'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Vendor or Admin adds a new product
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || (user.role !== 'vendor' && user.role !== 'admin')) {
      return res.status(403).json({ message: 'Only vendors and admins can add products' });
    }
    const { name, price, description, imageUrl, offer, category, stock } = req.body;
    const product = new Product({
      name,
      price,
      description,
      imageUrl,
      vendor: user._id, // For admin, this will be their own user ID unless you want to allow specifying vendor
      offer: offer || 0,
      category: category || 'general',
      stock: stock || 0,
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error adding product' });
  }
});

// Customer or anyone: list all products
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    let products = Product.find(query).populate('vendor', 'username');
    
    // Sorting
    if (sort) {
      switch (sort) {
        case 'price_asc':
          products = products.sort({ price: 1 });
          break;
        case 'price_desc':
          products = products.sort({ price: -1 });
          break;
        case 'newest':
          products = products.sort({ createdAt: -1 });
          break;
        case 'oldest':
          products = products.sort({ createdAt: 1 });
          break;
      }
    }
    
    const result = await products.exec();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor', 'username');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// Search products
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).populate('vendor', 'username');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error searching products' });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category }).populate('vendor', 'username');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products by category' });
  }
});

// Get products by vendor
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const products = await Product.find({ vendor: vendorId }).populate('vendor', 'username');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor products' });
  }
});

// Vendor: list their own products
router.get('/mine', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can view their products' });
    }
    const products = await Product.find({ vendor: user._id });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your products' });
  }
});

// Vendor or Admin updates product (PUT)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || (user.role !== 'vendor' && user.role !== 'admin')) {
      return res.status(403).json({ message: 'Only vendors and admins can update products' });
    }
    const { name, price, description, imageUrl, offer, category, stock } = req.body;
    let product;
    if (user.role === 'vendor') {
      // Vendor can only update their own products
      product = await Product.findOneAndUpdate(
        { _id: req.params.id, vendor: user._id },
        { name, price, description, imageUrl, offer, category, stock },
        { new: true, runValidators: true }
      );
    } else if (user.role === 'admin') {
      // Admin can update any product
      product = await Product.findByIdAndUpdate(
        req.params.id,
        { name, price, description, imageUrl, offer, category, stock },
        { new: true, runValidators: true }
      );
    }
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Vendor/Admin deletes product
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || (user.role !== 'vendor' && user.role !== 'admin')) {
      return res.status(403).json({ message: 'Only vendors and admins can delete products' });
    }
    
    let product;
    if (user.role === 'vendor') {
      // Vendor can only delete their own products
      product = await Product.findOneAndDelete({ _id: req.params.id, vendor: user._id });
    } else if (user.role === 'admin') {
      // Admin can delete any product
      product = await Product.findByIdAndDelete(req.params.id);
    }
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// Update product stock
router.patch('/:id/stock', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can update stock' });
    }
    
    const { stock } = req.body;
    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ message: 'Stock must be a non-negative number' });
    }
    
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: user._id },
      { stock },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock' });
  }
});

// Get out of stock products
router.get('/out-of-stock', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can view stock alerts' });
    }
    
    const products = await Product.find({ 
      vendor: user._id, 
      stock: { $lte: 5 } 
    });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock alerts' });
  }
});

// Vendor updates offer/discount on their product
router.patch('/:id/offer', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can update offers' });
    }
    const { offer } = req.body;
    if (typeof offer !== 'number' || offer < 0 || offer > 100) {
      return res.status(400).json({ message: 'Offer must be a number between 0 and 100' });
    }
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, vendor: user._id },
      { offer },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating offer' });
  }
});

// Vendor uploads product images
router.post('/:id/images', auth, upload.array('images', 5), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can upload images' });
    }
    const product = await Product.findOne({ _id: req.params.id, vendor: user._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }
    const imagePaths = req.files.map(file => '/uploads/products/' + file.filename);
    product.images = product.images.concat(imagePaths);
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading images' });
  }
});

module.exports = router; 