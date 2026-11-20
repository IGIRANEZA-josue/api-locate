const express = require('express');
const router = express.Router();
const {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addApiToCollection,
  removeApiFromCollection
} = require('../controllers/collectionController');
const { protect } = require('../middleware/authMiddleware');
const { premiumOnly } = require('../middleware/premiumMiddleware');

router.use(protect, premiumOnly('Personal API collections'));
router.get('/', getCollections);
router.post('/', createCollection);
router.get('/:id', getCollectionById);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);
router.post('/:id/apis/:apiId', addApiToCollection);
router.delete('/:id/apis/:apiId', removeApiFromCollection);

module.exports = router;
