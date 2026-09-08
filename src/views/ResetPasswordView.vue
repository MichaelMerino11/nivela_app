<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-vue-next'

import { supabase } from '@/services/supabase'

const router = useRouter()

const password = ref('')
const confirmPassword = ref('')

const showPassword = ref(false)
const loading = ref(false)

const errorMessage = ref('')
const success = ref(false)

async function updatePassword() {
  errorMessage.value = ''

  if (password.value.length < 8) {
    errorMessage.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    loading.value = true

    const { error } = await supabase.auth.updateUser({
      password: password.value,
    })

    if (error) {
      throw error
    }

    success.value = true

    setTimeout(async () => {
      await router.replace('/')
    }, 1500)
  } catch (error: any) {
    console.error('ERROR CAMBIANDO CONTRASEÑA:', error)

    errorMessage.value = error?.message || 'No se pudo actualizar la contraseña.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="reset-page">
    <div class="reset-card">
      <div class="brand">
        <div class="brand-logo">N</div>

        <div>
          <strong>Nivela</strong>
          <span>Finanzas personales</span>
        </div>
      </div>

      <template v-if="!success">
        <div class="heading">
          <span>SEGURIDAD</span>

          <h1>Nueva contraseña</h1>

          <p>Ingresa la nueva contraseña que utilizarás para acceder a Nivela.</p>
        </div>

        <form @submit.prevent="updatePassword">
          <div class="field">
            <label>Nueva contraseña</label>

            <div class="input-wrapper">
              <LockKeyhole :size="18" />

              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />

              <button type="button" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" :size="18" />

                <Eye v-else :size="18" />
              </button>
            </div>
          </div>

          <div class="field">
            <label>Confirmar contraseña</label>

            <div class="input-wrapper">
              <LockKeyhole :size="18" />

              <input
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Repite la contraseña"
              />
            </div>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <button class="submit-button" type="submit" :disabled="loading">
            {{ loading ? 'Actualizando...' : 'Guardar nueva contraseña' }}
          </button>
        </form>
      </template>

      <div v-else class="success-state">
        <div class="success-icon">
          <CheckCircle2 :size="30" />
        </div>

        <h2>Contraseña actualizada</h2>

        <p>Tu nueva contraseña fue guardada correctamente. Estamos entrando a Nivela...</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.reset-page {
  display: grid;
  min-height: 100vh;
  place-items: center;

  padding: 24px;

  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 35%), #f7f9fc;
}

.reset-card {
  width: 100%;
  max-width: 430px;

  padding: 36px;

  border: 1px solid #e5eaf1;
  border-radius: 26px;

  background: #ffffff;

  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-logo {
  display: grid;
  width: 43px;
  height: 43px;
  place-items: center;

  border-radius: 13px;

  background: linear-gradient(135deg, #3b82f6, #6366f1);

  color: white;
  font-size: 18px;
  font-weight: 800;
}

.brand > div:last-child {
  display: flex;
  flex-direction: column;
}

.brand strong {
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
}

.brand span {
  margin-top: 2px;

  color: #94a3b8;
  font-size: 10px;
}

.heading {
  margin-top: 38px;
}

.heading > span {
  color: #3b82f6;

  font-size: 9px;
  font-weight: 800;

  letter-spacing: 1.5px;
}

.heading h1 {
  margin: 8px 0 0;

  color: #0f172a;

  font-size: 28px;
  font-weight: 800;

  letter-spacing: -0.8px;
}

.heading p {
  margin: 8px 0 0;

  color: #64748b;

  font-size: 11px;
  line-height: 1.65;
}

form {
  display: flex;
  flex-direction: column;
  gap: 17px;

  margin-top: 28px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field label {
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
}

.input-wrapper:focus-within {
  border-color: #93bdfb;

  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
}

.input-wrapper input {
  width: 100%;

  border: 0;
  outline: 0;

  background: transparent;

  color: #0f172a;

  font-size: 12px;
}

.input-wrapper button {
  display: grid;
  place-items: center;

  border: 0;

  background: transparent;
  color: #94a3b8;

  cursor: pointer;
}

.error-message {
  padding: 11px;

  border: 1px solid #fecaca;
  border-radius: 12px;

  background: #fff5f5;
  color: #dc2626;

  font-size: 10px;
}

.submit-button {
  min-height: 50px;

  border: 0;
  border-radius: 14px;

  background: linear-gradient(135deg, #3b82f6, #3978ed);

  color: white;

  cursor: pointer;

  font-size: 11px;
  font-weight: 700;

  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.2);
}

.submit-button:disabled {
  opacity: 0.6;
}

.success-state {
  padding: 55px 10px 20px;

  text-align: center;
}

.success-icon {
  display: grid;

  width: 60px;
  height: 60px;

  margin: 0 auto 18px;

  place-items: center;

  border-radius: 18px;

  background: #ecfdf3;
  color: #16a34a;
}

.success-state h2 {
  margin: 0;

  color: #0f172a;

  font-size: 23px;
}

.success-state p {
  margin: 9px 0 0;

  color: #64748b;

  font-size: 11px;
  line-height: 1.7;
}

@media (max-width: 480px) {
  .reset-page {
    padding: 14px;
  }

  .reset-card {
    padding: 26px 20px;

    border-radius: 22px;
  }
}
</style>