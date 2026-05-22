const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Admin = require('../models/Admin');
const Setting = require('../models/Setting');
const { storage } = require('../config/cloudinary');

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    res.redirect('/admin-login');
  }
};

// Login handler
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find admin by username
    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    
    if (!admin) {
      req.flash('error_msg', 'Invalid username or password');
      return res.redirect('/admin-login');
    }
    
    // Check if account is locked
    if (admin.isLocked()) {
      req.flash('error_msg', 'Account is locked. Please try again after 2 hours.');
      return res.redirect('/admin-login');
    }
    
    // Check if account is active
    if (!admin.isActive) {
      req.flash('error_msg', 'Account is deactivated. Contact superadmin.');
      return res.redirect('/admin-login');
    }
    
    // Compare password
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      const remainingAttempts = 5 - (admin.loginAttempts + 1);
      if (remainingAttempts > 0) {
        req.flash('error_msg', `Invalid credentials. ${remainingAttempts} attempts remaining.`);
      } else {
        req.flash('error_msg', 'Account locked for 2 hours due to too many failed attempts.');
      }
      return res.redirect('/admin-login');
    }
    
    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await Admin.updateOne(
        { _id: admin._id },
        { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } }
      );
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Set session
    req.session.adminId = admin._id.toString();
    req.session.adminUsername = admin.username;
    req.session.adminName = admin.name;
    req.session.adminRole = admin.role;
    
    req.flash('success_msg', `Welcome back, ${admin.name}!`);
    res.redirect('/admin');
    
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error_msg', 'An error occurred. Please try again.');
    res.redirect('/admin-login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin-login');
  });
});

// Profile page
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    if (!admin) {
      req.flash('error_msg', 'Admin not found');
      return res.redirect('/admin');
    }
    
    res.render('admin/profile', {
      layout: 'admin/layout',
      title: 'My Profile',
      admin
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin');
  }
});

// Change password
router.post('/profile/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/admin/profile');
    }
    
    if (newPassword.length < 6) {
      req.flash('error_msg', 'Password must be at least 6 characters');
      return res.redirect('/admin/profile');
    }
    
    const admin = await Admin.findById(req.session.adminId);
    
    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/admin/profile');
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/admin/profile');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/profile');
  }
});

// Multer upload with Cloudinary storage
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

// Helper to parse specifications from form
const parseSpecifications = (specLabels, specValues) => {
  const specs = [];
  if (Array.isArray(specLabels) && Array.isArray(specValues)) {
    for (let i = 0; i < specLabels.length; i++) {
      if (specLabels[i] && specValues[i]) {
        specs.push({ label: specLabels[i], value: specValues[i] });
      }
    }
  } else if (specLabels && specValues) {
    specs.push({ label: specLabels, value: specValues });
  }
  return specs;
};

// Helper to parse feature boxes from form
const parseFeatureBoxes = (titles, subtitles) => {
  const boxes = [];
  const defaultIcons = ['images/desc-fti1.jpg', 'images/desc-fti2.jpg', 'images/desc-fti3.jpg', 'images/desc-fti4.jpg'];
  if (Array.isArray(titles)) {
    for (let i = 0; i < titles.length; i++) {
      if (titles[i]) {
        boxes.push({
          icon: defaultIcons[i] || '',
          title: titles[i],
          subtitle: subtitles[i] || ''
        });
      }
    }
  } else if (titles) {
    boxes.push({
      icon: defaultIcons[0],
      title: titles,
      subtitle: subtitles || ''
    });
  }
  return boxes;
};

// Dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();
    const featuredCount = await Product.countDocuments({ isFeatured: true });
    const outOfStockCount = await Product.countDocuments({ stock: 0 });
    
    const recentProducts = await Product.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.render('admin/dashboard', {
      layout: 'admin/layout',
      title: 'Dashboard',
      stats: {
        products: productCount,
        categories: categoryCount,
        featured: featuredCount,
        outOfStock: outOfStockCount
      },
      recentProducts
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.render('admin/dashboard', {
      layout: 'admin/layout',
      title: 'Dashboard',
      stats: {},
      recentProducts: []
    });
  }
});

// Categories List
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render('admin/categories', {
      layout: 'admin/layout',
      title: 'Categories',
      categories
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin');
  }
});

// Add Category Page
router.get('/categories/add', requireAuth, (req, res) => {
  res.render('admin/category-form', {
    layout: 'admin/layout',
    title: 'Add Category',
    category: null
  });
});

// Create Category
router.post('/categories', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const categoryData = {
      name: req.body.name,
      description: req.body.description,
      displayOrder: parseInt(req.body.displayOrder) || 0,
      isActive: req.body.isActive === 'on'
    };
    
    if (req.file) {
      categoryData.image = req.file.path;
    }

    const category = new Category(categoryData);
    await category.save();

    req.flash('success_msg', 'Category created successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/categories/add');
  }
});

// Edit Category Page
router.get('/categories/:id/edit', requireAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      req.flash('error_msg', 'Category not found');
      return res.redirect('/admin/categories');
    }
    res.render('admin/category-form', {
      layout: 'admin/layout',
      title: 'Edit Category',
      category
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/categories');
  }
});

// Update Category
router.put('/categories/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const categoryData = {
      name: req.body.name,
      description: req.body.description,
      displayOrder: parseInt(req.body.displayOrder) || 0,
      isActive: req.body.isActive === 'on'
    };
    
    if (req.file) {
      categoryData.image = req.file.path;
    }

    await Category.findByIdAndUpdate(req.params.id, categoryData);
    req.flash('success_msg', 'Category updated successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/categories/' + req.params.id + '/edit');
  }
});

