# Jusplay E-commerce Backend API

A comprehensive Node.js/Express.js backend for a full-featured e-commerce platform with authentication, product management, orders, payments, shipping, and admin functionality.

## 📁 Project Structure

```
backend/
├── 📁 models/                 # Database models (MongoDB/Mongoose)
│   ├── User.js               # User model with addresses, notifications
│   ├── Product.js            # Product model with category, stock, specifications
│   ├── Order.js              # Order model with shipping, payment info
│   ├── Cart.js               # Cart model for shopping cart
│   └── Category.js           # Category model with hierarchy
├── 📁 routes/                # API route handlers
│   ├── auth.js               # Authentication routes (register, login, logout)
│   ├── profile.js            # User profile management
│   ├── product.js            # Product CRUD operations
│   ├── order.js              # Order management
│   ├── cart.js               # Shopping cart operations
│   ├── admin.js              # Admin dashboard and user management
│   ├── notifications.js      # Notification system
│   ├── payment.js            # Payment processing
│   ├── shipping.js           # Shipping and delivery
│   └── category.js           # Category management
├── 📁 middleware/            # Custom middleware
│   └── auth.js               # JWT authentication middleware
├── 📁 uploads/               # File uploads directory
│   └── products/             # Product images
├── 📄 index.js               # Main server file
├── 📄 package.json           # Dependencies and scripts
├── 📄 .env                   # Environment variables
└── 📄 README.md              # This documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/jusplay
JWT_SECRET=your_jwt_secret_key_here
PORT=3000
```

3. **Start the server:**
```bash
npm start
```

The server will run on `http://localhost:3000`

## 🔐 Authentication

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

**Note:** The `phone` field is required for registration.

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## 👤 Profile Management

### Get User Profile
```http
GET /api/profile
Authorization: Bearer <token>
```

### Update Profile
```http
PATCH /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "phone": "1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

## 🛍️ Products

### Get All Products
```http
GET /api/products?page=1&limit=10&sort=-createdAt
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sort`: Sort order (`-createdAt`, `price`, `-price`, etc.)
- `category`: Filter by category ID
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter

### Search Products
```http
GET /api/products/search?q=iphone&category=electronics&minPrice=500&maxPrice=1000
```

### Get Product by ID
```http
GET /api/products/60f7b3b3b3b3b3b3b3b3b3b3
```

## 🛍️ Product Management Permissions

| Action   | Vendor         | Admin  |
|----------|----------------|--------|
| Add      | Yes (own)      | Yes    |
| Update   | Yes (own)      | Yes    |
| Delete   | Yes (own)      | Yes    |

- **Admins have full authority to add, update, and delete any product.**
- **Vendors can add, update, and delete only their own products.**

### Add Product (Vendor or Admin)
```http
POST /api/products
Authorization: Bearer <vendor_or_admin_token>
Content-Type: application/json

{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone with advanced features",
  "price": 999,
  "category": "60f7b3b3b3b3b3b3b3b3b3b3",
  "stock": 50,
  "images": ["image1.jpg", "image2.jpg"],
  "specifications": {
    "color": "Titanium",
    "storage": "256GB",
    "screen": "6.1 inch"
  }
}
```

### Update Product (Vendor or Admin)
```http
PUT /api/products/:id
Authorization: Bearer <vendor_or_admin_token>
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 1099
}
```
- Vendors can update only their own products.
- Admins can update any product.

### Delete Product (Vendor or Admin)
```http
DELETE /api/products/:id
Authorization: Bearer <vendor_or_admin_token>
```
- Vendors can delete only their own products.
- Admins can delete any product.

## 📦 Orders

### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product": "60f7b3b3b3b3b3b3b3b3b3b3",
      "quantity": 2,
      "price": 999
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "card"
}
```

### Get User Orders
```http
GET /api/orders?page=1&limit=10
Authorization: Bearer <token>
```

### Get Order by ID
```http
GET /api/orders/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

### Update Order Status (Admin Only)
```http
PATCH /api/orders/60f7b3b3b3b3b3b3b3b3b3b3/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "TRK123456789"
}
```

### Cancel Order
```http
PATCH /api/orders/60f7b3b3b3b3b3b3b3b3b3b3/cancel
Authorization: Bearer <token>
```

## 🛒 Cart

### Get Cart
```http
GET /api/cart
Authorization: Bearer <token>
```

### Add to Cart
```http
POST /api/cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "quantity": 1
}
```

### Update Cart Item
```http
PATCH /api/cart/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "quantity": 3
}
```

### Remove from Cart
```http
DELETE /api/cart/remove/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

