<template>
  <ion-page>
    <ion-content :fullscreen="true" class="inscription-content">
      <div class="header-curve">
        <div class="logo-container">
          <div class="logo-icon">
            <img src="/fittogether-mark.svg" alt="FitTogether+" class="logo-img" />
          </div>
          <h1 class="app-title">FitTogether+</h1>
        </div>
      </div>

      <div class="form-container">
        <div class="input-wrapper">
          <ion-icon :icon="personOutline" class="input-icon" />
          <input
            v-model="pseudo"
            type="text"
            placeholder="Nom d'utilisateur"
            class="custom-input"
          />
        </div>

        <div class="input-wrapper">
          <ion-icon :icon="mailOutline" class="input-icon" />
          <input
            v-model="email"
            type="email"
            placeholder="Adresse mail"
            class="custom-input"
          />
        </div>

        <div class="input-wrapper">
          <ion-icon :icon="lockClosedOutline" class="input-icon" />
          <input
            v-model="password"
            type="password"
            placeholder="Mot de passe"
            class="custom-input"
          />
        </div>

        <div class="input-wrapper">
          <ion-icon :icon="lockClosedOutline" class="input-icon" />
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirmer le mot de passe"
            class="custom-input"
          />
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button class="btn-primary" :disabled="loading" @click="handleRegister">
          <ion-spinner v-if="loading" name="crescent" />
          <span v-else>S'enregistrer</span>
        </button>

        <p class="switch-text">Vous avez déjà un compte ?</p>
        <router-link to="/login" class="switch-link">Se connecter</router-link>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { personOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const router = useRouter();
const pseudo = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMessage = ref('');

const handleRegister = async () => {
  if (!pseudo.value || !email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Veuillez remplir tous les champs.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas.';
    return;
  }

  if (password.value.length < 6) {
    errorMessage.value = 'Le mot de passe doit contenir au moins 6 caractères.';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: {
        pseudo: pseudo.value,
      },
    },
  });

  loading.value = false;

  if (error) {
    if (error.message.includes('already registered')) {
      errorMessage.value = 'Cet email est déjà utilisé.';
    } else {
      errorMessage.value = 'Erreur lors de l\'inscription. Réessayez.';
    }
  } else {
    // Créer la ligne dans la table utilisateur
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('utilisateur').insert({
        id: user.id,
        pseudo: pseudo.value,
        email: email.value
      });
    }
    router.replace('/tabs/feed');
  }
};
</script>

<style scoped>
.inscription-content {
  --background: #ffffff;
}

.header-curve {
  background: #4ECDC4;
  border-radius: 0 0 40% 40%;
  padding: 50px 20px 40px;
  text-align: center;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-icon {
  width: 80px;
  height: 80px;
  background: #ffffff;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.logo-img {
  width: 50px;
  height: 50px;
}

.app-title {
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  margin: 12px 0 0;
}

.form-container {
  padding: 30px 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1.5px solid #cccccc;
  border-radius: 30px;
  padding: 12px 20px;
  margin-bottom: 15px;
  background: #ffffff;
}

.input-icon {
  font-size: 20px;
  color: #999999;
  margin-right: 12px;
  flex-shrink: 0;
}

.custom-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 15px;
  color: #333333;
  background: transparent;
  box-sizing: border-box;
  min-width: 0;
}

.custom-input::placeholder {
  color: #aaaaaa;
}

.error-message {
  color: #eb445a;
  font-size: 13px;
  margin: 0 0 10px;
  text-align: center;
}

.btn-primary {
  width: 85%;
  padding: 14px;
  background: #4ECDC4;
  color: #ffffff;
  border: none;
  border-radius: 30px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
}

.btn-primary:disabled {
  opacity: 0.7;
}

.switch-text {
  color: #333333;
  font-size: 14px;
  margin: 25px 0 5px;
}

.switch-link {
  color: #4ECDC4;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}
</style>
