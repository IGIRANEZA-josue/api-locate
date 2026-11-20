const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { pool, testConnection } = require('./config/db');
const { generalLimiter, sensitiveLimiter } = require('./middleware/rateLimitMiddleware');
const { notFound, errorHandler, asyncHandler, AppError } = require('./middleware/errorMiddleware');
const { sanitizeText, validateEmail } = require('./middleware/validationMiddleware');

// Route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const apiRoutes = require('./routes/apiRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const tagRoutes = require('./routes/tagRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const providerRoutes = require('./routes/providerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getPlans } = require('./controllers/subscriptionController');
const { getAdvertisingPackages } = require('./controllers/promotionController');

const app = express();
app.set('trust proxy', 1);

// Security headers (allow preview iframe embedding cleanly)
app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration supporting configured origins + sandbox preview hosts
const configuredOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        configuredOrigins.includes(origin) ||
        origin.endsWith('.e2b.app') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);

// Parse JSON while preserving exact rawBody buffer for webhook HMAC verification
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/payments/webhook')) {
        req.rawBody = Buffer.from(buf);
      }
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', generalLimiter);

// Root & Health Check endpoints
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const fs = require('fs');

app.get('/', (req, res, next) => {
  const acceptsHtml = (req.headers.accept || '').includes('text/html');
  if (acceptsHtml && fs.existsSync(path.join(frontendDistPath, 'index.html'))) {
    return next();
  }
  res.json({
    name: 'API Locate REST API',
    slogan: 'Discover APIs. Organize Resources. Build More.',
    version: '1.0.0',
    status: 'online',
    docs_hint: 'All REST endpoints are mounted under /api'
  });
});

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    const dbInfo = await testConnection();
    res.json({
      success: true,
      status: 'healthy',
      database: dbInfo.db,
      mysql_version: dbInfo.version,
      timestamp: new Date().toISOString()
    });
  })
);

// Public Contact Inquiry endpoint (notifies platform administrators)
app.post(
  '/api/contact',
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const name = sanitizeText(req.body.name, 120);
    const email = validateEmail(req.body.email);
    const subject = sanitizeText(req.body.subject, 160);
    const message = sanitizeText(req.body.message, 3000);

    if (!name || !subject || !message || message.length < 10) {
      throw new AppError(
        'Please provide your name, valid email, subject, and a message of at least 10 characters.',
        400,
        'INVALID_CONTACT_MESSAGE'
      );
    }

    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link_url)
         VALUES (?, 'contact_inquiry', ?, ?, '/admin')`,
        [
          admin.id,
          `Contact Inquiry: ${subject}`,
          `From ${name} <${email}>: ${message}`
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been sent to the API Locate team. We will respond shortly.'
    });
  })
);

// Core REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/collections', collectionRoutes);
app.get('/api/plans', getPlans);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.get('/api/advertising-packages', getAdvertisingPackages);
app.use('/api/promotions', promotionRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/admin', adminRoutes);

// Serve built frontend SPA for browser requests if available (so :5000 also previews cleanly)
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^\/(?!api(\/|$)).*/, (req, res, next) => {
    if (req.method !== 'GET' || !(req.headers.accept || '').includes('text/html')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 & Central Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  testConnection()
    .then((info) => {
      console.log(`[Database] Connected to MySQL (${info.version}) - schema: ${info.db}`);
      app.listen(PORT, HOST, () => {
        console.log(`[Server] API Locate backend listening on http://${HOST}:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Database] Startup connection check failed:', err.message);
      process.exit(1);
    });
}

module.exports = app;
