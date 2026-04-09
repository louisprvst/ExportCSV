const express = require('express');
const axios = require('axios');
const router = express.Router();

const METEOSTAT_API_KEY = process.env.METEOSTAT_API_KEY;

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

// Convertit une date en UTC pour l'API Meteostat
function getUtcDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Convertit une date au format UTC
function toUtcHourKey(date) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString().slice(0, 13) + ':00:00Z';
}

// Parse les dates Meteostat, en gérant les formats inattendus
function parseMeteostatTime(pointTime) {
  if (!pointTime) return null;

  const parsed = new Date(pointTime.replace(' ', 'T') + 'Z');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Garde uniquement le temps de l'activité
function filterWeatherToActivityWindow(weatherData, activityStart, activityEnd) {
  if (!Array.isArray(weatherData) || weatherData.length === 0) return [];

  const wantedHours = new Set();
  const cursor = new Date(activityStart);
  cursor.setUTCMinutes(0, 0, 0);

  const lastHour = new Date(activityEnd);
  lastHour.setUTCMinutes(0, 0, 0);

  while (cursor <= lastHour) {
    wantedHours.add(toUtcHourKey(cursor));
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }

  return weatherData.filter(point => {
    const pointDate = parseMeteostatTime(point.time);
    if (!pointDate) return false;
    return wantedHours.has(toUtcHourKey(pointDate));
  });
}

// Utilise le point de départ Strava pour récupérer la météo via Meteostat
function getActivityPoint(activity) {
  if (Array.isArray(activity.start_latlng) && activity.start_latlng.length === 2) {
    const [lat, lon] = activity.start_latlng;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon };
    }
  }

  return null;
}

// Convertit les codes météo de Meteostat en libellés lisibles
function cocoToLabel(coco) {
  const code = Number(coco);
  if (!Number.isFinite(code)) return '';

  const labels = {
    1: 'Ciel degage',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    4: 'Brume',
    5: 'Brouillard',
    6: 'Bruine',
    7: 'Bruine',
    8: 'Pluie legere',
    9: 'Pluie',
    10: 'Pluie forte',
    11: 'Averse legere',
    12: 'Averse',
    13: 'Averse forte',
    14: 'Orage',
    15: 'Orage',
    16: 'Orage',
    17: 'Orage',
    18: 'Neige legere',
    19: 'Neige',
    20: 'Neige forte',
    21: 'Averses de neige',
    22: 'Averses de neige',
    23: 'Averses de neige fortes',
    24: 'Gresil',
    25: 'Grele legere',
    26: 'Grele',
    27: 'Tempete de poussiere',
    28: 'Tempete de sable',
    29: 'Brouillard givrant',
    30: 'Temps variable'
  };

  return labels[code] || `Code meteo ${code}`;
}

// Formate un nombre
function formatNumber(value, digits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return num.toFixed(digits);
}

// Résume le retour de l'api pour n'avoir que les infos utiles
function aggregateWeatherSummary(weatherData) {
  if (!Array.isArray(weatherData) || weatherData.length === 0) {
    return {};
  }

  const temps = [];
  const wspds = [];
  const cocoCounts = new Map();

  weatherData.forEach(point => {
    const temp = Number(point.temp);
    const wspd = Number(point.wspd);
    const coco = Number(point.coco);

    if (Number.isFinite(temp)) temps.push(temp);
    if (Number.isFinite(wspd)) wspds.push(wspd);
    if (Number.isFinite(coco)) {
      cocoCounts.set(coco, (cocoCounts.get(coco) || 0) + 1);
    }
  });

  const avg = values => values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : '';

  let dominantCoco = '';
  let dominantCount = 0;

  for (const [code, count] of cocoCounts.entries()) {
    if (count > dominantCount) {
      dominantCoco = code;
      dominantCount = count;
    }
  }

  return {
    weather_temp_c: formatNumber(avg(temps), 1),
    weather_wspd_kmh: formatNumber(avg(wspds), 1),
    weather_condition: cocoToLabel(dominantCoco)
  };
}

// Récupère les données pour une localisation et une période données
async function fetchMeteostatHourly({ lat, lon, startDate, endDate }) {
  // Si la clé n'est pas fournie, l'export continue sans météo.
  if (!METEOSTAT_API_KEY) return [];

  try {
    const response = await axios.get('https://meteostat.p.rapidapi.com/point/hourly', {
      headers: {
        'x-rapidapi-host': 'meteostat.p.rapidapi.com',
        'x-rapidapi-key': METEOSTAT_API_KEY
      },
      params: {
        lat,
        lon,
        start: startDate,
        end: endDate,
        tz: 'UTC',
        model: 'true',
        units: 'metric'
      }
    });

    return response.data?.data || [];
  }
  catch (err) {
    console.warn('[meteostat] Impossible de récupérer la météo :', err.response?.data || err.message);
    return [];
  }
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

    const activityStart = new Date(a.start_date);
    const activityEnd = new Date(activityStart.getTime() + (a.moving_time || 0) * 1000);
    const activityPoint = getActivityPoint(a);

    const weatherData = activityPoint
      ? await fetchMeteostatHourly({
          lat: activityPoint.lat,
          lon: activityPoint.lon,
          startDate: getUtcDay(activityStart),
          endDate: getUtcDay(activityEnd)
        })
      : [];

    // Donnée météo globale calculée sur les heures de la course.
    const weatherDataDuringActivity = filterWeatherToActivityWindow(weatherData, activityStart, activityEnd);
    const weatherSummary = aggregateWeatherSummary(weatherDataDuringActivity);

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

    csv += `t(s),d(m),hr(bpm),pace(min/km)\n`;

    rows.forEach(r => {
      csv += `${csvEscape(r.t)},${csvEscape(r.d)},${csvEscape(r.hr)},${csvEscape(r.pace)}\n`;
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