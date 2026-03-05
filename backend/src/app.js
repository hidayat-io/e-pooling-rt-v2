const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { setupResponseHelpers } = require('./utils/response');
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');
const adminAuth = require('./middlewares/adminAuth');
const requestLogger = require('./middlewares/requestLogger');

// Routes
const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const voterRoutes = require('./routes/voter.routes');
const adminVoterRoutes = require('./routes/admin/voters.routes');
const adminCandidateRoutes = require('./routes/admin/candidates.routes');
const adminWhatsappRoutes = require('./routes/admin/whatsapp.routes');
const adminDashboardRoutes = require('./routes/admin/dashboard.routes');
const webhookRoutes = require('./routes/webhook.routes');
const internalJobsRoutes = require('./routes/internal.jobs.routes');

const app = express();
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARE CHAIN
// ============================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging HTTP requests
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('short'));
}

// Traffic logging ke DB (fire-and-forget, non-blocking)
app.use(requestLogger);

// General rate limiter
app.use('/api/', generalLimiter);

// Standard response helpers (res.success, res.error)
app.use(setupResponseHelpers);

// Static files untuk foto kandidat
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

// Health check untuk Cloud Run
app.get('/healthz', (req, res) => {
    res.status(200).json({ success: true, message: 'ok' });
});

// ============================================
// API ROUTES
// ============================================

// Auth
app.use('/api/v1/auth', authRoutes);

// Public (no auth)
app.use('/api/v1', publicRoutes);

// Voter (voter JWT)
app.use('/api/v1', voterRoutes);

// Webhook (no auth, verify signature internally)
app.use('/api/v1/whatsapp/webhook', webhookRoutes);

// Internal jobs (triggered by Cloud Scheduler with shared secret)
app.use('/api/v1/internal/jobs', internalJobsRoutes);

// Admin routes (all require adminAuth)
app.use('/api/v1/admin/voters', adminAuth, adminVoterRoutes);
app.use('/api/v1/admin/candidates', adminAuth, adminCandidateRoutes);
app.use('/api/v1/admin/whatsapp', adminAuth, adminWhatsappRoutes);
app.use('/api/v1/admin', adminAuth, adminDashboardRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan',
        error: 'NOT_FOUND',
    });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
