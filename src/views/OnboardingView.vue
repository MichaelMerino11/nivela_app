<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  PiggyBank,
  ShieldCheck,
  Wallet,
} from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'

import { saveOnboardingBasics } from '@/services/onboarding'

import { centsToCurrency, moneyToCents } from '@/utils/money'

const authStore = useAuthStore()

const salary = ref('')
const currentBalance = ref('')
const savingsTarget = ref('100')

const lastPayday = ref('')
const nextPayday = ref('')

const loading = ref(false)
const errorMessage = ref('')
const saved = ref(false)

const currentStep = computed(() => authStore.financialSettings?.onboarding_step ?? 1)

const previewSalary = computed(() => {
  try {
    return centsToCurrency(moneyToCents(salary.value || '0'))
  } catch {
    return '$0.00'
  }
})

const previewBalance = computed(() => {
  try {
    return centsToCurrency(moneyToCents(currentBalance.value || '0'))
  } catch {
    return '$0.00'
  }
})

const previewSavings = computed(() => {
  try {
    return centsToCurrency(moneyToCents(savingsTarget.value || '0'))
  } catch {
    return '$0.00'
  }
})

const preliminaryAvailable = computed(() => {
  try {
    const balance = moneyToCents(currentBalance.value || '0')

    const savings = moneyToCents(savingsTarget.value || '0')

    return centsToCurrency(balance - savings)
  } catch {
    return '$0.00'
  }
})

function todayAsString() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

