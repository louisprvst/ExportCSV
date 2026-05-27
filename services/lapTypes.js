// Utilitaires type de lap

// Calcule la médiane d'un tableau de nombres
function median(values) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

// Calcule un percentile d'un tableau de nombres
function percentile(values, p) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const ratio = idx - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * ratio;
}

// Classe les laps en 3 types
function inferLapTypesFromMetrics(laps) {
  const intensities = laps.map(lap => {
    const speed = Number(lap.average_speed);
    const hr = Number(lap.average_heartrate);
    if (Number.isFinite(speed)) return speed;
    if (Number.isFinite(hr)) return hr / 100;
    return NaN;
  });

  const validIntensities = intensities.filter(Number.isFinite);
  if (validIntensities.length < 2) {
    return laps.map((_, index) => (index === 0 ? 'warmup' : 'cooldown'));
  }

  const lowBand = percentile(validIntensities, 0.35);
  const highBand = percentile(validIntensities, 0.70);
  const fallback = median(validIntensities);
  const intervalThreshold = Number.isFinite(lowBand) && Number.isFinite(highBand)
    ? (lowBand + highBand) / 2
    : fallback;

  const isFast = intensities.map(v => Number.isFinite(v) && v >= intervalThreshold);
  const firstIntervalIndex = isFast.findIndex(Boolean);

  if (firstIntervalIndex === -1) {
    return laps.map((_, index) => (index === 0 ? 'warmup' : 'cooldown'));
  }

  return laps.map((_, index) => {
    if (index < firstIntervalIndex) return 'warmup';
    if (isFast[index]) return 'intervalle';
    return 'cooldown';
  });
}

module.exports = {
  inferLapTypesFromMetrics
};