### Clear Cart
```http
DELETE /api/cart/clear
Authorization: Bearer <token>
```

## 📂 Categories

### Get All Categories
```http
GET /api/categories
```

### Get Category by ID
```http
GET /api/categories/60f7b3b3b3b3b3b3b3b3b3b3
```

### Create Category (Admin Only)
```http
POST /api/categories
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Electronics",
  "description": "Electronic devices and gadgets",
  "parentId": null,
  "image": "electronics.jpg"
}
```

### Update Category (Admin Only)
```http
PATCH /api/categories/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Electronics",
  "description": "Updated description"
}
```

### Delete Category (Admin Only)
```http
DELETE /api/categories/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <admin_token>
```

## 💳 Payments

### Create Payment Intent
```http
POST /api/payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 999,
  "currency": "usd",
  "orderId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "paymentMethod": "card"
}
```

### Confirm Payment
```http
POST /api/payments/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890",
  "orderId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

### Get Payment History
```http
GET /api/payments/history?page=1&limit=10
Authorization: Bearer <token>
```

### Refund Payment
```http
POST /api/payments/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "amount": 999,
  "reason": "Customer request"
}
```

## 🚚 Shipping

### Calculate Shipping Cost
```http
POST /api/shipping/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "60f7b3b3b3b3b3b3b3b3b3b3",
      "quantity": 2,
      "weight": 0.5
    }
  ],
  "destination": {
    "zipCode": "10001",
    "country": "USA"
  },
  "shippingMethod": "standard"
}
```

### Track Shipment
```http
GET /api/shipping/track/TRK123456789
Authorization: Bearer <token>
```

### Get Shipping Addresses
```http
GET /api/shipping/addresses
Authorization: Bearer <token>
```

### Add Shipping Address
```http
POST /api/shipping/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "street": "456 Oak Ave",
  "city": "Los Angeles",
  "state": "CA",
  "zipCode": "90210",
  "country": "USA",
  "isDefault": true
}
```

## 🔔 Notifications

### Get Notifications
```http
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>
```

### Mark as Read
```http
PATCH /api/notifications/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationIds": ["60f7b3b3b3b3b3b3b3b3b3b3", "60f7b3b3b3b3b3b3b3b3b3b4"]
}
```

### Delete Notification
```http
DELETE /api/notifications/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

## 👨‍💼 Admin Endpoints

### Get All Users (Admin Only)
```http
GET /api/admin/users?page=1&limit=20
Authorization: Bearer <admin_token>
```

### Block User (Admin Only)
```http
PATCH /api/admin/users/60f7b3b3b3b3b3b3b3b3b3b3/block
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Violation of terms"
}
```

### Unblock User (Admin Only)
```http
PATCH /api/admin/users/60f7b3b3b3b3b3b3b3b3b3b3/unblock
Authorization: Bearer <admin_token>
```

### Get All Orders (Admin Only)
```http
GET /api/admin/orders?page=1&limit=20&status=pending
Authorization: Bearer <admin_token>
```

## 🔧 Error Handling

All endpoints return consistent error responses:

```json
{
  "message": "Error description",
  "status": "error"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## 📝 Environment Variables

Create a `.env` file with the following variables:

```env
MONGODB_URI=mongodb://localhost:27017/jusplay
JWT_SECRET=your_jwt_secret_key_here
PORT=3000
NODE_ENV=development
```

## 🛠️ Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **multer**: File upload handling
- **dotenv**: Environment variables
- **body-parser**: Request body parsing

## 📊 Database Models

### User Model
- Basic info (name, email, password)
- Addresses array
- Notifications array
- Role (user/admin)
- Account status

### Product Model
- Basic info (name, description, price)
- Category reference
- Stock quantity
- Images array
- Specifications object

### Order Model
- User reference
- Items array
- Shipping address
- Payment information
- Status tracking
- Timestamps

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use a production MongoDB instance
3. Set a strong JWT_SECRET
4. Configure proper CORS settings
5. Set up SSL/TLS certificates
6. Use a process manager like PM2

### PM2 Configuration
```bash
npm install -g pm2
pm2 start index.js --name "jusplay-backend"
pm2 save
pm2 startup
```

## 📞 Support

For issues and questions:
1. Check the error logs
2. Verify environment variables
3. Ensure MongoDB is running
4. Check API endpoint documentation

## 📄 License

This project is licensed under the MIT License. 