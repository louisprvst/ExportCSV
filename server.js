// server.js
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.SESSION_SECRET) {
  console.warn('[startup] SESSION_SECRET manquant: secret temporaire utilisé pour cette exécution.');
}

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Exception non gérée — le processus reste actif :', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection] Promesse rejetée non gérée :', reason);
});

// Nécessaire derrière Railway / un proxy inverse.
app.set('trust proxy', 1);

// Session
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd
  }
}));

// Fichiers statiques
app.use(express.static('public'));

console.log('[startup] Loading routes...');

try {
  const authRoutes = require('./routes/auth');
  app.use('/auth', authRoutes);
  console.log('[startup] Routes /auth chargées');
} catch (err) {
  console.error('[startup] Impossible de charger les routes /auth :', err);
}

try {
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  console.log('[startup] Routes /api chargées');
} catch (err) {
  console.error('[startup] Impossible de charger les routes /api :', err);
}

try {
  const exportRoutes = require('./routes/export');
  app.use('/export', exportRoutes);
  console.log('[startup] Routes /export chargées');
} catch (err) {
  console.error('[startup] Impossible de charger les routes /export :', err);
}

// Vérification santé
app.get('/test', (req, res) => res.send('Server OK !'));

app.use((err, req, res, next) => {
  console.error('[express error handler]', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`[startup] Serveur en écoute sur le port ${port}`);
  console.log(`[startup] Environnement : ${process.env.NODE_ENV || 'development'}`);
  console.log('[startup] Routes enregistrées — prêt à recevoir des requêtes');
});