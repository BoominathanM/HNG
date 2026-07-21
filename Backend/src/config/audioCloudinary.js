const { cloudinary } = require('./cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Dedicated Cloudinary/multer instance for alert-notification audio uploads.
// Kept separate from config/cloudinary.js's shared image/PDF instance so
// widening the allowed formats here can't affect any other upload call site.
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'HNG-CRM/alert-audio',
    resource_type: 'video', // Cloudinary serves audio files under the 'video' bucket
    allowed_formats: ['mp3', 'wav', 'ogg', 'm4a'],
  }),
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Audio mimetypes vary by browser/OS (audio/mpeg, audio/wav, audio/x-wav, audio/mp4, …)
    const allowed = /mpeg|mp3|wav|wave|x-wav|ogg|x-m4a|mp4|aac/;
    if (allowed.test(file.mimetype.split('/')[1] || '')) return cb(null, true);
    cb(new Error('Only audio files (mp3, wav, ogg, m4a) are allowed'));
  },
});

module.exports = { uploadAudio };
