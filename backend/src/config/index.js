const path = require('node:path');

const DEFAULT_ALLOWED_MIME_TYPES = 'application/pdf,image/png,image/jpeg,text/plain';

module.exports = {
  port: Number(process.env.PORT) || 3000,
  storageDir: path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '..', '..', 'storage')),
  maxUploadSizeBytes: Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 10 * 1024 * 1024,
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || DEFAULT_ALLOWED_MIME_TYPES)
    .split(',')
    .map((mimeType) => mimeType.trim())
    .filter(Boolean),
};
