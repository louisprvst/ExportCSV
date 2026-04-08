const express = require('express');
const axios = require('axios');
const router = express.Router();

const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;

// Construire dynamiquement le base URL pour local/prod
function getBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }
  return `${req.protocol}://${req.get('host')}`;
}

// Login Strava
router.get('/strava', (req, res) => {
  if (!clientId || !clientSecret) {
    return res.status(500).send('Strava credentials not configured');
  }
  
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/strava/callback`;
  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=auto&scope=activity:read_all`;
  res.redirect(url);
});

// Callback
router.get('/strava/callback', async (req, res) => {
  const code = req.query.code;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/strava/callback`;

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }
    });

    const accessToken = response.data.access_token;

    // Stocker dans la session correctement
    req.session.accessToken = accessToken;

    // Redirige vers la page dashboard
    res.redirect('/dashboard.html');

  } 
  catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Erreur OAuth');
  }
});

module.exports = router;