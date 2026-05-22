# Desi Hookah - Dynamic E-Commerce Platform

A full-stack e-commerce application with Node.js backend, MongoDB database, and a professional admin panel.

## Features

- **Dynamic Product Management**: Products and categories stored in MongoDB
- **Professional Admin Panel**: Built with EJS templates with authentication
- **RESTful API**: Complete CRUD operations for products and categories
- **Image Uploads**: Multer for handling product and category images
- **Responsive Design**: Mobile-friendly frontend

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (MongoDB Atlas compatible)
- **Template Engine**: EJS
- **Authentication**: Express Session + bcrypt
- **File Uploads**: Multer
- **Frontend**: HTML, CSS, JavaScript (vanilla)

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Environment Variables:**
Edit `.env` file with your MongoDB Atlas connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/desihookah?retryWrites=true&w=majority
SESSION_SECRET=your_secret_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
PORT=3000
```

3. **Run the application:**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

4. **Access the application:**
- Website: http://localhost:3000
- Admin Panel: http://localhost:3000/admin
- Default Login: admin / admin123

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/featured` - Get featured products
- `GET /api/products/:id` - Get single product
- `GET /api/products/slug/:slug` - Get product by slug
- `GET /api/products/category/:categorySlug` - Get products by category

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `GET /api/categories/slug/:slug` - Get category by slug

## Admin Panel Features

### Dashboard
- Overview statistics (total products, categories, featured items, out of stock)
- Recently added products list
- Quick action buttons

### Products Management
- Add/Edit/Delete products
- Product images upload
- Stock management
- Price and discount management
- Featured products toggle
- Badge system (New, Best Seller, Offer, Sale, Hot)

### Categories Management
- Add/Edit/Delete categories
- Category images upload
- Display order management
- Active/Inactive toggle

## Project Structure

```
theme3/
├── models/           # Mongoose models
│   ├── Product.js
│   └── Category.js
├── routes/         # Express routes
│   ├── admin.js
│   ├── categories.js
│   └── products.js
├── views/          # EJS templates
│   ├── admin/
│   │   ├── layout.ejs
│   │   ├── login.ejs
│   │   ├── dashboard.ejs
│   │   ├── products.ejs
│   │   ├── product-form.ejs
│   │   ├── categories.ejs
│   │   └── category-form.ejs
│   └── layout.ejs
├── uploads/        # Uploaded images
├── public/         # Static files
├── server.js       # Main server file
├── package.json
├── .env           # Environment variables
└── README.md
```

## MongoDB Setup

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Replace the placeholder in `.env` file

## Security Notes

- Change default admin credentials in production
- Use strong session secret
- Enable MongoDB authentication
- Set up proper CORS policies for production
- Use HTTPS in production

## License

MIT License
