const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ====================================
// Check xem Cloudinary đã config chưa
// ====================================
const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_KEY !== 'your_api_key';

let uploadProduct, uploadAvatar, uploadShop, cloudinary;

if (isCloudinaryConfigured) {
    // ====== Dùng Cloudinary ======
    cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const productStorage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'kltn2026/products',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
        }
    });

    const avatarStorage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'kltn2026/avatars',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 300, height: 300, crop: 'fill', quality: 'auto' }]
        }
    });

    const shopStorage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'kltn2026/shops',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }]
        }
    });

    uploadProduct = multer({ storage: productStorage, limits: { fileSize: 5 * 1024 * 1024 } });
    uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });
    uploadShop = multer({ storage: shopStorage, limits: { fileSize: 3 * 1024 * 1024 } });

    console.log('☁️  Upload: Sử dụng Cloudinary');
} else {
    // ====== Fallback: Dùng Local Storage ======
    const ensureDir = (dir) => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    };

    const createLocalStorage = (subfolder) => {
        const dir = path.join(__dirname, '..', 'uploads', subfolder);
        ensureDir(dir);
        return multer.diskStorage({
            destination: (req, file, cb) => cb(null, dir),
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = path.extname(file.originalname);
                cb(null, uniqueSuffix + ext);
            }
        });
    };

    const fileFilter = (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'), false);
        }
    };

    uploadProduct = multer({ storage: createLocalStorage('products'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
    uploadAvatar = multer({ storage: createLocalStorage('avatars'), limits: { fileSize: 2 * 1024 * 1024 }, fileFilter });
    uploadShop = multer({ storage: createLocalStorage('shops'), limits: { fileSize: 3 * 1024 * 1024 }, fileFilter });
    cloudinary = null;

    console.log('📁 Upload: Sử dụng Local Storage (uploads/)');
}

// Upload local fallback luôn có sẵn
const localStorageFallback = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const uploadLocal = multer({ storage: localStorageFallback, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { uploadProduct, uploadAvatar, uploadShop, uploadLocal, cloudinary };
