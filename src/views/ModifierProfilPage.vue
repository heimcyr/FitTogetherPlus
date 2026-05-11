<template>
  <ion-page>
    <ion-content :fullscreen="true" class="modifier-content">
      <div class="header-bar">
        <button class="back-btn" @click="$router.back()">
          <ion-icon :icon="chevronBackOutline" />
        </button>
        <h1 class="page-title">Mon Profil</h1>
      </div>

      <div v-if="loading" class="loading-container">
        <ion-spinner name="crescent" color="light" />
      </div>
      <div v-else class="form-container">
        <div class="photo-section">
          <div class="avatar-wrapper">
            <img
              v-if="photoUrl"
              :src="photoUrl"
              alt="Photo de profil"
              class="avatar-img"
            />
            <ion-icon v-else :icon="personCircleOutline" class="avatar-placeholder" />
          </div>
          <button class="btn-photo" @click="handlePhotoUpload">
            Modifier la photo de profil
          </button>
        </div>

        <div class="fields-section">
          <div class="field-group">
            <label class="field-label">Nom d'utilisateur</label>
            <input
              v-model="pseudo"
              type="text"
              class="field-input"
              placeholder="Nom d'utilisateur actuelle"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Pseudo</label>
            <input
              v-model="pseudo"
              type="text"
              class="field-input"
              placeholder="Pseudo actuelle"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Bio courte :</label>
            <textarea
              v-model="bio"
              class="field-textarea"
              placeholder="Décrivez-vous en quelques mots..."
              rows="3"
            ></textarea>
          </div>

          <div class="toggle-row">
            <span class="toggle-label">Afficher les badges</span>
            <ion-toggle v-model="afficherBadges" :checked="afficherBadges" />
          </div>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

        <button class="btn-enregistrer" :disabled="saving" @click="handleSave">
          <ion-spinner v-if="saving" name="crescent" />
          <span v-else>Enregistrer</span>
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onFileSelected"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage, IonContent, IonIcon, IonSpinner, IonToggle } from '@ionic/vue';
import { chevronBackOutline, personCircleOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const loading = ref(true);
const saving = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const pseudo = ref('');
const bio = ref('');
const photoUrl = ref('');
const afficherBadges = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
let userId = '';

const loadProfil = async () => {
  loading.value = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  userId = user.id;

  const { data: utilisateur } = await supabase
    .from('utilisateur')
    .select('*')
    .eq('id', user.id)
    .single();

  if (utilisateur) {
    pseudo.value = utilisateur.pseudo || '';
    bio.value = utilisateur.bio || '';
    photoUrl.value = utilisateur.photo_profil || '';
  }

  loading.value = false;
};

const handlePhotoUpload = () => {
  fileInput.value?.click();
};

const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    errorMessage.value = 'Erreur lors de l\'upload de la photo.';
    return;
  }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  photoUrl.value = urlData.publicUrl;
  input.value = '';
};

const handleSave = async () => {
  if (!pseudo.value.trim()) {
    errorMessage.value = 'Le pseudo ne peut pas être vide.';
    return;
  }

  saving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  const updates: Record<string, any> = {
    pseudo: pseudo.value.trim(),
    bio: bio.value.trim() || null
  };

  if (photoUrl.value) {
    updates.photo_profil = photoUrl.value;
  }

  const { error } = await supabase
    .from('utilisateur')
    .update(updates)
    .eq('id', userId);

  saving.value = false;

  if (error) {
    errorMessage.value = 'Erreur lors de la sauvegarde.';
  } else {
    successMessage.value = 'Profil mis à jour !';
    setTimeout(() => { successMessage.value = ''; }, 2000);
  }
};

onMounted(loadProfil);
</script>

<style scoped>
.modifier-content {
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

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.form-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 25px 30px;
}

.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.avatar-wrapper {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 15px;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 140px;
  color: #cccccc;
}

.btn-photo {
  border: 1.5px solid #ffffff;
  border-radius: 20px;
  background: transparent;
  color: #333333;
  padding: 8px 24px;
  font-size: 14px;
  cursor: pointer;
}

.fields-section {
  width: 100%;
  margin-bottom: 20px;
}

.field-group {
  margin-bottom: 15px;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 5px;
}

.field-input {
  width: 100%;
  padding: 12px 15px;
  border: none;
  border-bottom: 1.5px solid #ffffff;
  background: transparent;
  font-size: 15px;
  color: #333333;
  outline: none;
  box-sizing: border-box;
}

.field-input::placeholder {
  color: #aaaaaa;
}

.field-textarea {
  width: 100%;
  padding: 12px 15px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  font-size: 15px;
  color: #333333;
  outline: none;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
}

.field-textarea::placeholder {
  color: #aaaaaa;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.toggle-label {
  font-size: 15px;
  color: #ffffff;
}

.error-message {
  color: #ff4444;
  font-size: 13px;
  margin: 0 0 10px;
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  padding: 5px 15px;
  border-radius: 5px;
}

.success-message {
  color: #28a745;
  font-size: 13px;
  margin: 0 0 10px;
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  padding: 5px 15px;
  border-radius: 5px;
}

.btn-enregistrer {
  border: 1.5px solid #333333;
  border-radius: 20px;
  background: transparent;
  color: #333333;
  padding: 10px 40px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-enregistrer:disabled {
  opacity: 0.7;
}
</style>
