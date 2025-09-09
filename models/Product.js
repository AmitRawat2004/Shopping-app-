const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  imageUrl: { type: String },
  images: [{ type: String }], // Array of image paths or URLs
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  offer: { type: Number, default: 0 }, // Discount percentage
  category: { type: String, default: 'general' },
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema); 