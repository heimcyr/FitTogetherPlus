import { reactive } from 'vue';
import { Motion } from '@capacitor/motion';
import { supabase } from './supabase';

// --- Constants ---
const CALORIES_PER_STEP = 0.04;
const FILTER_ALPHA = 0.08; // Heavy low-pass filter (kills hand movements)
const BASELINE_ALPHA = 0.003; // Very slow baseline tracking
const STEP_PEAK_OFFSET = 0.25; // g above baseline — requires real walking impact
const STEP_COOLDOWN_MS = 450; // min time between steps (~133 steps/min max)
const SAVE_INTERVAL_MS = 30000; // save to DB every 30s

// --- Reactive state (importable by any page) ---
const state = reactive({
  todaySteps: 0,
  todayCalories: 0,
  isRunning: false,
});

// --- Internal ---
let filteredMag = 0;
let baselineMag = 0;
let baselineInitialized = false;
let wasAboveThreshold = false;
let lastStepTime = 0;
let saveInterval: ReturnType<typeof setInterval> | null = null;
let started = false;
let stepCallbacks: Array<() => void> = [];

function processAcceleration(x: number, y: number, z: number) {
  const magnitude = Math.sqrt(x * x + y * y + z * z) / 9.81;

  // Low-pass filter
  filteredMag = filteredMag === 0
    ? magnitude
    : filteredMag * (1 - FILTER_ALPHA) + magnitude * FILTER_ALPHA;

  // Baseline (slow-moving average)
  if (!baselineInitialized) {
    baselineMag = filteredMag;
    baselineInitialized = true;
  } else {
    baselineMag = baselineMag * (1 - BASELINE_ALPHA) + filteredMag * BASELINE_ALPHA;
  }

  const threshold = baselineMag + STEP_PEAK_OFFSET;
  const now = Date.now();

  // Peak detection: rises above threshold then falls back = 1 step
  if (filteredMag > threshold) {
    wasAboveThreshold = true;
  } else if (wasAboveThreshold) {
    wasAboveThreshold = false;
    if (now - lastStepTime > STEP_COOLDOWN_MS) {
      lastStepTime = now;
      state.todaySteps++;
      state.todayCalories = Math.round(state.todaySteps * CALORIES_PER_STEP);
      stepCallbacks.forEach(cb => cb());
    }
  }
}

async function saveToDatabase() {
  if (state.todaySteps === 0) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('historique_pas')
    .select('id')
    .eq('id_utilisateur', user.id)
    .eq('jour', today)
    .maybeSingle();

  if (existing) {
    await supabase.from('historique_pas')
      .update({ nb_pas: state.todaySteps, calories: state.todayCalories })
      .eq('id', existing.id);
  } else {
    await supabase.from('historique_pas').insert({
      id_utilisateur: user.id,
      jour: today,
      nb_pas: state.todaySteps,
      calories: state.todayCalories,
    });
  }
}

async function loadTodaySteps() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('historique_pas')
    .select('nb_pas, calories')
    .eq('id_utilisateur', user.id)
    .eq('jour', today)
    .maybeSingle();

  if (data) {
    state.todaySteps = data.nb_pas || 0;
    state.todayCalories = data.calories || 0;
  }
}

/**
 * Start the global background pedometer.
 * Call once after user is authenticated.
 */
export async function startPedometer() {
  if (started) return;
  started = true;
  state.isRunning = true;

  // Reset detector state
  filteredMag = 0;
  baselineMag = 0;
  baselineInitialized = false;
  wasAboveThreshold = false;
  lastStepTime = 0;

  await loadTodaySteps();

  try {
    await Motion.addListener('accel', (event: any) => {
      // Prefer accelerationIncludingGravity (available on all devices)
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      processAcceleration(acc.x, acc.y, acc.z);
    });
  } catch {
    state.isRunning = false;
    started = false;
    return;
  }

  // Periodic save to Supabase
  saveInterval = setInterval(saveToDatabase, SAVE_INTERVAL_MS);
}

/**
 * Stop the pedometer and save current progress.
 */
export async function stopPedometer() {
  if (!started) return;
  await saveToDatabase();
  try { await Motion.removeAllListeners(); } catch { /* ignore */ }
  if (saveInterval) { clearInterval(saveInterval); saveInterval = null; }
  started = false;
  state.isRunning = false;
}

/**
 * Force save current steps to DB (call on app background / before close).
 */
export async function savePedometerNow() {
  await saveToDatabase();
}

/**
 * Subscribe to step events. Returns unsubscribe function.
 * Used by workout tracker to count workout-specific steps.
 */
export function onStep(cb: () => void): () => void {
  stepCallbacks.push(cb);
  return () => { stepCallbacks = stepCallbacks.filter(c => c !== cb); };
}

/**
 * Get reactive pedometer state for use in components.
 */
export function usePedometer() {
  return state;
}
