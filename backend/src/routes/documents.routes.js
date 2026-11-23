const express = require('express');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();

router.post(
  '/upload',
  documentsController.requireUserId,
  documentsController.uploadSingleFile,
  documentsController.uploadDocument,
);
router.get('/documents', documentsController.requireUserId, documentsController.listDocuments);
router.get(
  '/documents/:id/download',
  documentsController.requireUserId,
  documentsController.downloadDocument,
);
router.use(documentsController.handleError);

module.exports = router;
