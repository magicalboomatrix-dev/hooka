const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/desihookah?retryWrites=true&w=majority';

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
      console.log('   Username: admin');
      console.log('   Email: admin@desihookah.com');
      console.log('\nTo reset password, delete the admin from database and run seed again.');
      process.exit(0);
    }

    // Create default admin
    const admin = new Admin({
      username: 'admin',
      email: 'admin@desihookah.com',
      password: 'admin123', // This will be hashed automatically
      name: 'Administrator',
      role: 'superadmin'
    });

    await admin.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@desihookah.com');
    console.log('');
    console.log('⚠️  Please change the default password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
}

// Run seed
seedAdmin();
