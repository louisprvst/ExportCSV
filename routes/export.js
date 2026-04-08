const express = require('express');
const axios = require('axios');
const router = express.Router();

// Conversion m/s > min/km
function speedToPace(speed) {
  if (!speed || speed === 0) return '';

  const paceMin = 16.6667 / speed;
  const min = Math.floor(paceMin);
  const sec = Math.round((paceMin - min) * 60);

  return `${min}:${sec.toString().padStart(2, '0')}`;
}

router.get('/:id', async (req, res) => {
  const token = req.session.accessToken;
  const activityId = req.params.id;

  if (!token) return res.status(401).send('Non connecté');

  // Paramètres depuis le frontend
  const mode = req.query.mode || 'time';
  const timeStep = parseInt(req.query.timeStep) || 10;
  const distanceStep = parseInt(req.query.distanceStep) || 100;

  try {
    // Activité
    const activityRes = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const a = activityRes.data;

    // Streams
    const streamsRes = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}/streams`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          keys: 'time,distance,heartrate,velocity_smooth',
          key_by_type: true
        }
      }
    );

    const s = streamsRes.data;

    if (!s.time) return res.send('Pas de données');

    let rows = [];

    // MODE TEMPS
    if (mode === 'time') {
      for (let i = 0; i < s.time.data.length; i++) {
        if (s.time.data[i] % timeStep === 0) {
          rows.push({
            t: s.time.data[i],
            d: s.distance?.data[i]?.toFixed(1) || '',
            hr: s.heartrate?.data[i] || '',
            pace: speedToPace(s.velocity_smooth?.data[i])
          });
        }
      }
    }

    // MODE DISTANCE
    if (mode === 'distance') {
      let last = 0;

      for (let i = 0; i < s.distance.data.length; i++) {
        if (s.distance.data[i] - last >= distanceStep) {
          last = s.distance.data[i];

          rows.push({
            t: s.time.data[i],
            d: s.distance?.data[i]?.toFixed(1) || '',
            hr: s.heartrate?.data[i] || '',
            pace: speedToPace(s.velocity_smooth?.data[i])
          });
        }
      }
    }

    // Sécurité si aucun point
    if (rows.length === 0) {
      rows.push({
        t: s.time.data[0],
        d: s.distance?.data[0]?.toFixed(1) || '',
        hr: s.heartrate?.data[0] || '',
        pace: speedToPace(s.velocity_smooth?.data[0])
      });
    }

    // CSV
    let csv = '';

    csv += `name,${a.name}\n`;
    csv += `distance_km,${(a.distance / 1000).toFixed(2)}\n`;
    csv += `duration_s,${a.moving_time}\n`;
    csv += `elevation_m,${a.total_elevation_gain}\n`;
    csv += `avg_hr,${a.average_heartrate || ''}\n`;
    csv += `max_hr,${a.max_heartrate || ''}\n`;
    csv += `pace_avg,${speedToPace(a.average_speed)}\n`;
    csv += `mode,${mode}\n`;
    csv += `\n`;

    csv += `t(s),d(m),hr(bpm),pace(min/km)\n`;

    rows.forEach(r => {
      csv += `${r.t},${r.d},${r.hr},${r.pace}\n`;
    });

    // Limite de taille
    if (csv.length > 10000) {
      csv = csv.slice(0, 10000);
    }

    res.send(csv);

  } 
  catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Erreur export CSV');
  }
});

module.exports = router;