const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  listUsers,
  updateUserRole,
  updateUserStatus,
  listAllApis,
  listPendingApis,
  approveApi,
  rejectApi,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listAdminTags,
  createTag,
  updateTag,
  deleteTag,
  listAdminProviders,
  verifyProviderProfile,
  listAdminPlans,
  updatePlan,
  listAdminSubscriptions,
  listAdminPayments,
  verifyManualPayment,
  listAdminPackages,
  createAdvertisingPackage,
  updateAdvertisingPackage,
  listAllCampaigns,
  listPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  listAdminReviews,
  moderateReview,
  listAdminReports,
  resolveReport
} = require('../controllers/adminController');
const importRoutes = require('./importRoutes');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

router.use(protect, adminOnly);

// Analytics Dashboard
router.get('/dashboard', getDashboardAnalytics);

// Users
router.get('/users', listUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', updateUserStatus);

// API Listings & Moderation
router.get('/apis/pending', listPendingApis);
router.get('/apis', listAllApis);
router.put('/apis/:id/approve', approveApi);
router.put('/apis/:id/reject', rejectApi);

// Categories
router.get('/categories', listAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Tags
router.get('/tags', listAdminTags);
router.post('/tags', createTag);
router.put('/tags/:id', updateTag);
router.delete('/tags/:id', deleteTag);

// External API Import Sources & Jobs
router.use('/', importRoutes);

// Providers
router.get('/providers', listAdminProviders);
router.put('/providers/:id/verify', verifyProviderProfile);

// Plans, Subscriptions & Payments
router.get('/plans', listAdminPlans);
router.put('/plans/:id', updatePlan);
router.get('/subscriptions', listAdminSubscriptions);
router.get('/payments', listAdminPayments);
router.put('/payments/:id/verify-manual', verifyManualPayment);

// Advertising Packages & Sponsored Campaigns
router.get('/advertising-packages', listAdminPackages);
router.post('/advertising-packages', createAdvertisingPackage);
router.put('/advertising-packages/:id', updateAdvertisingPackage);
router.get('/campaigns/pending', listPendingCampaigns);
router.get('/campaigns', listAllCampaigns);
router.put('/campaigns/:id/approve', approveCampaign);
router.put('/campaigns/:id/reject', rejectCampaign);

// Reviews & Reports
router.get('/reviews', listAdminReviews);
router.put('/reviews/:id/status', moderateReview);
router.get('/reports', listAdminReports);
router.put('/reports/:id/resolve', resolveReport);

module.exports = router;
