<template>
  <ion-page>
    <ion-content :fullscreen="true" class="historique-content">
      <div class="header-bar">
        <button class="back-btn" @click="$router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">Historique</h1>
      </div>

      <!-- Sélecteur de date -->
      <div class="date-selector">
        <button class="nav-btn" @click="changeDate(-1)">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <span class="date-label">{{ formatDateDisplay(currentDate) }}</span>
        <button class="nav-btn" @click="changeDate(1)">
          <ion-icon :icon="chevronForwardOutline" />
        </button>
      </div>

      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="light" />
      </div>

      <div v-else>
        <!-- Stats du jour + objectif -->
        <div class="stats-container">
          <div class="stat-card">
            <ion-icon :icon="footstepsOutline" class="card-icon" />
            <div class="card-value">{{ dayData.nb_pas }}</div>
            <div class="card-label">Pas</div>
            <div class="objectif-bar">
              <div class="objectif-fill" :style="{ width: objectifPercent + '%' }"></div>
            </div>
            <div class="objectif-text">{{ objectifPercent }}% de {{ OBJECTIF_PAS }}</div>
          </div>
          <div class="stat-card">
            <ion-icon :icon="flameOutline" class="card-icon" />
            <div class="card-value">{{ dayData.calories }}</div>
            <div class="card-label">Calories</div>
          </div>
        </div>

        <!-- Bouton ajouter des pas -->
        <div class="add-steps-section">
          <button v-if="!showAddForm" class="btn-add-steps" @click="showAddForm = true">
            <ion-icon :icon="addCircleOutline" />
            <span>Ajouter des pas manuellement</span>
          </button>
          <div v-else class="add-form">
            <div class="form-row">
              <div class="form-group">
                <label>Pas</label>
                <input v-model="manualPas" type="number" min="0" placeholder="0" class="form-input" />
              </div>
              <div class="form-group">
                <label>Calories</label>
                <div class="calories-auto">{{ manualCaloriesAuto }}</div>
              </div>
            </div>
            <p v-if="addError" class="add-error">{{ addError }}</p>
            <div class="form-buttons">
              <button class="btn-confirm" :disabled="saving" @click="handleAddSteps">
                <ion-spinner v-if="saving" name="crescent" />
                <span v-else>Enregistrer</span>
              </button>
              <button class="btn-cancel" @click="showAddForm = false; addError = ''">Annuler</button>
            </div>
          </div>
        </div>

        <!-- Section blanche : graphique + semaine -->
        <div class="white-section">
          <!-- Graphique pas (30 jours) -->
          <h3 class="section-title">Pas (30 derniers jours)</h3>
          <div class="chart-container">
            <div class="chart-y-axis">
              <span>{{ chartMaxPas }}</span>
              <span>{{ Math.round(chartMaxPas / 2) }}</span>
              <span>0</span>
            </div>
            <div class="chart-bars">
              <div
                v-for="(day, i) in monthBars"
                :key="i"
                class="chart-bar-col"
                :title="day.label + ': ' + day.nb_pas + ' pas'"
              >
                <div class="chart-bar" :style="{ height: day.barHeight + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Historique semaine -->
          <h3 class="section-title">Cette semaine</h3>
          <div class="week-list">
            <div v-for="day in weekData" :key="day.jour" class="week-item">
              <span class="week-day">{{ day.jourLabel }}</span>
              <div class="week-bar-container">
                <div class="week-bar" :style="{ width: day.barWidth + '%' }"></div>
              </div>
              <span class="week-value">{{ day.nb_pas }}</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import {
  chevronBackOutline, chevronForwardOutline, footstepsOutline,
  flameOutline, addCircleOutline
} from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const CALORIES_PER_STEP = 0.04;

const loading = ref(true);
const saving = ref(false);
const currentDate = ref(new Date());
const showAddForm = ref(false);
const manualPas = ref('');
const addError = ref('');

const manualCaloriesAuto = computed(() => {
  const pas = parseInt(manualPas.value) || 0;
  return Math.round(pas * CALORIES_PER_STEP);
});

const OBJECTIF_PAS = 10000;

const dayData = ref({ nb_pas: 0, calories: 0 });
const weekData = ref<any[]>([]);
const monthData = ref<any[]>([]);

const joursCourts = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const objectifPercent = computed(() => {
  return Math.min(100, Math.round((dayData.value.nb_pas / OBJECTIF_PAS) * 100));
});

// Graphique barres (30 jours)
const chartMaxPas = computed(() => {
  const max = Math.max(...monthData.value.map(d => d.nb_pas), 1);
  return Math.ceil(max / 1000) * 1000 || 1000;
});

const monthBars = computed(() => {
  const bars: Array<{ label: string; nb_pas: number; barHeight: number }> = [];
  const today = new Date();
  const maxPas = chartMaxPas.value;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateISO(d);
    const found = monthData.value.find((m: any) => m.jour === dateStr);
    const pas = found?.nb_pas || 0;
    bars.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      nb_pas: pas,
      barHeight: maxPas > 0 ? (pas / maxPas) * 100 : 0,
    });
  }
  return bars;
});

const formatDateDisplay = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

