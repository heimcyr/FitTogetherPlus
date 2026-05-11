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

      <div v-else class="stats-container">
        <div class="stat-card">
          <ion-icon :icon="footstepsOutline" class="card-icon" />
          <div class="card-value">{{ dayData.nb_pas }}</div>
          <div class="card-label">Pas</div>
        </div>
        <div class="stat-card">
          <ion-icon :icon="flameOutline" class="card-icon" />
          <div class="card-value">{{ dayData.calories }}</div>
          <div class="card-label">Calories</div>
        </div>
      </div>

      <!-- Historique semaine -->
      <div class="week-section">
        <h3 class="week-title">Cette semaine</h3>
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
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { chevronBackOutline, chevronForwardOutline, footstepsOutline, flameOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const loading = ref(true);
const currentDate = ref(new Date());

const dayData = ref({ nb_pas: 0, calories: 0 });
const weekData = ref<any[]>([]);

const joursCourts = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const formatDateDisplay = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

const formatDateISO = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const changeDate = (delta: number) => {
  const newDate = new Date(currentDate.value);
  newDate.setDate(newDate.getDate() + delta);
  currentDate.value = newDate;
  loadData();
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
  padding: 0 20px 20px;
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

.week-section {
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  min-height: 200px;
}

.week-title {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin: 0 0 15px;
}

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
