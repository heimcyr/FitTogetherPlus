import { reactive, computed } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import { onStep } from './pedometer';

// --- Constants ---
const CALORIES_PER_STEP = 0.04;
const GPS_ACCURACY_MAX = 30; // meters
const GPS_MIN_DISTANCE_KM = 0.003; // 3m minimum pour éviter le jitter
const AVERAGE_STEP_LENGTH_KM = 0.000762; // ~0.762m fallback

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
  let unsubscribeSteps: (() => void) | null = null;

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

    startTimer();

    // Subscribe to global pedometer step events
    unsubscribeSteps = onStep(() => {
      if (state.status === 'running') {
        state.steps++;
        state.calories = Math.round(state.steps * CALORIES_PER_STEP);
      }
    });

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
    // Unsubscribe from pedometer (don't kill the global listener)
    if (unsubscribeSteps) {
      unsubscribeSteps();
      unsubscribeSteps = null;
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
