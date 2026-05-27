const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getWeatherSummaryForActivity } = require('../services/weather');
const { inferLapTypesFromMetrics } = require('../services/lapTypes');

//--------------------------------------------------------------------
// Utilitaires generaux
//--------------------------------------------------------------------

// Conversion m/s > min/km
function speedToPace(speed) {
  if (!speed || speed === 0) return '';

  const paceMin = 16.6667 / speed;
  const min = Math.floor(paceMin);
  const sec = Math.round((paceMin - min) * 60);

  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Échappe les valeurs pour produire un CSV valide (virgules, guillemets, retours ligne)
function csvEscape(value) {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

//--------------------------------------------------------------------
// Traitement genéral de l'export CSV
//--------------------------------------------------------------------

router.get('/:id', async (req, res) => {
  const token = req.session.accessToken;
  const activityId = req.params.id;

  if (!token) return res.status(401).send('Non connecté');

  // Paramètres depuis le frontend
  const mode = req.query.mode || 'time';
  const timeStep = parseInt(req.query.timeStep) || 10;
  const distanceStep = parseInt(req.query.distanceStep) || 100;
  const includeLapTypes = req.query.includeLapTypes === 'true';

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

    const weatherSummary = await getWeatherSummaryForActivity(a);

    let rows = [];
    const includeLapTypeColumn = mode === 'laps' && includeLapTypes;

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

    // MODE LAPS
    if (mode === 'laps') {
      try {
        const lapsRes = await axios.get(
          `https://www.strava.com/api/v3/activities/${activityId}/laps`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const laps = lapsRes.data;

        if (!laps || laps.length === 0) {
          return res.status(400).send('Cette activité n\'a pas de laps');
        }

        const lapTypes = includeLapTypeColumn ? inferLapTypesFromMetrics(laps) : [];

        laps.forEach((lap, index) => {
          const row = {
            t: lap.elapsed_time,
            d: (lap.distance).toFixed(1),
            hr: lap.average_heartrate ? Math.round(lap.average_heartrate) : '',
            pace: speedToPace(lap.average_speed)
          };

          if (includeLapTypeColumn) {
            row.lap_type = lapTypes[index];
          }

          rows.push(row);
        });

      } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(400).send('Erreur lors de la récupération des laps');
      }
    }

    // Sécurité si aucun point de données
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

    csv += `name,${csvEscape(a.name)}\n`;
    csv += `distance_km,${csvEscape((a.distance / 1000).toFixed(2))}\n`;
    csv += `duration_s,${csvEscape(a.moving_time)}\n`;
    csv += `elevation_m,${csvEscape(a.total_elevation_gain)}\n`;
    csv += `avg_hr,${csvEscape(a.average_heartrate || '')}\n`;
    csv += `max_hr,${csvEscape(a.max_heartrate || '')}\n`;
    csv += `pace_avg,${csvEscape(speedToPace(a.average_speed))}\n`;
    csv += `weather_temp_c,${csvEscape(weatherSummary.weather_temp_c || '')}\n`;
    csv += `weather_wspd_kmh,${csvEscape(weatherSummary.weather_wspd_kmh || '')}\n`;
    csv += `weather_condition,${csvEscape(weatherSummary.weather_condition || '')}\n`;
    csv += `\n`;

    if (includeLapTypeColumn) {
      csv += `lap_type,t(s),d(m),hr(bpm),pace(min/km)\n`;
    } else {
      csv += `t(s),d(m),hr(bpm),pace(min/km)\n`;
    }

    rows.forEach(r => {
      if (includeLapTypeColumn) {
        csv += `${csvEscape(r.lap_type || '')},${csvEscape(r.t)},${csvEscape(r.d)},${csvEscape(r.hr)},${csvEscape(r.pace)}\n`;
      } else {
        csv += `${csvEscape(r.t)},${csvEscape(r.d)},${csvEscape(r.hr)},${csvEscape(r.pace)}\n`;
      }
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