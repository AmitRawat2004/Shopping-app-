const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Create category (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    
    const { name, description, imageUrl, parentCategory } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    const category = new Category({
      name,
      description,
      imageUrl,
      parentCategory: parentCategory || null
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
});

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { parent, includeProducts = false } = req.query;
    let query = {};
    
    if (parent === 'null' || parent === '') {
      query.parentCategory = null;
    } else if (parent) {
      query.parentCategory = parent;
    }
    
    let categories = Category.find(query).sort({ name: 1 });
    
    if (includeProducts === 'true') {
      categories = categories.populate('productCount');
    }
    
    const result = await categories.exec();
    
    // Add product count if requested
    if (includeProducts === 'true') {
      for (let category of result) {
        const count = await Product.countDocuments({ category: category._id });
        category.productCount = count;
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeProducts = false } = req.query;
    
    let category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    if (includeProducts === 'true') {
      const products = await Product.find({ category: id }).populate('vendor', 'username');
      category = category.toObject();
      category.products = products;
    }
    
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Error fetching category' });
  }
});

// Update category (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    
    const { id } = req.params;
    const { name, description, imageUrl, parentCategory, isActive } = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description, imageUrl, parentCategory, isActive },
      { new: true, runValidators: true }
    );
    
    res.json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Error updating category' });
  }
});

// Delete category (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    
    const { id } = req.params;
    
    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with products. Please move or delete products first.',
        productCount 
      });
    }
    
    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parentCategory: id });
    if (subcategoryCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with subcategories. Please delete subcategories first.',
        subcategoryCount 
      });
    }
    
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully', category });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Get category hierarchy (tree structure)
router.get('/hierarchy/tree', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    
    // Build tree structure
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => cat.parentCategory?.toString() === parentId?.toString())
        .map(cat => ({
          ...cat.toObject(),
          children: buildTree(cat._id)
        }));
    };
    
    const categoryTree = buildTree();
    res.json(categoryTree);
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({ message: 'Error fetching category hierarchy' });
  }
});

// Get products by category
router.get('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    
    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Get all subcategories recursively
    const getAllSubcategories = async (categoryId) => {
      const subcategories = await Category.find({ parentCategory: categoryId });
      let allCategories = [categoryId];
      
      for (const sub of subcategories) {
        const subIds = await getAllSubcategories(sub._id);
        allCategories = allCategories.concat(subIds);
      }
      
      return allCategories;
    };
    
    const categoryIds = await getAllSubcategories(id);
    
    let query = Product.find({ category: { $in: categoryIds } }).populate('vendor', 'username');
    
    // Sorting
    switch (sort) {
      case 'price_asc':
        query = query.sort({ price: 1 });
        break;
      case 'price_desc':
        query = query.sort({ price: -1 });
        break;
      case 'newest':
        query = query.sort({ createdAt: -1 });
        break;
      case 'oldest':
        query = query.sort({ createdAt: 1 });
        break;
      case 'name_asc':
        query = query.sort({ name: 1 });
        break;
      case 'name_desc':
        query = query.sort({ name: -1 });
        break;
      default:
        query = query.sort({ createdAt: -1 });
    }
    
    const total = await Product.countDocuments({ category: { $in: categoryIds } });
    const products = await query
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    res.json({
      products,
      category,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ message: 'Error fetching category products' });
  }
});

module.exports = router; 