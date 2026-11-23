const fs = require('node:fs/promises');

const documents = new Map();

function save(document) {
  documents.set(document.id, document);
}

function findById(id) {
  return documents.get(id) ?? null;
}

function findAllByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeFile(filePath) {
  try {
    await fs.rm(filePath, { force: true });
  } catch (error) {
    console.error(`Falha ao remover arquivo órfão ${filePath}:`, error);
  }
}

module.exports = {
  save,
  findById,
  findAllByOwner,
  fileExists,
  removeFile,
};
