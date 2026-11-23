const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const config = require('../config');
const documentsService = require('../services/documents.service');
const { DocumentError } = require('../services/document.error');

const DOCUMENT_ERROR_STATUS = {
  MISSING_USER_ID: 400,
  MISSING_FILE: 400,
  UNSUPPORTED_MEDIA_TYPE: 415,
  DOCUMENT_NOT_FOUND: 404,
  STORAGE_ERROR: 500,
};

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
      return cb(new DocumentError('UNSUPPORTED_MEDIA_TYPE', 'Tipo de arquivo não permitido.'));
    }
    cb(null, true);
  },
});

function requireUserId(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();

  if (!owner) {
    return next(new DocumentError('MISSING_USER_ID', 'O cabeçalho X-User-Id é obrigatório.'));
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

function toErrorResponse(error) {
  if (error instanceof multer.MulterError) {
    return MULTER_ERROR_RESPONSES[error.code];
  }

  if (error instanceof DocumentError && DOCUMENT_ERROR_STATUS[error.errorCode]) {
    return {
      status: DOCUMENT_ERROR_STATUS[error.errorCode],
      errorCode: error.errorCode,
      message: error.message,
    };
  }

  return undefined;
}

function handleError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const response = toErrorResponse(error);

  if (!response) {
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
