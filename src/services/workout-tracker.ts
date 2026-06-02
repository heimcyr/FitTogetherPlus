import { reactive, computed } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';

// --- Constants ---
const CALORIES_PER_STEP = 0.04;
const GPS_ACCURACY_MAX = 30; // meters
const GPS_MIN_DISTANCE_KM = 0.003; // 3m minimum pour éviter le jitter
const AVERAGE_STEP_LENGTH_KM = 0.000762; // ~0.762m fallback

// Step detection with low-pass filter + dynamic threshold
const FILTER_ALPHA = 0.2; // Low-pass filter (~2 Hz cutoff at 60 Hz sampling)
const BASELINE_ALPHA = 0.005; // Very slow baseline tracking
const STEP_PEAK_OFFSET = 0.06; // g above baseline to detect a peak
const STEP_COOLDOWN_MS = 350; // min time between steps (~170 steps/min max)
const STEP_MAX_INTERVAL = 2000; // max time between steps for continuity

// --- Types ---
export interface WorkoutState {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  elapsedMs: number;
  steps: number;
  distanceKm: number;
  laps: number;
  calories: number;
  path: Array<[number, number]>; // [lat, lng]
  currentPosition: { lat: number; lng: number } | null;
}

// --- Haversine distance ---
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function haversineDistance(
  pos1: { lat: number; lng: number },
  pos2: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pos1.lat)) *
      Math.cos(toRad(pos2.lat)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Composable ---
export function useWorkoutTracker() {
  const state = reactive<WorkoutState>({
    status: 'idle',
    elapsedMs: 0,
    steps: 0,
    distanceKm: 0,
    laps: 0,
    calories: 0,
    path: [],
    currentPosition: null,
  });

  // Internal
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let startTimestamp = 0;
  let accumulatedMs = 0;
  let geoWatchId: string | null = null;
  let lastPosition: { lat: number; lng: number } | null = null;
  let accelerometerAvailable = false;

  // Step detector state (low-pass filter + dynamic threshold)
  let filteredMag = 0;
  let baselineMag = 0;
  let baselineInitialized = false;
  let wasAboveThreshold = false;
  let lastStepTime = 0;

  function processAcceleration(x: number, y: number, z: number): boolean {
    const magnitude = Math.sqrt(x * x + y * y + z * z) / 9.81;

    // Low-pass filter to smooth noise
    filteredMag = filteredMag === 0
      ? magnitude
      : filteredMag * (1 - FILTER_ALPHA) + magnitude * FILTER_ALPHA;

    // Track baseline (slow-moving average ~1.0g at rest)
    if (!baselineInitialized) {
      baselineMag = filteredMag;
      baselineInitialized = true;
    } else {
      baselineMag = baselineMag * (1 - BASELINE_ALPHA) + filteredMag * BASELINE_ALPHA;
    }

    const threshold = baselineMag + STEP_PEAK_OFFSET;
    const now = Date.now();

    // Peak detection: signal rises above threshold then falls back
    if (filteredMag > threshold) {
      wasAboveThreshold = true;
    } else if (wasAboveThreshold) {
      wasAboveThreshold = false;
      if (now - lastStepTime > STEP_COOLDOWN_MS) {
        lastStepTime = now;
        return true;
      }
    }

    return false;
  }

  // --- Timer ---
  function startTimer() {
    startTimestamp = Date.now();
    timerInterval = setInterval(() => {
      state.elapsedMs = accumulatedMs + (Date.now() - startTimestamp);
    }, 100);
  }

  function pauseTimer() {
    accumulatedMs += Date.now() - startTimestamp;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // --- Accelerometer ---
  async function startAccelerometer() {
    try {
      await Motion.addListener('accel', (event) => {
        if (state.status !== 'running') return;
        const acc = event.acceleration;
        if (!acc) return;
        if (processAcceleration(acc.x, acc.y, acc.z)) {
          state.steps++;
          state.calories = Math.round(state.steps * CALORIES_PER_STEP);
        }
      });
      accelerometerAvailable = true;
    } catch {
      accelerometerAvailable = false;
    }
  }

  // --- GPS ---
  async function startGPS() {
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted') return;
    } catch {
      // Web fallback - permissions handled by browser
    }

    try {
      geoWatchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        (position, err) => {
          if (err || !position) return;
          if (state.status !== 'running') return;

          const { latitude, longitude, accuracy } = position.coords;
          if (accuracy && accuracy > GPS_ACCURACY_MAX) return;

          const newPos = { lat: latitude, lng: longitude };

          if (lastPosition) {
            const d = haversineDistance(lastPosition, newPos);
            if (d > GPS_MIN_DISTANCE_KM) {
              state.distanceKm += d;
              state.path.push([latitude, longitude]);
              lastPosition = newPos;

              // Fallback: estimer les pas par GPS si pas d'accéléromètre
              if (!accelerometerAvailable) {
                state.steps = Math.round(state.distanceKm / AVERAGE_STEP_LENGTH_KM);
                state.calories = Math.round(state.steps * CALORIES_PER_STEP);
              }
            }
          } else {
            state.path.push([latitude, longitude]);
            lastPosition = newPos;
          }

          state.currentPosition = newPos;
        }
      );
    } catch {
      // GPS non disponible
    }
  }

  // --- Controls ---
  async function start(activityType: string) {
    state.status = 'running';
    state.elapsedMs = 0;
    state.steps = 0;
    state.distanceKm = 0;
    state.laps = 0;
    state.calories = 0;
    state.path = [];
    state.currentPosition = null;
    accumulatedMs = 0;
    lastPosition = null;
    filteredMag = 0;
    baselineMag = 0;
    baselineInitialized = false;
    wasAboveThreshold = false;
    lastStepTime = 0;
    accelerometerAvailable = false;

    startTimer();
    await startAccelerometer();
    await startGPS();
  }

  function pause() {
    if (state.status !== 'running') return;
    state.status = 'paused';
    pauseTimer();
    state.elapsedMs = accumulatedMs;
  }

  function resume() {
    if (state.status !== 'paused') return;
    state.status = 'running';
    lastPosition = null; // éviter le saut de distance pendant la pause
    startTimer();
  }

  function stop() {
    if (state.status === 'idle' || state.status === 'stopped') return;
    if (state.status === 'running') {
      accumulatedMs += Date.now() - startTimestamp;
    }
    state.status = 'stopped';
    state.elapsedMs = accumulatedMs;

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function addLap() {
    if (state.status === 'running') {
      state.laps++;
    }
  }

  async function cleanup() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    try {
      await Motion.removeAllListeners();
    } catch {
      // ignore
    }
    if (geoWatchId) {
      try {
        await Geolocation.clearWatch({ id: geoWatchId });
      } catch {
        // ignore
      }
      geoWatchId = null;
    }
  }

  // --- Computed ---
  const formattedTime = computed(() => {
    const totalSec = Math.floor(state.elapsedMs / 1000);
    const h = Math.floor(totalSec / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  return { state, start, pause, resume, stop, addLap, cleanup, formattedTime };
}
