import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

// Public Pages (10)
import HomeView from '../views/public/HomeView.vue';
import ExploreView from '../views/public/ExploreView.vue';
import CategoriesView from '../views/public/CategoriesView.vue';
import ApiDetailsView from '../views/public/ApiDetailsView.vue';
import ProviderProfileView from '../views/public/ProviderProfileView.vue';
import PricingView from '../views/public/PricingView.vue';
import AboutView from '../views/public/AboutView.vue';
import ContactView from '../views/public/ContactView.vue';
import LoginView from '../views/public/LoginView.vue';
import RegisterView from '../views/public/RegisterView.vue';

// Authenticated User & Provider Pages (11)
import UserDashboardView from '../views/user/UserDashboardView.vue';
import FavoritesView from '../views/user/FavoritesView.vue';
import CollectionsView from '../views/user/CollectionsView.vue';
import ApiComparisonView from '../views/user/ApiComparisonView.vue';
import ProfileSettingsView from '../views/user/ProfileSettingsView.vue';
import SubscriptionManagementView from '../views/user/SubscriptionManagementView.vue';
import PaymentHistoryView from '../views/user/PaymentHistoryView.vue';
import SubmitApiView from '../views/user/SubmitApiView.vue';
import ProviderDashboardView from '../views/user/ProviderDashboardView.vue';
import PromoteApiView from '../views/user/PromoteApiView.vue';
import CampaignHistoryView from '../views/user/CampaignHistoryView.vue';

// Administrator Layout & Pages (12)
import AdminLayout from '../views/admin/AdminLayout.vue';
import AdminDashboardView from '../views/admin/AdminDashboardView.vue';
import UserManagementView from '../views/admin/UserManagementView.vue';
import ApiManagementView from '../views/admin/ApiManagementView.vue';
import PendingSubmissionsView from '../views/admin/PendingSubmissionsView.vue';
import CategoryManagementView from '../views/admin/CategoryManagementView.vue';
import TagManagementView from '../views/admin/TagManagementView.vue';
import ApiImportManagementView from '../views/admin/ApiImportManagementView.vue';
import ProviderManagementView from '../views/admin/ProviderManagementView.vue';
import AdminSubscriptionsView from '../views/admin/AdminSubscriptionsView.vue';
import AdminPaymentsView from '../views/admin/AdminPaymentsView.vue';
import AdvertisingManagementView from '../views/admin/AdvertisingManagementView.vue';
import ReviewsAndReportsView from '../views/admin/ReviewsAndReportsView.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Home' } },
  { path: '/explore', name: 'explore', component: ExploreView, meta: { title: 'Explore APIs' } },
  { path: '/categories', name: 'categories', component: CategoriesView, meta: { title: 'Categories' } },
  { path: '/apis/:slug', name: 'api-details', component: ApiDetailsView, meta: { title: 'API Details' } },
  { path: '/providers/:slug', name: 'provider-profile', component: ProviderProfileView, meta: { title: 'Provider Profile' } },
  { path: '/pricing', name: 'pricing', component: PricingView, meta: { title: 'Pricing' } },
  { path: '/about', name: 'about', component: AboutView, meta: { title: 'About' } },
  { path: '/contact', name: 'contact', component: ContactView, meta: { title: 'Contact' } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: 'Sign In', guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: 'Register', guestOnly: true } },

  // Authenticated Developer & Provider Routes
  { path: '/dashboard', name: 'dashboard', component: UserDashboardView, meta: { requiresAuth: true, title: 'Dashboard' } },
  { path: '/dashboard/favorites', name: 'favorites', component: FavoritesView, meta: { requiresAuth: true, title: 'Favorites' } },
  { path: '/dashboard/collections', name: 'collections', component: CollectionsView, meta: { requiresAuth: true, title: 'Collections' } },
  { path: '/dashboard/compare', name: 'compare', component: ApiComparisonView, meta: { requiresAuth: true, title: 'Compare APIs' } },
  { path: '/dashboard/settings', name: 'settings', component: ProfileSettingsView, meta: { requiresAuth: true, title: 'Settings' } },
  { path: '/dashboard/subscription', name: 'subscription', component: SubscriptionManagementView, meta: { requiresAuth: true, title: 'Subscription' } },
  { path: '/dashboard/payments', name: 'payments', component: PaymentHistoryView, meta: { requiresAuth: true, title: 'Payment History' } },
  { path: '/submit-api', name: 'submit-api', component: SubmitApiView, meta: { requiresAuth: true, title: 'Submit API' } },
  { path: '/apis/:id/edit', name: 'edit-api', component: SubmitApiView, meta: { requiresAuth: true, title: 'Edit API' } },
  { path: '/provider/dashboard', name: 'provider-dashboard', component: ProviderDashboardView, meta: { requiresAuth: true, title: 'Provider Dashboard' } },
  { path: '/provider/promote', name: 'promote-api', component: PromoteApiView, meta: { requiresAuth: true, title: 'Promote API' } },
  { path: '/provider/campaigns', name: 'campaign-history', component: CampaignHistoryView, meta: { requiresAuth: true, title: 'Campaign History' } },

  // Administrator Routes (Never accessible to normal users)
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', name: 'admin-dashboard', component: AdminDashboardView, meta: { title: 'Admin Dashboard' } },
      { path: 'users', name: 'admin-users', component: UserManagementView, meta: { title: 'User Management' } },
      { path: 'apis', name: 'admin-apis', component: ApiManagementView, meta: { title: 'API Management' } },
      { path: 'submissions', name: 'admin-submissions', component: PendingSubmissionsView, meta: { title: 'Pending Submissions' } },
      { path: 'categories', name: 'admin-categories', component: CategoryManagementView, meta: { title: 'Category Management' } },
      { path: 'tags', name: 'admin-tags', component: TagManagementView, meta: { title: 'Tag Management' } },
      { path: 'imports', name: 'admin-imports', component: ApiImportManagementView, meta: { title: 'Import Management' } },
      { path: 'providers', name: 'admin-providers', component: ProviderManagementView, meta: { title: 'Provider Management' } },
      { path: 'subscriptions', name: 'admin-subscriptions', component: AdminSubscriptionsView, meta: { title: 'Subscription Management' } },
      { path: 'payments', name: 'admin-payments', component: AdminPaymentsView, meta: { title: 'Payment Management' } },
      { path: 'advertising', name: 'admin-advertising', component: AdvertisingManagementView, meta: { title: 'Advertising Management' } },
      { path: 'moderation', name: 'admin-moderation', component: ReviewsAndReportsView, meta: { title: 'Reviews & Reports' } }
    ]
  },

  // Catch-all redirect
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (!authStore.initialized) {
    await authStore.initAuth();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    const toast = useToastStore();
    toast.error('Administrator privileges are required to view that page.');
    return { path: '/dashboard' };
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { path: '/dashboard' };
  }

  if (typeof document !== 'undefined') {
    document.title = to.meta.title
      ? `${to.meta.title} — API Locate`
      : 'API Locate — Discover APIs. Organize Resources. Build More.';
  }

  return true;
});

export default router;