// Delete Category
router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      req.flash('error_msg', 'Cannot delete category with existing products');
      return res.redirect('/admin/categories');
    }
    
    await Category.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Category deleted successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/categories');
  }
});

// Products List
router.get('/products', requireAuth, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    
    const categories = await Category.find({ isActive: true });
    
    res.render('admin/products', {
      layout: 'admin/layout',
      title: 'Products',
      products,
      categories,
      filterCategory: category,
      search
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin');
  }
});

// Add Product Page
router.get('/products/add', requireAuth, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.render('admin/product-form', {
      layout: 'admin/layout',
      title: 'Add Product',
      product: null,
      categories
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/products');
  }
});

// Create Product
router.post('/products', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      shortDescription: req.body.shortDescription,
      price: parseFloat(req.body.price),
      comparePrice: parseFloat(req.body.comparePrice) || 0,
      category: req.body.category,
      stock: parseInt(req.body.stock) || 0,
      sku: req.body.sku,
      badge: req.body.badge || '',
      badgeText: req.body.badgeText || '',
      isActive: req.body.isActive === 'on',
      isFeatured: req.body.isFeatured === 'on',
      warranty: req.body.warranty || '1 Year Warranty',
      returnPolicy: req.body.returnPolicy || '30 Day Return Policy',
      cashOnDelivery: req.body.cashOnDelivery === 'on',
      specifications: parseSpecifications(req.body.specLabel, req.body.specValue),
      featureBoxes: parseFeatureBoxes(req.body.featureTitle, req.body.featureSubtitle),
      primaryImageIndex: parseInt(req.body.primaryImageIndex) || 0
    };

    // Handle multiple images
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(file => file.path);
      productData.mainImage = req.files[productData.primaryImageIndex]?.path || req.files[0].path;
    }

    const product = new Product(productData);
    await product.save();

    req.flash('success_msg', 'Product created successfully');
    res.redirect('/admin/products');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/products/add');
  }
});

// Edit Product Page
router.get('/products/:id/edit', requireAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find({ isActive: true });
    
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/admin/products');
    }
    
    res.render('admin/product-form', {
      layout: 'admin/layout',
      title: 'Edit Product',
      product,
      categories
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/products');
  }
});

// Update Product
router.put('/products/:id', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    // Get existing product to preserve current images if no new ones uploaded
    const existingProduct = await Product.findById(req.params.id);

    const productData = {
      name: req.body.name,
      description: req.body.description,
      shortDescription: req.body.shortDescription,
      price: parseFloat(req.body.price),
      comparePrice: parseFloat(req.body.comparePrice) || 0,
      category: req.body.category,
      stock: parseInt(req.body.stock) || 0,
      sku: req.body.sku,
      badge: req.body.badge || '',
      badgeText: req.body.badgeText || '',
      isActive: req.body.isActive === 'on',
      isFeatured: req.body.isFeatured === 'on',
      warranty: req.body.warranty || '1 Year Warranty',
      returnPolicy: req.body.returnPolicy || '30 Day Return Policy',
      cashOnDelivery: req.body.cashOnDelivery === 'on',
      specifications: parseSpecifications(req.body.specLabel, req.body.specValue),
      featureBoxes: parseFeatureBoxes(req.body.featureTitle, req.body.featureSubtitle),
      primaryImageIndex: parseInt(req.body.primaryImageIndex) || 0
    };

    // Handle images - merge new uploads with existing
    let currentImages = existingProduct.images || [];

    // Remove deleted images
    if (req.body.deleteImages) {
      const deleteIndices = Array.isArray(req.body.deleteImages) ? req.body.deleteImages.map(Number) : [Number(req.body.deleteImages)];
      currentImages = currentImages.filter((_, idx) => !deleteIndices.includes(idx));
    }

    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newImagePaths = req.files.map(file => file.path);
      currentImages = [...currentImages, ...newImagePaths];
    }

    productData.images = currentImages;
    if (currentImages.length > 0) {
      productData.mainImage = currentImages[productData.primaryImageIndex] || currentImages[0];
    }

    await Product.findByIdAndUpdate(req.params.id, productData);
    req.flash('success_msg', 'Product updated successfully');
    res.redirect('/admin/products');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/products/' + req.params.id + '/edit');
  }
});

// Delete Product
router.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Product deleted successfully');
    res.redirect('/admin/products');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/products');
  }
});

// Settings Page
router.get('/settings', requireAuth, async (req, res) => {
  try {
    let whatsappSetting = await Setting.findOne({ key: 'whatsappNumber' });
    const whatsappNumber = whatsappSetting ? whatsappSetting.value : '919876543210';
    
    res.render('admin/settings', {
      layout: 'admin/layout',
      title: 'Settings',
      whatsappNumber
    });
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin');
  }
});

// Update Settings
router.post('/settings', requireAuth, async (req, res) => {
  try {
    const { whatsappNumber } = req.body;
    
    // Strip spaces and + signs to ensure standard format for WhatsApp API
    const cleanNumber = whatsappNumber.replace(/[\s\+]/g, '');
    
    await Setting.findOneAndUpdate(
      { key: 'whatsappNumber' },
      { value: cleanNumber },
      { upsert: true, new: true }
    );
    
    req.flash('success_msg', 'Settings updated successfully');
    res.redirect('/admin/settings');
  } catch (error) {
    req.flash('error_msg', error.message);
    res.redirect('/admin/settings');
  }
});

module.exports = router;