async function continueOnboarding() {
  errorMessage.value = ''

  try {
    if (!salary.value.trim()) {
      throw new Error('Ingresa el valor de tu sueldo.')
    }

    if (!currentBalance.value.trim()) {
      throw new Error('Ingresa cuánto dinero tienes actualmente.')
    }

    if (!savingsTarget.value.trim()) {
      throw new Error('Ingresa tu meta de ahorro.')
    }

    if (!lastPayday.value) {
      throw new Error('Selecciona la fecha de tu último sueldo.')
    }

    if (!nextPayday.value) {
      throw new Error('Selecciona la fecha de tu próximo sueldo.')
    }

    const salaryCents = moneyToCents(salary.value)

    const currentBalanceCents = moneyToCents(currentBalance.value)

    const savingsTargetCents = moneyToCents(savingsTarget.value)

    if (salaryCents <= 0) {
      throw new Error('El sueldo debe ser mayor a $0.')
    }

    if (savingsTargetCents < 0) {
      throw new Error('La meta de ahorro no puede ser negativa.')
    }

    if (new Date(nextPayday.value) <= new Date(lastPayday.value)) {
      throw new Error('La próxima fecha de sueldo debe ser posterior a la anterior.')
    }

    loading.value = true

    await saveOnboardingBasics({
      salaryCents,
      currentBalanceCents,
      savingsTargetCents,
      lastPayday: lastPayday.value,
      nextPayday: nextPayday.value,
      snapshotDate: todayAsString(),
    })

    await authStore.loadUserData()

    saved.value = true
  } catch (error: any) {
    console.error('ERROR ONBOARDING:', error)

    errorMessage.value = error?.message || 'No pudimos guardar tu información.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="onboarding-page">
    <div class="onboarding-shell">
      <!-- CABECERA -->
      <header class="onboarding-header">
        <div class="brand">
          <div class="brand-logo">N</div>

          <div>
            <strong>Nivela</strong>
            <span> Configuración financiera </span>
          </div>
        </div>

        <div class="step-counter">Paso {{ currentStep }} de 5</div>
      </header>

      <!-- PROGRESO -->
      <div class="steps">
        <div
          v-for="step in 5"
          :key="step"
          class="step"
          :class="{
            'step--active': step <= currentStep,
          }"
        >
          <div class="step__line" />
        </div>
      </div>

      <!-- PASO 1 -->
      <template v-if="!saved">
        <main class="onboarding-content">
          <section class="form-section">
            <span class="eyebrow"> PASO 1 · TU PUNTO DE PARTIDA </span>

            <h1>Empecemos por tu dinero actual</h1>

            <p class="description">
              Con estos datos Nivela sabrá cuánto tiempo debe hacer durar tu dinero y qué parte debe
              proteger desde ahora.
            </p>

            <form class="financial-form" @submit.prevent="continueOnboarding">
              <div class="fields-grid">
                <!-- SUELDO -->
                <div class="field-group">
                  <label for="salary"> Sueldo neto </label>

                  <div class="money-input">
                    <CircleDollarSign :size="18" />

                    <input
                      id="salary"
                      v-model="salary"
                      inputmode="decimal"
                      placeholder="Ej. 1250.00"
                      autocomplete="off"
                    />
                  </div>

                  <small> Lo que recibes normalmente en cada ciclo. </small>
                </div>

                <!-- SALDO -->
                <div class="field-group">
                  <label for="balance"> Dinero que tienes ahora </label>

                  <div class="money-input">
                    <Wallet :size="18" />

                    <input
                      id="balance"
                      v-model="currentBalance"
                      inputmode="decimal"
                      placeholder="Ej. 680.00"
                      autocomplete="off"
                    />
                  </div>

                  <small> El saldo real que puedes administrar actualmente. </small>
                </div>

                <!-- ÚLTIMO SUELDO -->
                <div class="field-group">
                  <label for="last-payday"> Último sueldo recibido </label>

                  <div class="money-input">
                    <CalendarDays :size="18" />

                    <input id="last-payday" v-model="lastPayday" type="date" />
                  </div>

                  <small> Inicio del ciclo financiero actual. </small>
                </div>

                <!-- PRÓXIMO SUELDO -->
                <div class="field-group">
                  <label for="next-payday"> Próximo sueldo </label>

                  <div class="money-input">
                    <CalendarDays :size="18" />

                    <input id="next-payday" v-model="nextPayday" type="date" />
                  </div>

                  <small> Hasta este día debe durar tu planificación. </small>
                </div>
              </div>

              <!-- AHORRO -->
              <div class="savings-field">
                <div class="savings-field__icon">
                  <PiggyBank :size="22" />
                </div>

                <div class="savings-field__content">
                  <label for="savings"> Meta de ahorro del ciclo </label>

                  <span> Este dinero será considerado protegido. </span>
                </div>

                <div class="savings-input">
                  <span>$</span>

                  <input
                    id="savings"
                    v-model="savingsTarget"
                    inputmode="decimal"
                    autocomplete="off"
                  />
                </div>
              </div>

              <transition name="message">
                <div v-if="errorMessage" class="error-message">
                  {{ errorMessage }}
                </div>
              </transition>

              <button class="continue-button" type="submit" :disabled="loading">
                <span>
                  {{ loading ? 'Guardando...' : 'Guardar y continuar' }}
                </span>

                <ChevronRight v-if="!loading" :size="19" />

                <v-progress-circular v-else indeterminate :size="19" :width="2" />
              </button>
            </form>
          </section>

          <!-- PREVIEW -->
          <aside class="preview-section">
            <div class="preview-card">
              <div class="preview-card__header">
                <div class="preview-icon">
                  <ShieldCheck :size="20" />
                </div>

                <div>
                  <span> VISTA PREVIA </span>

                  <strong> Tu punto de partida </strong>
                </div>
              </div>

              <div class="preview-main">
                <span> Disponible ahora </span>

                <strong>
                  {{ previewBalance }}
                </strong>
              </div>

              <div class="preview-list">
                <div>
                  <span>Sueldo</span>
                  <strong>
                    {{ previewSalary }}
                  </strong>
                </div>

                <div>
                  <span> Ahorro protegido </span>

                  <strong class="green"> -{{ previewSavings }} </strong>
                </div>

                <div class="preview-divider" />

                <div class="preview-total">
                  <span> Antes de compromisos </span>

                  <strong>
                    {{ preliminaryAvailable }}
                  </strong>
                </div>
              </div>

              <div class="preview-note">
                <PiggyBank :size="17" />

                <p>
                  Todavía no estamos descontando gastos fijos ni tu rutina. Los agregaremos en los
                  próximos pasos.
                </p>
              </div>
            </div>
          </aside>
        </main>
      </template>

      <!-- PASO 1 TERMINADO -->
      <template v-else>
        <div class="saved-state">
          <div class="saved-icon">
            <Check :size="30" />
          </div>

          <span class="eyebrow"> PASO 1 COMPLETADO </span>

          <h1>Ya conocemos tu punto de partida</h1>

          <p>Tu sueldo, saldo actual, ciclo y objetivo de ahorro quedaron guardados.</p>

          <div class="next-step-card">
            <div>
              <span> SIGUIENTE </span>

              <strong> Gastos fijos y compromisos </strong>

              <p>
                Internet, servicios, deudas, suscripciones y cualquier gasto que obligatoriamente
                debes cubrir.
              </p>
            </div>

            <div class="next-step-number">2</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.onboarding-page {
  min-height: 100vh;

  padding: 34px;

  background: radial-gradient(circle at 90% 0%, rgba(59, 130, 246, 0.1), transparent 31%), #f7f9fc;
}

.onboarding-shell {
  width: 100%;
  max-width: 1180px;

  margin: 0 auto;
}

.onboarding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.step-counter {
  padding: 8px 12px;

  border: 1px solid #e5eaf1;
  border-radius: 999px;

  background: white;
  color: #64748b;

  font-size: 9px;
  font-weight: 700;
}

.steps {
  display: grid;
  grid-template-columns: repeat(5, 1fr);

  gap: 7px;

  margin-top: 23px;
}

.step__line {
  height: 4px;

  border-radius: 999px;

  background: #e5eaf1;

  transition: background 0.3s ease;
}

.step--active .step__line {
  background: #3b82f6;
}

.onboarding-content {
  display: grid;

  grid-template-columns:
    minmax(0, 1.45fr)
    minmax(300px, 0.65fr);

  gap: 22px;

  margin-top: 34px;
}

.form-section,
.preview-card {
  border: 1px solid #e5eaf1;

  background: #ffffff;
}

.form-section {
  padding: 36px;

  border-radius: 28px;
}

.eyebrow {
  display: block;

  color: #3b82f6;

  font-size: 9px;
  font-weight: 800;

  letter-spacing: 1.5px;
}

h1 {
  margin: 9px 0 0;

  color: #0f172a;

  font-size: 32px;
  font-weight: 800;

  letter-spacing: -1px;
}

.description {
  max-width: 570px;

  margin: 10px 0 0;

  color: #64748b;

  font-size: 11px;
  line-height: 1.75;
}

.financial-form {
  margin-top: 30px;
}

.fields-grid {
  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 18px;
}

.field-group {
  display: flex;
  flex-direction: column;

  gap: 7px;
}

.field-group label,
.savings-field label {
  color: #334155;

  font-size: 10px;
  font-weight: 700;
}

.field-group small {
  color: #94a3b8;

  font-size: 8px;
}

.money-input {
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
    box-shadow 0.2s ease;
}

.money-input:focus-within {
  border-color: #93bdfb;

  background: #ffffff;

  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
}

.money-input input {
  width: 100%;
  min-width: 0;

  border: 0;
  outline: 0;

  background: transparent;
  color: #0f172a;

  font-family: inherit;
  font-size: 12px;
}

.savings-field {
  display: flex;
  align-items: center;

  gap: 13px;

  margin-top: 24px;
  padding: 15px;

  border: 1px solid #dbeafe;
  border-radius: 17px;

  background: #f8fbff;
}

.savings-field__icon {
  display: grid;

  width: 43px;
  height: 43px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 13px;

  background: #ecfdf3;
  color: #16a34a;
}

.savings-field__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.savings-field__content span {
  margin-top: 3px;

  color: #94a3b8;

  font-size: 8px;
}

.savings-input {
  display: flex;
  width: 120px;
  min-height: 42px;
  align-items: center;

  padding: 0 12px;

  border: 1px solid #dce3ec;
  border-radius: 12px;

  background: white;

  color: #64748b;
}

.savings-input input {
  width: 100%;

  border: 0;
  outline: 0;

  background: transparent;

  color: #0f172a;

  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
}

.error-message {
  margin-top: 18px;
  padding: 12px 14px;

  border: 1px solid #fecaca;
  border-radius: 12px;

  background: #fff5f5;
  color: #dc2626;

  font-size: 10px;
}

.continue-button {
  display: flex;
  width: 100%;
  min-height: 50px;

  align-items: center;
  justify-content: center;

  gap: 8px;

  margin-top: 22px;

  border: 0;
  border-radius: 14px;

  background: linear-gradient(135deg, #3b82f6, #3978ed);

  color: white;

  cursor: pointer;

  font-size: 11px;
  font-weight: 700;

  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.2);
}

.continue-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.preview-card {
  position: sticky;
  top: 25px;

  padding: 24px;

  border-radius: 24px;
}

.preview-card__header {
  display: flex;
  align-items: center;

  gap: 11px;
}

.preview-icon {
  display: grid;

  width: 40px;
  height: 40px;

  place-items: center;

  border-radius: 12px;

  background: #edf5ff;
  color: #3b82f6;
}

.preview-card__header > div:last-child {
  display: flex;
  flex-direction: column;
}

.preview-card__header span {
  color: #94a3b8;

  font-size: 8px;
  font-weight: 700;

  letter-spacing: 1px;
}

.preview-card__header strong {
  margin-top: 2px;

  color: #334155;

  font-size: 11px;
}

.preview-main {
  display: flex;
  flex-direction: column;

  margin-top: 29px;
}

.preview-main span {
  color: #94a3b8;

  font-size: 9px;
}

.preview-main strong {
  margin-top: 4px;

  color: #0f172a;

  font-size: 31px;
  font-weight: 800;

  letter-spacing: -1px;
}

.preview-list {
  margin-top: 23px;
}

.preview-list > div:not(.preview-divider) {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 9px 0;
}

.preview-list span {
  color: #64748b;

  font-size: 9px;
}

.preview-list strong {
  color: #334155;

  font-size: 10px;
}

.green {
  color: #16a34a !important;
}

.preview-divider {
  height: 1px;

  margin: 6px 0;

  background: #edf1f5;
}

.preview-total strong {
  color: #2563eb !important;

  font-size: 13px !important;
}

.preview-note {
  display: flex;
  align-items: flex-start;

  gap: 8px;

  margin-top: 22px;
  padding: 12px;

  border-radius: 13px;

  background: #f8fafc;
  color: #64748b;
}

.preview-note p {
  margin: 0;

  font-size: 8px;
  line-height: 1.6;
}

.saved-state {
  max-width: 650px;

  margin: 70px auto 0;
  padding: 44px;

  border: 1px solid #e5eaf1;
  border-radius: 28px;

  background: white;

  text-align: center;

  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.07);
}

