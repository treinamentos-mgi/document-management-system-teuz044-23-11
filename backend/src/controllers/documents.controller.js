const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const config = require('../config');
const documentsService = require('../services/documents.service');

const MULTER_ERROR_RESPONSES = {
  LIMIT_FILE_SIZE: {
    status: 413,
    errorCode: 'FILE_TOO_LARGE',
    message: 'O arquivo excede o tamanho máximo permitido.',
  },
  LIMIT_UNEXPECTED_FILE: {
    status: 400,
    errorCode: 'MISSING_FILE',
    message: "Envie o arquivo no campo 'file'.",
  },
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(config.storageDir, { recursive: true }, (error) => cb(error, config.storageDir));
  },
  filename: (req, file, cb) => cb(null, crypto.randomUUID()),
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadSizeBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!documentsService.isMimeTypeAllowed(file.mimetype)) {
      return cb(
        documentsService.createError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Tipo de arquivo não permitido.'),
      );
    }
    cb(null, true);
  },
});

function requireUserId(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();

  if (!owner) {
    return next(documentsService.createError(400, 'MISSING_USER_ID', 'O cabeçalho X-User-Id é obrigatório.'));
  }

  req.owner = owner;
  next();
}

const uploadSingleFile = upload.single('file');

async function uploadDocument(req, res) {
  const document = await documentsService.uploadDocument({ file: req.file, owner: req.owner });
  res.status(201).location(`/documents/${document.id}`).json(document);
}

function listDocuments(req, res) {
  res.json({ items: documentsService.listDocumentsByOwner(req.owner) });
}

async function downloadDocument(req, res) {
  const file = await documentsService.getDocumentForDownload(req.params.id, req.owner);
  res.attachment(file.originalName);
  res.type(file.mimeType);
  await res.sendFile(file.filePath);
}

function handleError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const response = error instanceof multer.MulterError ? MULTER_ERROR_RESPONSES[error.code] : error;

  if (!response?.errorCode) {
    console.error(error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
  }

  res.status(response.status).json({ error: { code: response.errorCode, message: response.message } });
}

module.exports = {
  requireUserId,
  uploadSingleFile,
  uploadDocument,
  listDocuments,
  downloadDocument,
  handleError,
};
