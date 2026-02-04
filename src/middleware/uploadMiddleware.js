const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create user images directory
const userImagesDir = path.join(uploadsDir, 'users');
if (!fs.existsSync(userImagesDir)) {
  fs.mkdirSync(userImagesDir, { recursive: true });
}

// Create payment screenshots directory
const paymentScreenshotsDir = path.join(uploadsDir, 'payment-screenshots');
if (!fs.existsSync(paymentScreenshotsDir)) {
  fs.mkdirSync(paymentScreenshotsDir, { recursive: true });
}

// Configure storage for user images
const userStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, userImagesDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId_timestamp.ext
    const userId = req.params.id || 'new';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${userId}_${timestamp}${ext}`);
  }
});

// Configure storage for payment screenshots
const paymentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, paymentScreenshotsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: payment_timestamp.ext
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `payment_${timestamp}_${randomStr}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'));
  }
};

// Configure multer for user images
const userUpload = multer({
  storage: userStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Configure multer for payment screenshots
const paymentUpload = multer({
  storage: paymentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Middleware to handle single image upload for users
const uploadUserImage = userUpload.single('image');

// Wrapper to handle multer errors
const handleImageUpload = (req, res, next) => {
  uploadUserImage(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File too large. Maximum size is 5MB.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: `Upload error: ${err.message}` 
      });
    } else if (err) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    next();
  });
};

// Function to delete old image file
const deleteImageFile = (imagePath) => {
  if (imagePath) {
    const fullPath = path.join(__dirname, '../../', imagePath);
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error('Error deleting old image:', err);
      } else {
        console.log('Old image deleted:', fullPath);
      }
    });
  }
};

module.exports = {
  handleImageUpload,
  deleteImageFile,
  uploadsDir,
  userImagesDir,
  paymentScreenshotsDir,
  // Export multer instances for flexible use
  upload: paymentUpload, // Default export for payment screenshots
  userUpload,
  paymentUpload
};