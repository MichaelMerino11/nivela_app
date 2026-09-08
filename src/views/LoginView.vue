<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const resetLoading = ref(false)
const resetMessage = ref('')

async function sendPasswordReset() {
  errorMessage.value = ''
  resetMessage.value = ''

  if (!email.value.trim()) {
    errorMessage.value = 'Escribe primero tu correo electrónico.'
    return
  }

  try {
    resetLoading.value = true

    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      throw error
    }

    resetMessage.value = 'Te enviamos un enlace para cambiar tu contraseña. Revisa tu correo.'
  } catch (error: any) {
    console.error('ERROR RECUPERANDO CONTRASEÑA:', error)

    errorMessage.value = error?.message || 'No pudimos enviar el correo de recuperación.'
  } finally {
    resetLoading.value = false
  }
}

async function login() {
  errorMessage.value = ''

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Ingresa tu correo y contraseña.'
    return
  }

  try {
    loading.value = true

    await authStore.signIn(email.value.trim(), password.value)

    await router.replace('/')
  } catch (error: any) {
    console.error('ERROR LOGIN SUPABASE:', error)

    if (error?.message === 'Invalid login credentials') {
      errorMessage.value = 'El correo o la contraseña no son correctos.'
      return
    }

    errorMessage.value = 'No pudimos iniciar sesión. Inténtalo nuevamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-background login-background--one" />
    <div class="login-background login-background--two" />

    <main class="login-container">
      <!-- IDENTIDAD -->
      <section class="login-intro">
        <div class="brand">
          <div class="brand-logo">N</div>

          <div>
            <strong>Nivela</strong>
            <span>Finanzas personales</span>
          </div>
        </div>

        <div class="intro-content">
          <span class="eyebrow"> CONTROL SIN COMPLICACIONES </span>

          <h1>
            Tu dinero.
            <br />
            Tu tranquilidad.
          </h1>

          <p>
            Planifica tus gastos hasta tu siguiente sueldo, protege tu ahorro y conoce cuánto puedes
            gastar sin preocuparte después.
          </p>

          <div class="feature-card">
            <div class="feature-icon">
              <ShieldCheck :size="22" />
            </div>

            <div>
              <strong>Información privada</strong>

              <span>
                Esta aplicación está diseñada exclusivamente para tu administración financiera
                personal.
              </span>
            </div>
          </div>
        </div>

        <div class="intro-footer">Nivela · Finanzas personales</div>
      </section>

      <!-- LOGIN -->
      <section class="login-section">
        <div class="mobile-brand">
          <div class="brand-logo brand-logo--small">N</div>

          <strong>Nivela</strong>
        </div>

        <div class="login-box">
          <div class="login-heading">
            <span class="eyebrow"> BIENVENIDO </span>

            <h2>Inicia sesión</h2>

            <p>Accede a tu planificación financiera personal.</p>
          </div>

          <form class="login-form" @submit.prevent="login">
            <div class="field-group">
              <label for="email"> Correo electrónico </label>

              <div class="input-wrapper">
                <Mail :size="18" />

                <input
                  id="email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div class="field-group">
              <label for="password"> Contraseña </label>

              <div class="input-wrapper">
                <LockKeyhole :size="18" />

                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Tu contraseña"
                />

                <button
                  class="password-toggle"
                  type="button"
                  tabindex="-1"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="18" />

                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>
            <div class="forgot-password">
              <button type="button" :disabled="resetLoading" @click="sendPasswordReset">
                {{ resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?' }}
              </button>
            </div>

            <transition name="error">
              <div v-if="resetMessage" class="reset-message">
                {{ resetMessage }}
              </div>
            </transition>

            <transition name="error">
              <div v-if="errorMessage" class="login-error">
                {{ errorMessage }}
              </div>
            </transition>

            <button type="submit" class="login-button" :disabled="loading">
              <span>
                {{ loading ? 'Ingresando...' : 'Entrar a Nivela' }}
              </span>

              <ArrowRight v-if="!loading" :size="18" />

              <v-progress-circular v-else indeterminate :size="19" :width="2" />
            </button>
          </form>

          <div class="login-note">
            <LockKeyhole :size="14" />

            <span>
              Tu información financiera permanece protegida mediante tu sesión personal.
            </span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  position: relative;

  min-height: 100vh;
  overflow: hidden;

  background: #f7f9fc;
}

.login-background {
  position: absolute;

  border-radius: 50%;

  filter: blur(1px);
  pointer-events: none;
}

.login-background--one {
  top: -220px;
  right: -160px;

  width: 620px;
  height: 620px;

  background: radial-gradient(circle, rgba(59, 130, 246, 0.12), transparent 68%);
}

.login-background--two {
  bottom: -300px;
  left: 20%;

  width: 700px;
  height: 700px;

  background: radial-gradient(circle, rgba(99, 102, 241, 0.08), transparent 68%);
}

.login-container {
  position: relative;
  z-index: 1;

  display: grid;

  width: 100%;
  min-height: 100vh;

  grid-template-columns:
    minmax(420px, 0.85fr)
    minmax(520px, 1.15fr);
}

.login-intro {
  display: flex;
  flex-direction: column;

  padding: 44px 58px;

  background: linear-gradient(145deg, #ffffff 0%, #f4f8ff 58%, #eef5ff 100%);

  border-right: 1px solid #e5ebf3;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  display: grid;

  width: 46px;
  height: 46px;

  place-items: center;

  border-radius: 14px;

  background: linear-gradient(135deg, #3b82f6, #6366f1);

  color: white;

  font-size: 20px;
  font-weight: 800;

  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.23);
}

.brand-logo--small {
  width: 39px;
  height: 39px;

  border-radius: 12px;

  font-size: 16px;
}

.brand > div:last-child {
  display: flex;
  flex-direction: column;
}

.brand strong {
  color: #0f172a;

  font-size: 20px;
  font-weight: 800;
}

.brand span {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 11px;
}

.intro-content {
  max-width: 520px;

  margin: auto 0;
}

.eyebrow {
  display: block;

  margin-bottom: 10px;

  color: #3b82f6;

  font-size: 10px;
  font-weight: 800;

  letter-spacing: 1.6px;
}

.intro-content h1 {
  margin: 0;

  color: #0f172a;

  font-size: clamp(44px, 5vw, 68px);
  font-weight: 800;

  line-height: 1.02;
  letter-spacing: -3px;
}

.intro-content > p {
  max-width: 460px;

  margin: 24px 0 32px;

  color: #64748b;

  font-size: 14px;
  line-height: 1.8;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 13px;

  max-width: 440px;

  padding: 17px;

  border: 1px solid rgba(219, 234, 254, 0.9);
  border-radius: 17px;

  background: rgba(255, 255, 255, 0.72);

  backdrop-filter: blur(12px);
}

.feature-icon {
  display: grid;

  width: 42px;
  height: 42px;

  place-items: center;
  flex-shrink: 0;

  border-radius: 13px;

  background: #edf5ff;
  color: #3b82f6;
}

.feature-card > div:last-child {
  display: flex;
  flex-direction: column;
}

.feature-card strong {
  color: #1e293b;

  font-size: 11px;
}

.feature-card span {
  margin-top: 4px;

  color: #64748b;

  font-size: 10px;
  line-height: 1.6;
}

.intro-footer {
  color: #94a3b8;

  font-size: 10px;
}

.login-section {
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 44px;

  background: rgba(247, 249, 252, 0.7);
}

.mobile-brand {
  display: none;
}

.login-box {
  width: 100%;
  max-width: 430px;

  padding: 38px;

  border: 1px solid #e5eaf1;
  border-radius: 26px;

  background: rgba(255, 255, 255, 0.94);

  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.08);

  backdrop-filter: blur(18px);
}

.login-heading h2 {
  margin: 0;

  color: #0f172a;

  font-size: 29px;
  font-weight: 800;

  letter-spacing: -0.9px;
}

.login-heading p {
  margin: 8px 0 0;

  color: #64748b;

  font-size: 12px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;

  margin-top: 30px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field-group label {
  color: #334155;

  font-size: 10px;
  font-weight: 700;
}

.input-wrapper {
  display: flex;
  min-height: 50px;
  align-items: center;
  gap: 10px;

  padding: 0 14px;

  border: 1px solid #dce3ec;
  border-radius: 14px;

  background: #fbfcfe;
  color: #94a3b8;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: #93bdfb;

  background: #ffffff;

  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
}

.input-wrapper input {
  width: 100%;
  min-width: 0;

  border: 0;
  outline: 0;

  background: transparent;

  color: #0f172a;

  font-size: 12px;
}

.input-wrapper input::placeholder {
  color: #b1bac8;
}

.password-toggle {
  display: grid;
  place-items: center;

  padding: 4px;

  border: 0;

  background: transparent;
  color: #94a3b8;

  cursor: pointer;
}

.login-error {
  padding: 11px 13px;

  border: 1px solid #fecaca;
  border-radius: 12px;

  background: #fff5f5;
  color: #dc2626;

  font-size: 10px;
}

.login-button {
  display: flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: 9px;

  margin-top: 4px;

  border: 0;
  border-radius: 14px;

  background: linear-gradient(135deg, #3b82f6, #3978ed);

  color: #ffffff;

  cursor: pointer;

  font-size: 11px;
  font-weight: 700;

  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.22);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);

  box-shadow: 0 15px 34px rgba(59, 130, 246, 0.28);
}

.login-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.login-note {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;

  margin-top: 22px;

  color: #94a3b8;

  font-size: 9px;
  line-height: 1.5;

  text-align: center;
}

.error-enter-active,
.error-leave-active {
  transition: all 0.2s ease;
}

.error-enter-from,
.error-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 960px) {
  .login-container {
    display: block;
  }

  .login-intro {
    display: none;
  }

  .login-section {
    min-height: 100vh;

    align-items: flex-start;

    padding: 24px 18px;
  }

  .mobile-brand {
    position: absolute;

    top: 24px;
    left: 24px;

    display: flex;
    align-items: center;
    gap: 9px;

    color: #0f172a;
  }

  .mobile-brand strong {
    font-size: 17px;
    font-weight: 800;
  }

  .login-box {
    max-width: 420px;

    margin-top: 96px;
    padding: 28px 24px;

    border-radius: 22px;
  }
}

@media (max-width: 480px) {
  .login-section {
    padding: 18px 14px;
  }

  .mobile-brand {
    top: 20px;
    left: 20px;
  }

  .login-box {
    margin-top: 82px;
    padding: 25px 20px;
  }

  .login-heading h2 {
    font-size: 25px;
  }
}

.forgot-password {
  display: flex;
  justify-content: flex-end;

  margin-top: -8px;
}

.forgot-password button {
  padding: 2px 0;

  border: 0;

  background: transparent;
  color: #3b82f6;

  cursor: pointer;

  font-size: 10px;
  font-weight: 600;

  transition:
    color 0.2s ease,
    opacity 0.2s ease;
}

.forgot-password button:hover:not(:disabled) {
  color: #2563eb;
}

.forgot-password button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.reset-message {
  padding: 11px 13px;

  border: 1px solid #bbf7d0;
  border-radius: 12px;

  background: #f0fdf4;
  color: #15803d;

  font-size: 10px;
  line-height: 1.5;
}
</style>
