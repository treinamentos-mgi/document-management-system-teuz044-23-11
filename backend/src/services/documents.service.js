const crypto = require('node:crypto');
const config = require('../config');
const documentsRepository = require('../repositories/documents.repository');

function createError(status, errorCode, message) {
  const error = new Error(message);
  error.status = status;
  error.errorCode = errorCode;
  return error;
}

function isMimeTypeAllowed(mimeType) {
  return config.allowedMimeTypes.includes(mimeType);
}

function toPublicMetadata({ storagePath, ...metadata }) {
  return metadata;
}

async function uploadDocument({ file, owner }) {
  if (!file) {
    throw createError(400, 'MISSING_FILE', "Envie o arquivo no campo 'file'.");
  }

  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storagePath: file.path,
    uploadedAt: new Date().toISOString(),
    owner,
  };

  try {
    documentsRepository.save(document);
  } catch {
    await documentsRepository.removeFile(file.path);
    throw createError(500, 'STORAGE_ERROR', 'Falha ao salvar os metadados do documento.');
  }

  return toPublicMetadata(document);
}

function listDocumentsByOwner(owner) {
  return documentsRepository
    .findAllByOwner(owner)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map(toPublicMetadata);
}

async function getDocumentForDownload(id, owner) {
  const document = documentsRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  if (!(await documentsRepository.fileExists(document.storagePath))) {
    throw createError(500, 'STORAGE_ERROR', 'O arquivo do documento não está disponível.');
  }

  return {
    filePath: document.storagePath,
    originalName: document.originalName,
    mimeType: document.mimeType,
  };
}

module.exports = {
  createError,
  isMimeTypeAllowed,
  uploadDocument,
  listDocumentsByOwner,
  getDocumentForDownload,
};
