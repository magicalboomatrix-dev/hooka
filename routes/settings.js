const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// GET all settings (public)
router.get('/', async (req, res) => {
  try {
    const settingsList = await Setting.find();
    const settings = settingsList.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    
    // Default fallback if not found in db
    if (!settings.whatsappNumber) {
      settings.whatsappNumber = '919876543210';
    }
    
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const setting = await Setting.findOne({ key });
    let value = setting ? setting.value : null;
    
    // Default fallback for whatsappNumber
    if (key === 'whatsappNumber' && !value) {
      value = '919876543210';
    }
    
    res.json({ success: true, key, value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