const formatDateISO = (date: Date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const changeDate = (delta: number) => {
  const newDate = new Date(currentDate.value);
  newDate.setDate(newDate.getDate() + delta);
  currentDate.value = newDate;
  loadData();
};

const handleAddSteps = async () => {
  const pas = parseInt(manualPas.value) || 0;

  if (pas <= 0) {
    addError.value = 'Entrez un nombre de pas.';
    return;
  }

  const cal = Math.round(pas * CALORIES_PER_STEP);

  saving.value = true;
  addError.value = '';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const jour = formatDateISO(currentDate.value);

  // Vérifier si une entrée existe déjà
  const { data: existing } = await supabase
    .from('historique_pas')
    .select('id, nb_pas, calories')
    .eq('id_utilisateur', user.id)
    .eq('jour', jour)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('historique_pas')
      .update({
        nb_pas: existing.nb_pas + pas,
        calories: existing.calories + cal
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('historique_pas').insert({
      id_utilisateur: user.id,
      jour,
      nb_pas: pas,
      calories: cal
    });
  }

  saving.value = false;
  showAddForm.value = false;
  manualPas.value = '';
  await loadData();
};

const loadData = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Données du jour sélectionné
  const { data: dayResult } = await supabase
    .from('historique_pas')
    .select('nb_pas, calories')
    .eq('id_utilisateur', user.id)
    .eq('jour', formatDateISO(currentDate.value))
    .maybeSingle();

  dayData.value = dayResult || { nb_pas: 0, calories: 0 };

  // Données de la semaine
  const startOfWeek = new Date(currentDate.value);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const { data: weekResult } = await supabase
    .from('historique_pas')
    .select('jour, nb_pas, calories')
    .eq('id_utilisateur', user.id)
    .gte('jour', formatDateISO(startOfWeek))
    .lte('jour', formatDateISO(endOfWeek))
    .order('jour');

  const week: any[] = [];
  let maxPas = 1;

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateISO(d);
    const found = weekResult?.find((w: any) => w.jour === dateStr);
    const pas = found?.nb_pas || 0;
    if (pas > maxPas) maxPas = pas;
    week.push({
      jour: dateStr,
      jourLabel: joursCourts[d.getDay()],
      nb_pas: pas,
      barWidth: 0
    });
  }

  week.forEach(d => { d.barWidth = (d.nb_pas / maxPas) * 100; });
  weekData.value = week;

  // Données du mois (30 derniers jours) pour le graphique
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: monthResult } = await supabase
    .from('historique_pas')
    .select('jour, nb_pas, calories')
    .eq('id_utilisateur', user.id)
    .gte('jour', formatDateISO(thirtyDaysAgo))
    .order('jour');

  monthData.value = monthResult || [];

  loading.value = false;
};

onMounted(loadData);
</script>

<style scoped>
.historique-content {
  --background: #4ECDC4;
}

.header-bar {
  display: flex;
  align-items: center;
  padding: 15px 15px 5px;
}

.back-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
}

.page-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  text-align: center;
  padding-right: 30px;
}

.date-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 10px 0 20px;
}

.nav-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.date-label {
  background: #ffffff;
  color: #333333;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.stats-container {
  display: flex;
  gap: 15px;
  padding: 0 20px 15px;
}

.stat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 20px 10px;
  text-align: center;
}

.card-icon {
  font-size: 30px;
  color: #ffffff;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.card-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 3px;
}

/* Objectif */
.objectif-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
}

.objectif-fill {
  height: 100%;
  background: #ffffff;
  border-radius: 3px;
  transition: width 0.3s;
}

.objectif-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

/* Ajout manuel */
.add-steps-section {
  padding: 0 20px 15px;
}

.btn-add-steps {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px dashed rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-add-steps ion-icon {
  font-size: 22px;
}

.add-form {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 15px;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #ffffff;
  font-weight: 600;
  margin-bottom: 4px;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #ffffff;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  text-align: center;
  outline: none;
  box-sizing: border-box;
}

.add-error {
  color: #ff6b6b;
  font-size: 13px;
  text-align: center;
  margin: 0 0 8px;
}

.form-buttons {
  display: flex;
  gap: 10px;
}

.btn-confirm {
  flex: 1;
  padding: 10px;
  background: #ffffff;
  color: #4ECDC4;
  border: none;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.btn-confirm:disabled {
  opacity: 0.7;
}

.btn-cancel {
  flex: 1;
  padding: 10px;
  background: transparent;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

/* Section blanche */
.white-section {
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  min-height: 300px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 12px;
}

/* Calories auto-calculées */
.calories-auto {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  font-weight: 600;
  color: #666666;
  text-align: center;
  box-sizing: border-box;
}

/* Graphique barres */
.chart-container {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  height: 160px;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: #999999;
  width: 35px;
  text-align: right;
  padding: 5px 0;
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  border-left: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 2px;
}

.chart-bar-col {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.chart-bar {
  width: 100%;
  background: #4ECDC4;
  border-radius: 2px 2px 0 0;
  min-height: 1px;
  transition: height 0.3s;
}

/* Historique semaine */
.week-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.week-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.week-day {
  width: 35px;
  font-size: 13px;
  font-weight: 600;
  color: #666666;
}

.week-bar-container {
  flex: 1;
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.week-bar {
  height: 100%;
  background: #4ECDC4;
  border-radius: 6px;
  transition: width 0.3s;
}

.week-value {
  width: 50px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: #333333;
}
</style>
