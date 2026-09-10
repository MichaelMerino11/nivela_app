<script setup lang="ts">
import { onMounted, ref } from 'vue'

import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Coins,
  PiggyBank,
  RefreshCw,
  Save,
  ShieldCheck,
  WalletCards,
} from 'lucide-vue-next'

import {
  getFinancialSettings,
  updateFinancialSettings,
  type FinancialSettings,
} from '@/services/settings'

const settings = ref<FinancialSettings | null>(null)

const loading = ref(true)

const saving = ref(false)

const errorMessage = ref('')

const formError = ref('')

const successSnackbar = ref(false)

const salary = ref('')

const usualPayDay = ref<number | null>(null)

const savingsTarget = ref('')

const minimumBuffer = ref('')

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function moneyToCents(value: string): number {
  const normalized = value.trim().replace(',', '.')

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return -1
  }

  return Math.round(parsed * 100)
}

async function loadSettings() {
  errorMessage.value = ''

  try {
    loading.value = true

    const data = await getFinancialSettings()

    settings.value = data

    salary.value = centsToInput(data.salaryCents)

    usualPayDay.value = data.usualPayDay

    savingsTarget.value = centsToInput(data.savingsTargetCents)

    minimumBuffer.value = centsToInput(data.minimumBufferCents)
  } catch (error: any) {
    console.error('ERROR CARGANDO CONFIGURACIÓN:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tu configuración.'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  formError.value = ''

  const salaryCents = moneyToCents(salary.value)

  const savingsTargetCents = moneyToCents(savingsTarget.value)

  const minimumBufferCents = moneyToCents(minimumBuffer.value)

  if (salaryCents < 0) {
    formError.value = 'Ingresa un sueldo válido.'

    return
  }

  if (
    usualPayDay.value === null ||
    !Number.isInteger(usualPayDay.value) ||
    usualPayDay.value < 1 ||
    usualPayDay.value > 31
  ) {
    formError.value = 'El día habitual de pago debe estar entre 1 y 31.'

    return
  }

  if (savingsTargetCents < 0) {
    formError.value = 'Ingresa una meta de ahorro válida.'

    return
  }

  if (minimumBufferCents < 0) {
    formError.value = 'Ingresa un colchón mínimo válido.'

    return
  }

  try {
    saving.value = true

    await updateFinancialSettings({
      salaryCents,
      usualPayDay: usualPayDay.value,
      savingsTargetCents,
      minimumBufferCents,
    })

    await loadSettings()

    successSnackbar.value = true
  } catch (error: any) {
    console.error('ERROR GUARDANDO CONFIGURACIÓN:', error)

    formError.value = error?.message || 'No pudimos guardar tu configuración.'
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="page-container settings-page">
    <!-- CARGANDO -->
    <div v-if="loading" class="state-card">
      <v-progress-circular indeterminate color="primary" :size="34" :width="3" />

      <span> Cargando configuración... </span>
    </div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="state-card state-card--error">
      <WalletCards :size="30" />

      <strong> No pudimos cargar tu configuración </strong>

      <span>
        {{ errorMessage }}
      </span>

      <v-btn color="primary" variant="flat" @click="loadSettings">
        <RefreshCw :size="16" class="mr-2" />

        Reintentar
      </v-btn>
    </div>

    <template v-else-if="settings">
      <!-- HEADER -->
      <section class="page-header">
        <div>
          <span class="eyebrow"> PREFERENCIAS </span>

          <h1>Configuración</h1>

          <p>Ajusta los valores base que Nivela utilizará para tus próximos ciclos.</p>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          class="save-button"
          :loading="saving"
          @click="saveSettings"
        >
          <Save :size="16" class="mr-2" />

          Guardar cambios
        </v-btn>
      </section>

      <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-4">
        {{ formError }}
      </v-alert>

      <!-- IMPORTANTE -->
      <section class="current-cycle-info">
        <div class="info-icon">
          <ShieldCheck :size="19" />
        </div>

        <div>
          <strong> Tu ciclo actual no cambiará </strong>

          <span>
            Los cambios de sueldo, día de pago y meta de ahorro se utilizarán como referencia para
            los siguientes ciclos.
          </span>
        </div>
      </section>

      <div class="settings-grid">
        <!-- FINANZAS -->
        <section class="settings-card">
          <div class="section-header">
            <div class="section-icon">
              <CircleDollarSign :size="19" />
            </div>

            <div>
              <span class="eyebrow"> FINANZAS </span>

              <h2>Valores habituales</h2>

              <p>Parámetros base de tu planificación financiera.</p>
            </div>
          </div>

          <div class="fields-grid">
            <div class="form-field">
              <label> Sueldo habitual </label>

              <v-text-field
                v-model="salary"
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                variant="outlined"
                density="comfortable"
                hide-details
              />

              <small> Ingreso que normalmente recibes en cada ciclo. </small>
            </div>

            <div class="form-field">
              <label> Día habitual de pago </label>

              <v-text-field
                v-model.number="usualPayDay"
                type="number"
                min="1"
                max="31"
                variant="outlined"
                density="comfortable"
                hide-details
              />

              <small> Entre el día 1 y 31 de cada mes. </small>
            </div>

            <div class="form-field">
              <label> Meta de ahorro </label>

              <v-text-field
                v-model="savingsTarget"
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                variant="outlined"
                density="comfortable"
                hide-details
              />

              <small> Objetivo habitual para cada nuevo ciclo. </small>
            </div>

            <div class="form-field">
              <label> Colchón mínimo </label>

              <v-text-field
                v-model="minimumBuffer"
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                variant="outlined"
                density="comfortable"
                hide-details
              />

              <small> Cantidad que prefieres mantener como respaldo. </small>
            </div>
          </div>
        </section>

        <!-- PREFERENCIAS -->
        <section class="settings-card">
          <div class="section-header">
            <div class="section-icon section-icon--purple">
              <Clock3 :size="19" />
            </div>

            <div>
              <span class="eyebrow"> PREFERENCIAS </span>

              <h2>Región y moneda</h2>

              <p>Configuración utilizada actualmente por Nivela.</p>
            </div>
          </div>

          <div class="preference-list">
            <article class="preference-row">
              <div class="preference-icon">
                <Coins :size="18" />
              </div>

              <div>
                <span> Moneda </span>

                <strong>
                  {{ settings.currencyCode }}
                </strong>

                <small> Dólar estadounidense </small>
              </div>

              <div class="readonly-badge">Actual</div>
            </article>

            <article class="preference-row">
              <div class="preference-icon">
                <Clock3 :size="18" />
              </div>

              <div>
                <span> Zona horaria </span>

                <strong>
                  {{ settings.timezone }}
                </strong>

                <small> Hora utilizada para registrar y calcular tus ciclos. </small>
              </div>

              <div class="readonly-badge">Actual</div>
            </article>

            <article class="preference-row">
              <div class="preference-icon">
                <CalendarDays :size="18" />
              </div>

              <div>
                <span> Estrategia del ciclo </span>

                <strong> De sueldo a sueldo </strong>

                <small> Tu planificación termina cuando llega el siguiente pago. </small>
              </div>

              <div class="readonly-badge">Activa</div>
            </article>
          </div>
        </section>
      </div>

      <!-- EXPLICACIÓN -->
      <section class="settings-help">
        <PiggyBank :size="18" />

        <div>
          <strong> ¿Por qué algunos valores no cambian inmediatamente? </strong>

          <span>
            Nivela conserva los datos del ciclo que ya estás viviendo para no alterar su historial.
            Tus nuevas preferencias se utilizarán cuando comiences el siguiente ciclo financiero.
          </span>
        </div>
      </section>
    </template>

    <v-snackbar v-model="successSnackbar" color="success" :timeout="3500">
      Configuración guardada correctamente.
    </v-snackbar>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  animation: settings-enter 0.35s ease-out;
}

@keyframes settings-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.state-card {
  display: flex;

  min-height: 420px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 12px;

  color: #64748b;
}

.state-card--error {
  color: #ef4444;
}

.page-header {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 20px;

  margin-bottom: 20px;
}

.eyebrow {
  display: block;

  margin-bottom: 6px;

  color: #94a3b8;

  font-size: 9px;
  font-weight: 700;

  letter-spacing: 1.2px;
}

.page-header h1 {
  margin: 0;

  color: #0f172a;

  font-size: 30px;
  font-weight: 800;

  letter-spacing: -0.8px;
}

.page-header p,
.section-header p {
  margin: 6px 0 0;

  color: #64748b;

  font-size: 10px;
}

.save-button {
  text-transform: none;
}

.current-cycle-info {
  display: flex;

  align-items: flex-start;

  gap: 12px;

  margin-bottom: 16px;
  padding: 14px 16px;

  border: 1px solid #dbeafe;
  border-radius: 15px;

  background: #f8fbff;
}

.info-icon {
  display: grid;

  width: 36px;
  height: 36px;

  flex-shrink: 0;

  place-items: center;

  border-radius: 10px;

  background: #eff6ff;

  color: #3b82f6;
}

.current-cycle-info > div:last-child {
  display: flex;

  flex-direction: column;
}

.current-cycle-info strong {
  color: #334155;

  font-size: 10px;
}

.current-cycle-info span {
  margin-top: 3px;

  color: #64748b;

  font-size: 9px;
  line-height: 1.55;
}

.settings-grid {
  display: grid;

  grid-template-columns:
    minmax(0, 1.3fr)
    minmax(300px, 0.7fr);

  gap: 16px;
}

.settings-card {
  padding: 21px;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: white;
}

.section-header {
  display: flex;

  align-items: flex-start;

  gap: 11px;
}

.section-icon {
  display: grid;

  width: 39px;
  height: 39px;

  flex-shrink: 0;

  place-items: center;

  border-radius: 11px;

  background: #eff6ff;

  color: #3b82f6;
}

.section-icon--purple {
  background: #f5f3ff;

  color: #8b5cf6;
}

.section-header h2 {
  margin: 0;

  color: #1e293b;

  font-size: 15px;
}

.fields-grid {
  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 18px;

  margin-top: 23px;
}

.form-field label {
  display: block;

  margin-bottom: 6px;

  color: #475569;

  font-size: 9px;
  font-weight: 700;
}

.form-field small {
  display: block;

  margin-top: 6px;

  color: #94a3b8;

  font-size: 8px;
  line-height: 1.5;
}

.preference-list {
  margin-top: 17px;
}

.preference-row {
  display: grid;

  grid-template-columns:
    auto
    minmax(0, 1fr)
    auto;

  align-items: center;

  gap: 11px;

  padding: 14px 2px;

  border-bottom: 1px solid #edf1f5;
}

.preference-row:last-child {
  border-bottom: 0;
}

.preference-icon {
  display: grid;

  width: 36px;
  height: 36px;

  place-items: center;

  border-radius: 10px;

  background: #f8fafc;

  color: #64748b;
}

.preference-row > div:nth-child(2) {
  display: flex;

  min-width: 0;

  flex-direction: column;
}

.preference-row span {
  color: #94a3b8;

  font-size: 8px;
}

.preference-row strong {
  overflow: hidden;

  margin-top: 2px;

  color: #334155;

  font-size: 10px;

  text-overflow: ellipsis;
}

.preference-row small {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 7px;
}

.readonly-badge {
  padding: 4px 7px;

  border-radius: 999px;

  background: #f1f5f9;

  color: #64748b;

  font-size: 7px;
  font-weight: 700;
}

.settings-help {
  display: flex;

  align-items: flex-start;

  gap: 10px;

  margin-top: 16px;
  padding: 14px 16px;

  border: 1px solid #e8edf4;
  border-radius: 15px;

  background: white;

  color: #3b82f6;
}

.settings-help svg {
  flex-shrink: 0;
}

.settings-help > div {
  display: flex;
  flex-direction: column;
}

.settings-help strong {
  color: #334155;

  font-size: 9px;
}

.settings-help span {
  margin-top: 3px;

  color: #64748b;

  font-size: 8px;
  line-height: 1.55;
}

@media (max-width: 1000px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .save-button {
    width: 100%;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .preference-row {
    grid-template-columns:
      auto
      minmax(0, 1fr);
  }

  .readonly-badge {
    grid-column: 2;
    width: fit-content;
  }
}
</style>