const express = require('express');
const router = express.Router();
const {
  listApiSources,
  createApiSource,
  updateApiSource,
  deleteApiSource,
  triggerImportJob,
  listImportJobs
} = require('../controllers/importController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.use(protect, adminOnly);

router.get('/api-sources', listApiSources);
router.post('/api-sources', createApiSource);
router.put('/api-sources/:id', updateApiSource);
router.delete('/api-sources/:id', deleteApiSource);
router.post('/api-sources/:id/import', triggerImportJob);
router.get('/import-jobs', listImportJobs);

module.exports = router;
