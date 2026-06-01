const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/activities
router.get('/activities', async (req, res) => {
  const token = req.session.accessToken;

  if (!token) {
    return res.status(401).send('Non connecté');
  }

  try {
    const response = await axios.get(
      'https://www.strava.com/api/v3/athlete/activities',
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          per_page: 5
        }
      }
    );

    if (!Array.isArray(response.data)) {
      console.error('[api/activities] Unexpected Strava payload:', response.data);
      return res.status(502).send('Réponse Strava inattendue');
    }

    const activities = response.data.map(act => ({
      id: act.id,
      name: act.name,
      distance: (act.distance / 1000).toFixed(2),
      start_date: act.start_date
    }));

    res.json(activities);

  } catch (err) {
    console.error('[api/activities] Strava error status:', err.response?.status);
    console.error('[api/activities] Strava error data:', err.response?.data || err.message);

    if (!err.response) {
      return res.status(502).send('Strava est injoignable ou a coupé la connexion');
    }

    const status = err.response?.status || 500;

    if (status === 401 || status === 403) {
      req.session.accessToken = null;
      return res.status(401).send('Session Strava expirée ou invalide');
    }

    if (status === 429) {
      return res.status(429).send('Trop de requêtes vers Strava, réessaie plus tard');
    }

    res.status(status).send(`Erreur récupération activités${status ? ` (Strava ${status})` : ''}`);
  }
});

module.exports = router;