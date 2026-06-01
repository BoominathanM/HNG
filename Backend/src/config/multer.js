const { uploadCloud } = require('./cloudinary');

// Single shared multer instance backed by Cloudinary.
// All existing routes using require('../../config/multer') automatically
// upload to Cloudinary — no other route files need to change.
module.exports = uploadCloud;