.saved-icon {
  display: grid;

  width: 62px;
  height: 62px;

  place-items: center;

  margin: 0 auto 22px;

  border-radius: 20px;

  background: #ecfdf3;
  color: #16a34a;
}

.saved-state h1 {
  font-size: 28px;
}

.saved-state > p {
  max-width: 430px;

  margin: 10px auto 0;

  color: #64748b;

  font-size: 11px;
  line-height: 1.7;
}

.next-step-card {
  display: flex;
  align-items: center;

  gap: 20px;

  margin-top: 28px;
  padding: 18px;

  border: 1px solid #dbeafe;
  border-radius: 17px;

  background: #f8fbff;

  text-align: left;
}

.next-step-card > div:first-child {
  flex: 1;
}

.next-step-card span {
  color: #3b82f6;

  font-size: 8px;
  font-weight: 800;

  letter-spacing: 1px;
}

.next-step-card strong {
  display: block;

  margin-top: 4px;

  color: #1e293b;

  font-size: 12px;
}

.next-step-card p {
  margin: 4px 0 0;

  color: #64748b;

  font-size: 9px;
  line-height: 1.5;
}

.next-step-number {
  display: grid;

  width: 46px;
  height: 46px;

  place-items: center;

  flex-shrink: 0;

  border-radius: 14px;

  background: #3b82f6;
  color: white;

  font-size: 15px;
  font-weight: 800;
}

.message-enter-active,
.message-leave-active {
  transition: all 0.2s ease;
}

.message-enter-from,
.message-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 900px) {
  .onboarding-page {
    padding: 22px 16px;
  }

  .onboarding-content {
    grid-template-columns: 1fr;
  }

  .preview-card {
    position: static;
  }
}

@media (max-width: 600px) {
  .onboarding-page {
    padding: 18px 13px 30px;
  }

  .form-section,
  .saved-state {
    padding: 23px 19px;

    border-radius: 22px;
  }

  h1 {
    font-size: 26px;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .savings-field {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .savings-input {
    width: 100%;
  }

  .preview-card {
    border-radius: 20px;
  }
}
</style>