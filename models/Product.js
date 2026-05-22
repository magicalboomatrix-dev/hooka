const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 200
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0,
    default: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  images: [{
    type: String
  }],
  mainImage: {
    type: String,
    default: 'assets/images/product_img-1.png'
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  badge: {
    type: String,
    enum: ['New', 'BEST SELLER', 'Offer', 'Sale', 'Hot', ''],
    default: ''
  },
  badgeText: {
    type: String,
    default: ''
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  specifications: [{
    label: String,
    value: String
  }],
  // Additional fields for detail page
  warranty: {
    type: String,
    default: '1 Year Warranty'
  },
  returnPolicy: {
    type: String,
    default: '30 Day Return Policy'
  },
  cashOnDelivery: {
    type: Boolean,
    default: true
  },
  featureBoxes: [{
    icon: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' }
  }],
  primaryImageIndex: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate slug and calculate discount before validation
productSchema.pre('validate', function(next) {
  // Generate slug from name
  if (this.name && (!this.slug || this.isModified('name'))) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  
  // Calculate discount percentage
  if (this.comparePrice > 0 && this.comparePrice > this.price) {
    this.discount = Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  } else {
    this.discount = 0;
  }
  
  next();
});

// Virtual for discount display
productSchema.virtual('discountDisplay').get(function() {
  return this.discount > 0 ? `${this.discount}% Off` : '';
});

// Method to get primary image
productSchema.methods.getPrimaryImage = function() {
  if (this.images && this.images.length > 0) {
    return this.images[this.primaryImageIndex] || this.images[0];
  }
  return this.mainImage || 'assets/images/product_img-1.png';
};

module.exports = mongoose.model('Product', productSchema);
