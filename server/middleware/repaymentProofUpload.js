const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = './uploads/repayment-proofs';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const safeExtension = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(extension)
      ? extension
      : '.bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `repayment-proof-${uniqueSuffix}${safeExtension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error('Only PDF, JPG, PNG, and WEBP files are allowed for proof of payment'), false);
};

const repaymentProofUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

module.exports = repaymentProofUpload;
