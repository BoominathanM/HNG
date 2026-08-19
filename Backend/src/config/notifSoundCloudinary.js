const { cloudinary } = require('./cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Dedicated Cloudinary/multer instance for the navbar notification-bell sound,
// mirroring config/audioCloudinary.js exactly but kept in its own folder so it
// doesn't mix into alert-config's 'alert-audio' folder.
const notifSoundStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'HNG-CRM/notification-sound',
    resource_type: 'video', // Cloudinary serves audio files under the 'video' bucket
    allowed_formats: ['mp3', 'wav', 'ogg', 'm4a'],
  }),
});

const uploadNotifSound = multer({
  storage: notifSoundStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /mpeg|mp3|wav|wave|x-wav|ogg|x-m4a|mp4|aac/;
    if (allowed.test(file.mimetype.split('/')[1] || '')) return cb(null, true);
    cb(new Error('Only audio files (mp3, wav, ogg, m4a) are allowed'));
  },
});

module.exports = { uploadNotifSound };
