const crypto = require('node:crypto');
const config = require('../config');
const documentsRepository = require('../repositories/documents.repository');
const { DocumentError } = require('./document.error');

function isMimeTypeAllowed(mimeType) {
  return config.allowedMimeTypes.includes(mimeType);
}

function toPublicMetadata({ storagePath, ...metadata }) {
  return metadata;
}

function buildDocumentRecord(file, owner) {
  return {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storagePath: file.path,
    uploadedAt: new Date().toISOString(),
    owner,
  };
}

async function saveOrDiscardFile(document) {
  try {
    documentsRepository.save(document);
  } catch {
    await documentsRepository.removeFile(document.storagePath);
    throw new DocumentError('STORAGE_ERROR', 'Falha ao salvar os metadados do documento.');
  }
}

function findOwnedDocument(id, owner) {
  const document = documentsRepository.findById(id);

  if (!document || document.owner !== owner) {
    throw new DocumentError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return document;
}

async function ensureStoredFileExists(document) {
  if (!(await documentsRepository.fileExists(document.storagePath))) {
    throw new DocumentError('STORAGE_ERROR', 'O arquivo do documento não está disponível.');
  }
}

async function uploadDocument({ file, owner }) {
  if (!file) {
    throw new DocumentError('MISSING_FILE', "Envie o arquivo no campo 'file'.");
  }

  const document = buildDocumentRecord(file, owner);
  await saveOrDiscardFile(document);
  return toPublicMetadata(document);
}

function listDocumentsByOwner(owner) {
  return documentsRepository
    .findAllByOwner(owner)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map(toPublicMetadata);
}

async function getDocumentForDownload(id, owner) {
  const document = findOwnedDocument(id, owner);
  await ensureStoredFileExists(document);

  return {
    filePath: document.storagePath,
    originalName: document.originalName,
    mimeType: document.mimeType,
  };
}

module.exports = {
  isMimeTypeAllowed,
  uploadDocument,
  listDocumentsByOwner,
  getDocumentForDownload,
};
