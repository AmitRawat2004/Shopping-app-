const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth'); // Import auth routes
const profileRoutes = require('./routes/profile'); // Import profile routes
const productRoutes = require('./routes/product'); // Import product routes
const orderRoutes = require('./routes/order'); // Import order routes
const cartRoutes = require('./routes/cart'); // Import cart routes
const adminRoutes = require('./routes/admin'); // Import admin routes
const notificationRoutes = require('./routes/notifications'); // Import notification routes
const paymentRoutes = require('./routes/payment'); // Import payment routes
const shippingRoutes = require('./routes/shipping'); // Import shipping routes
const categoryRoutes = require('./routes/category'); // Import category routes
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api/auth', authRoutes); // Use auth routes
app.use('/api/profile', profileRoutes);// Use profile routes
app.use('/api/products', productRoutes); // Use product routes
app.use('/api/orders', orderRoutes); // Use order routes
app.use('/api/cart', cartRoutes); // Use cart routes
app.use('/api/admin', adminRoutes); // Use admin routes
app.use('/api/notifications', notificationRoutes); // Use notification routes
app.use('/api/payments', paymentRoutes); // Use payment routes
app.use('/api/shipping', shippingRoutes); // Use shipping routes
app.use('/api/categories', categoryRoutes); // Use category routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploads statically

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });

app.get('/', (req, res) => {
  res.send('Backend is running!');
}); 