const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer storage and file name
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'images');
    },
    filename: (req, file, cb) => {
      cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
    }
  });

  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}
  
  // Create multer upload instance
  const upload = multer({ storage: storage, fileFilter: fileFilter });
  
  // Custom file upload middleware
  module.exports = (req, res, next) => {
    // Use multer upload instance
    upload.array('product_images', 5)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
  
      // Retrieve uploaded files
      const files = req.files;
      const errors = [];
  
      // Validate file types and sizes
    //   files.forEach((file) => {
    //     const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg', 'image/jpg'];
    //     const maxSize = 5 * 1024 * 1024; // 5MB
  
    //     if (!allowedTypes.includes(file.mimetype)) {
    //       errors.push(`Invalid file type: ${file.originalname}`);
    //     }
  
    //     if (file.size > maxSize) {
    //       errors.push(`File too large: ${file.originalname}`);
    //     }
    //   });
  
      // Handle validation errors
      if (errors.length > 0) {
        // Remove uploaded files
        files.forEach((file) => {
          fs.unlinkSync(file.path);
        });
  
        return res.status(400).json({ errors });
      }
  
      // Attach files to the request object
      req.files = files;
  
      // Proceed to the next middleware or route handler
      next();
    });
  };
  