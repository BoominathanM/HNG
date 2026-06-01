const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvy3j1ouq',
  api_key: process.env.CLOUDINARY_API_KEY || '299276731389946',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'CD0HfDM1qA9L-8SHV32nxbeOf8s',
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = req.query.folder || req.body.folder || 'hng-crm';
    const allowedFormats = ['jpg', 'jpeg', 'png', 'pdf', 'svg', 'gif', 'webp'];
    return {
      folder: `HNG-CRM/${folder}`,
      allowed_formats: allowedFormats,
      resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const uploadCloud = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|svg|gif|webp/;
    if (allowed.test(file.mimetype.split('/')[1])) return cb(null, true);
    cb(new Error('Only images and PDF files are allowed'));
  },
});

module.exports = { cloudinary, uploadCloud };
