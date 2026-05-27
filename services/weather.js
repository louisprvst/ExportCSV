const axios = require('axios');

const METEOSTAT_API_KEY = process.env.METEOSTAT_API_KEY;

// Convertit une date en UTC pour l'API Meteostat.
function getUtcDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Parse les dates Meteostat, en gérant les formats inattendus.
function parseMeteostatTime(pointTime) {
  if (!pointTime) return null;

  const parsed = new Date(pointTime.replace(' ', 'T') + 'Z');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Utilise le point de départ Strava pour récupérer la météo via Meteostat.
function getActivityPoint(activity) {
  if (Array.isArray(activity.start_latlng) && activity.start_latlng.length === 2) {
    const [lat, lon] = activity.start_latlng;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon };
    }
  }

  return null;
}

// Convertit les codes météo de Meteostat en libellés lisibles.
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

// Formate un nombre.
function formatNumber(value, digits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return num.toFixed(digits);
}

// Récupère les données Meteostat pour une localisation et une période données.
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

async function getWeatherSummaryForActivity(activity) {
  const activityStart = new Date(activity.start_date);
  const activityEnd = new Date(activityStart.getTime() + (activity.moving_time || 0) * 1000);
  const activityPoint = getActivityPoint(activity);

  if (!activityPoint) {
    return {
      weather_temp_c: '',
      weather_wspd_kmh: '',
      weather_condition: ''
    };
  }

  const weatherData = await fetchMeteostatHourly({
    lat: activityPoint.lat,
    lon: activityPoint.lon,
    startDate: getUtcDay(activityStart),
    endDate: getUtcDay(activityEnd)
  });

  const weatherPoint = weatherData.find(point => {
    const pointDate = parseMeteostatTime(point.time);
    if (!pointDate) return false;

    return Math.abs(pointDate - activityStart) < 60 * 60 * 1000;
  });

  return {
    weather_temp_c: formatNumber(weatherPoint?.temp),
    weather_wspd_kmh: formatNumber(weatherPoint?.wspd),
    weather_condition: cocoToLabel(weatherPoint?.coco)
  };
}

module.exports = {
  getWeatherSummaryForActivity
};
