<template>
  <ion-page>
    <ion-content :fullscreen="true" class="creer-defi-content">
      <div class="header-bar">
        <h1 class="page-title">Nouveau défi</h1>
      </div>

      <div class="form-container">
        <!-- Photo picker -->
        <div class="photo-picker" @click="pickPhoto">
          <img v-if="photoPreview" :src="photoPreview" alt="Aperçu" class="photo-preview" />
          <span v-else class="photo-placeholder">Selectionner une photo</span>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onPhotoSelected"
        />

        <!-- Nom du défi -->
        <div class="field-group">
          <label class="field-label-badge">Nom du défi</label>
          <input v-model="form.titre" type="text" class="field-input" placeholder="Long walk more than 50km" />
        </div>

        <!-- Sélectionner une activité -->
        <div class="field-group">
          <div class="select-wrapper">
            <label class="field-label-badge">Sélectionner une activité</label>
            <select v-model="form.typeActivite" class="field-select">
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
        </div>

        <!-- Distance et Durée -->
        <div class="metrics-row">
          <div class="metric-group">
            <label class="metric-label-badge">Distance</label>
            <div class="metric-value-row">
              <input v-model="form.distance" type="number" min="0" step="0.1" placeholder="00" class="metric-field" />
              <span class="metric-unit">KM</span>
            </div>
          </div>
          <div class="metric-group">
            <label class="metric-label-badge">Durée</label>
            <div class="time-input">
              <input v-model="form.heures" type="number" min="0" max="99" placeholder="00" class="time-field" />
              <span class="time-sep">:</span>
              <input v-model="form.minutes" type="number" min="0" max="59" placeholder="00" class="time-field" />
              <span class="time-sep">:</span>
              <input v-model="form.secondes" type="number" min="0" max="59" placeholder="00" class="time-field" />
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="field-group description-group">
          <label class="field-label-badge description-label">Description</label>
          <textarea
            v-model="form.description"
            class="description-textarea"
            placeholder="This was a amazing trip, with this mushroom all the long of the trail."
            rows="3"
          ></textarea>
        </div>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

        <!-- Boutons -->
        <div class="form-actions">
          <button class="btn-publier" :disabled="saving" @click="handleCreate">
            <ion-spinner v-if="saving" name="crescent" />
            <span v-else>Publier</span>
          </button>
          <button class="btn-annuler" @click="$router.back()">Annuler</button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonSpinner } from '@ionic/vue';
import { supabase } from '@/services/supabase';

const router = useRouter();
const saving = ref(false);
const errorMessage = ref('');
const photoPreview = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
let photoFile: File | null = null;

const form = ref({
  titre: '',
  typeActivite: '',
  distance: '',
  heures: '',
  minutes: '',
  secondes: '',
  description: ''
});

const pickPhoto = () => {
  fileInput.value?.click();
};

const onPhotoSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  photoFile = input.files[0];
  photoPreview.value = URL.createObjectURL(photoFile);
};

const handleCreate = async () => {
  if (!form.value.titre.trim()) {
    errorMessage.value = 'Le nom du défi est obligatoire.';
    return;
  }
  if (!form.value.typeActivite) {
    errorMessage.value = 'Veuillez sélectionner une activité.';
    return;
  }

  saving.value = true;
  errorMessage.value = '';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let photoUrl: string | null = null;

  if (photoFile) {
    const fileExt = photoFile.name.split('.').pop();
    const filePath = `defis/${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('publications')
      .upload(filePath, photoFile);

    if (uploadError) {
      errorMessage.value = 'Erreur lors de l\'upload de la photo.';
      saving.value = false;
      return;
    }

    const { data: urlData } = supabase.storage
      .from('publications')
      .getPublicUrl(filePath);

    photoUrl = urlData.publicUrl;
  }

  const h = form.value.heures || '0';
  const m = form.value.minutes || '0';
  const s = form.value.secondes || '0';
  const duree = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;

  const { data: defi, error } = await supabase
    .from('defi')
    .insert({
      id_utilisateur: user.id,
      titre: form.value.titre.trim(),
      type_activite: form.value.typeActivite,
      description: form.value.description.trim() || null,
      distance_cible_km: form.value.distance ? parseFloat(form.value.distance) : null,
      duree_cible: duree !== '00:00:00' ? duree : null,
      photo_url: photoUrl
    })
    .select('id')
    .single();

  if (error) {
    errorMessage.value = 'Erreur lors de la création du défi.';
    saving.value = false;
    return;
  }

  // Le créateur rejoint automatiquement son défi
  if (defi) {
    await supabase.from('participation_defi').insert({
      id_defi: defi.id,
      id_utilisateur: user.id,
      progression: 0,
      statut: 'en_cours'
    });
  }

  saving.value = false;
  router.replace(`/defi/${defi?.id}`);
};
</script>

<style scoped>
.creer-defi-content {
  --background: #ffffff;
}

.header-bar {
  background: #4ECDC4;
  padding: 20px;
  border-radius: 0 0 20px 20px;
  text-align: center;
}

.page-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.form-container {
  padding: 20px;
}

/* Photo picker */
.photo-picker {
  width: 100%;
  aspect-ratio: 4/3;
  background: #cccccc;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  margin-bottom: 20px;
}

.photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
}

/* Labels style badge turquoise */
.field-label-badge {
  display: inline-block;
  background: #4ECDC4;
  color: #ffffff;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.field-group {
  margin-bottom: 18px;
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

.select-wrapper {
  display: flex;
  flex-direction: column;
}

.field-select {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  color: #333333;
  outline: none;
  background: #ffffff;
  appearance: auto;
}

/* Metrics row */
.metrics-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.metric-group {
  flex: 1;
  text-align: center;
}

.metric-label-badge {
  display: inline-block;
  background: #4ECDC4;
  color: #ffffff;
  padding: 4px 14px;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.metric-value-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.metric-field {
  width: 60px;
  padding: 8px 4px;
  border: none;
  border-bottom: 2px solid #333333;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: #333333;
  background: transparent;
  outline: none;
}

.metric-unit {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
}

.time-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.time-field {
  width: 36px;
  padding: 8px 2px;
  border: none;
  border-bottom: 2px solid #333333;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: #333333;
  background: transparent;
  outline: none;
}

.time-sep {
  font-size: 22px;
  font-weight: 700;
  color: #333333;
}

/* Description */
.description-group {
  background: #4ECDC4;
  border-radius: 12px;
  padding: 15px;
}

.description-label {
  background: transparent;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  padding: 0;
  margin-bottom: 8px;
}

.description-textarea {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  color: #ffffff;
  resize: none;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.description-textarea::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.error-text {
  color: #eb445a;
  font-size: 13px;
  text-align: center;
  margin: 0 0 10px;
}

/* Boutons */
.form-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.btn-publier {
  padding: 12px 30px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-publier:disabled {
  opacity: 0.7;
}

.btn-annuler {
  padding: 12px 30px;
  background: #eb445a;
  color: #ffffff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
