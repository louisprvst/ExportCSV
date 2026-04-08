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

    const activities = response.data.map(act => ({
      id: act.id,
      name: act.name,
      distance: (act.distance / 1000).toFixed(2),
      start_date: act.start_date
    }));

    res.json(activities);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Erreur récupération activités');
  }
});

module.exports = router;