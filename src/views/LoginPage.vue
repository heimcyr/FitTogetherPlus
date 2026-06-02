<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
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

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button class="btn-primary" :disabled="loading" @click="handleLogin">
          <ion-spinner v-if="loading" name="crescent" />
          <span v-else>Se connecter</span>
        </button>

        <p class="forgot-password" @click="handleForgotPassword">Mot de passe oublié ?</p>
        <p v-if="resetMessage" class="reset-message">{{ resetMessage }}</p>
        <div class="separator"></div>

        <p class="switch-text">Pas encore de compte ?</p>
        <router-link to="/inscription" class="switch-link">Créer un compte</router-link>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue';
import { mailOutline, lockClosedOutline } from 'ionicons/icons';
import { supabase } from '@/services/supabase';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const resetMessage = ref('');

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Veuillez remplir tous les champs.';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });

  loading.value = false;

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      errorMessage.value = 'Email ou mot de passe incorrect.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage.value = 'Veuillez confirmer votre email avant de vous connecter.';
    } else {
      errorMessage.value = 'Erreur de connexion. Réessayez.';
    }
  } else {
    router.replace('/tabs/feed');
  }
};

const handleForgotPassword = async () => {
  if (!email.value) {
    errorMessage.value = 'Entrez votre adresse mail pour réinitialiser le mot de passe.';
    return;
  }

  resetMessage.value = '';
  errorMessage.value = '';

  const { error } = await supabase.auth.resetPasswordForEmail(email.value);

  if (error) {
    errorMessage.value = 'Erreur lors de l\'envoi. Réessayez.';
  } else {
    resetMessage.value = 'Un email de réinitialisation a été envoyé.';
  }
};
</script>

<style scoped>
.login-content {
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
  padding: 40px 30px 20px;
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
  margin-top: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
}

.btn-primary:disabled {
  opacity: 0.7;
}

.forgot-password {
  color: #333333;
  font-size: 14px;
  margin: 20px 0 5px;
  cursor: pointer;
}

.reset-message {
  color: #28a745;
  font-size: 13px;
  margin: 5px 0;
  text-align: center;
}

.separator {
  width: 40%;
  height: 1px;
  background: #cccccc;
  margin: 5px 0 25px;
}

.switch-text {
  color: #333333;
  font-size: 14px;
  margin: 0 0 5px;
}

.switch-link {
  color: #4ECDC4;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}
</style>
