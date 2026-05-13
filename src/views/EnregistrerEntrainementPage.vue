<template>
  <ion-page>
    <ion-content :fullscreen="true" class="enregistrer-content">
      <div class="header-bar">
        <button class="back-btn" @click="$router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">Enregistrer un<br>entraînement</h1>
      </div>

      <div class="form-container">
        <!-- Nom de l'entraînement -->
        <div class="field-group">
          <label class="field-label">Nom de l'entraînement</label>
          <input v-model="form.nom" type="text" class="field-input" placeholder="Ex: Course matinale" />
        </div>

        <!-- Grille de métriques -->
        <div class="metrics-grid">
          <div class="metric-cell">
            <label>Nombre de tour</label>
            <input v-model="form.nbTours" type="number" min="0" placeholder="0" class="metric-input" />
          </div>
          <div class="metric-cell">
            <label>Catégorie</label>
            <select v-model="form.categorie" class="metric-select">
              <option value="" disabled>Choisir</option>
              <option value="course">Course</option>
              <option value="velo">Vélo</option>
              <option value="natation">Natation</option>
              <option value="musculation">Musculation</option>
              <option value="marche">Marche</option>
              <option value="yoga">Yoga</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="metric-cell">
            <label>Nombre de pas</label>
            <input v-model="form.nbPas" type="number" min="0" placeholder="0" class="metric-input" />
          </div>
          <div class="metric-cell">
            <label>Distance (Km)</label>
            <input v-model="form.distance" type="number" min="0" step="0.1" placeholder="0" class="metric-input" />
          </div>
          <div class="metric-cell">
            <label>Calories (kcal)</label>
            <input v-model="form.calories" type="number" min="0" placeholder="0" class="metric-input" />
          </div>
          <div class="metric-cell">
            <label>Temps (h.m.s)</label>
            <div class="time-input-row">
              <input v-model="form.heures" type="number" min="0" max="23" placeholder="00" class="time-mini" />
              <span>.</span>
              <input v-model="form.minutes" type="number" min="0" max="59" placeholder="00" class="time-mini" />
              <span>.</span>
              <input v-model="form.secondes" type="number" min="0" max="59" placeholder="00" class="time-mini" />
            </div>
          </div>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Publier sur le feed</span>
          <ion-toggle v-model="form.publier" :checked="form.publier" />
        </div>

        <div v-if="form.publier" class="field-group">
          <label class="field-label">Description (pour le feed)</label>
          <textarea v-model="form.description" class="field-textarea" placeholder="Décrivez votre entraînement..." rows="2"></textarea>
        </div>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-text">{{ successMessage }}</p>

        <div class="form-actions">
          <button class="btn-save" :disabled="saving" @click="handleSave">
            <ion-spinner v-if="saving" name="crescent" />
            <span v-else>Enregistrer</span>
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner, IonToggle } from '@ionic/vue';
import { chevronBackOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const router = useRouter();
const saving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const form = ref({
  nom: '',
  categorie: '',
  nbTours: '',
  nbPas: '',
  distance: '',
  calories: '',
  heures: '',
  minutes: '',
  secondes: '',
  publier: false,
  description: ''
});

const handleSave = async () => {
  if (!form.value.nom.trim()) {
    errorMessage.value = 'Le nom est obligatoire.';
    return;
  }
  if (!form.value.categorie) {
    errorMessage.value = 'La catégorie est obligatoire.';
    return;
  }

  saving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const h = form.value.heures || '0';
  const m = form.value.minutes || '0';
  const s = form.value.secondes || '0';
  const duree = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;

  const { data: entrainement, error } = await supabase
    .from('entrainement')
    .insert({
      id_utilisateur: user.id,
      nom: form.value.nom.trim(),
      categorie: form.value.categorie,
      type_activite: form.value.categorie,
      nb_tours: form.value.nbTours ? parseInt(form.value.nbTours) : null,
      nb_pas: form.value.nbPas ? parseInt(form.value.nbPas) : null,
      distance_km: form.value.distance ? parseFloat(form.value.distance) : null,
      calories: form.value.calories ? parseInt(form.value.calories) : null,
      duree: duree !== '00:00:00' ? duree : null,
      date_enregistrement: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    errorMessage.value = 'Erreur lors de l\'enregistrement.';
    saving.value = false;
    return;
  }

  // Publier sur le feed si demandé
  if (form.value.publier && entrainement) {
    await supabase
      .from('publication')
      .insert({
        id_utilisateur: user.id,
        id_entrainement: entrainement.id,
        description: form.value.description.trim() || null
      });
  }

  saving.value = false;
  successMessage.value = 'Entraînement enregistré !';

  setTimeout(() => {
    router.back();
  }, 1000);
};
</script>

<style scoped>
.enregistrer-content {
  --background: #ffffff;
}

.header-bar {
  background: #4ECDC4;
  display: flex;
  align-items: flex-start;
  padding: 15px 15px 20px;
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
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  text-align: center;
  padding-right: 30px;
  line-height: 1.3;
}

.form-container {
  padding: 20px;
}

.field-group {
  margin-bottom: 18px;
}

.field-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 6px;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  color: #333333;
  outline: none;
  background: #ffffff;
  box-sizing: border-box;
}

.field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #333333;
  outline: none;
  resize: none;
  font-family: inherit;
  background: #ffffff;
  box-sizing: border-box;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 12px;
}

.metric-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-cell label {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 4px;
  text-align: center;
}

.metric-input {
  width: 80%;
  padding: 8px;
  border: none;
  border-bottom: 1.5px solid #e0e0e0;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
  background: transparent;
  outline: none;
}

.metric-select {
  width: 80%;
  padding: 8px;
  border: none;
  border-bottom: 1.5px solid #e0e0e0;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #333333;
  background: transparent;
  outline: none;
  appearance: none;
}

.time-input-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.time-mini {
  width: 32px;
  padding: 6px 2px;
  border: none;
  border-bottom: 1.5px solid #e0e0e0;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  background: transparent;
  outline: none;
}

.time-input-row span {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 8px 0;
}

.toggle-label {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}

.error-text {
  color: #eb445a;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

.success-text {
  color: #28a745;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.btn-save {
  padding: 12px 40px;
  border: 1.5px solid #333333;
  border-radius: 25px;
  background: transparent;
  color: #333333;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-save:disabled {
  opacity: 0.7;
}
</style>
