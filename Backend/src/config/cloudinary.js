const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

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
    const isPdf = file.mimetype === 'application/pdf';

    if (isPdf) {
      // `format` is only honored by Cloudinary for image/video resource
      // types. For `raw` uploads the extension must be baked into the
      // public_id itself, otherwise the delivery URL (and its
      // Content-Disposition/Content-Type) has no extension and is served as
      // application/octet-stream — browsers and WhatsApp then can't
      // recognize/open it as a PDF. Confirmed against a live asset uploaded
      // under the old config: its raw/upload URL had no extension and
      // returned Content-Type: application/octet-stream.
      const baseName = path
        .parse(file.originalname)
        .name.replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 80);
      return {
        folder: `HNG-CRM/${folder}`,
        allowed_formats: allowedFormats,
        resource_type: 'raw',
        public_id: `${baseName}-${Date.now()}.pdf`,
      };
    }

    return {
      folder: `HNG-CRM/${folder}`,
      allowed_formats: allowedFormats,
      resource_type: 'image',
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
