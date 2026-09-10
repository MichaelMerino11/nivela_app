<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  CalendarDays,
  CheckCircle2,
  PiggyBank,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingUp,
  WalletCards,
} from 'lucide-vue-next'

import {
  deleteSavingsContribution,
  getSavingsOverview,
  registerSavingsContribution,
  type SavingsContribution,
  type SavingsOverview,
} from '@/services/savings'

import { centsToCurrency } from '@/utils/money'

import { format, parseISO } from 'date-fns'

import { es } from 'date-fns/locale'

import { useFinanceStore } from '@/stores/finance'

const financeStore = useFinanceStore()

const overview = ref<SavingsOverview | null>(null)

const loading = ref(true)

const errorMessage = ref('')

const registerDialogOpen = ref(false)

const saving = ref(false)

const amount = ref('')

const contributionDate = ref('')

const notes = ref('')

const formError = ref('')

const deleteDialogOpen = ref(false)

const contributionToDelete = ref<SavingsContribution | null>(null)

const deleting = ref(false)

const successSnackbar = ref(false)

const successMessage = ref('')

const progressForBar = computed(() => Math.min(overview.value?.progressPercentage ?? 0, 100))

const goalCompleted = computed(
  () =>
    (overview.value?.savedCents ?? 0) >= (overview.value?.targetCents ?? 0) &&
    (overview.value?.targetCents ?? 0) > 0,
)

const cycleLabel = computed(() => {
  if (!overview.value) {
    return '—'
  }

  const start = format(parseISO(overview.value.cycleStartDate), 'd MMM', {
    locale: es,
  })

  const end = format(parseISO(overview.value.cycleEndDate), 'd MMM', {
    locale: es,
  })

  return `${start} — ${end}`
})

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function amountToCents(value: string): number {
  const normalized = value.trim().replace(',', '.')

  const numeric = Number(normalized)

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0
  }

  return Math.round(numeric * 100)
}

function formatContributionDate(value: string): string {
  return format(parseISO(value), "d 'de' MMMM", {
    locale: es,
  })
}

async function loadSavings() {
  errorMessage.value = ''

  try {
    loading.value = true

    overview.value = await getSavingsOverview()
  } catch (error: any) {
    console.error('ERROR CARGANDO AHORRO:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tu ahorro.'
  } finally {
    loading.value = false
  }
}

function openRegisterDialog() {
  amount.value = ''

  contributionDate.value = todayKey()

  notes.value = ''

  formError.value = ''

  registerDialogOpen.value = true
}

async function saveContribution() {
  formError.value = ''

  const amountCents = amountToCents(amount.value)

  if (amountCents <= 0) {
    formError.value = 'Ingresa un monto válido.'

    return
  }

  if (!contributionDate.value) {
    formError.value = 'Selecciona la fecha.'

    return
  }

  try {
    saving.value = true

    await registerSavingsContribution(amountCents, contributionDate.value, notes.value)

    registerDialogOpen.value = false

    await loadSavings()

    financeStore.notifyFinancialChange()

    successMessage.value = 'Ahorro registrado correctamente.'

    successSnackbar.value = true
  } catch (error: any) {
    console.error('ERROR REGISTRANDO AHORRO:', error)

    formError.value = error?.message || 'No pudimos registrar el ahorro.'
  } finally {
    saving.value = false
  }
}

function askDelete(contribution: SavingsContribution) {
  contributionToDelete.value = contribution

  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!contributionToDelete.value) {
    return
  }

  try {
    deleting.value = true

    await deleteSavingsContribution(contributionToDelete.value.id)

    deleteDialogOpen.value = false

    contributionToDelete.value = null

    await loadSavings()

    financeStore.notifyFinancialChange()

    successMessage.value = 'Aporte eliminado.'

    successSnackbar.value = true
  } catch (error: any) {
    console.error('ERROR ELIMINANDO AHORRO:', error)

    errorMessage.value = error?.message || 'No pudimos eliminar el aporte.'
  } finally {
    deleting.value = false
  }
}

onMounted(loadSavings)

watch(
  () => financeStore.revision,

  async () => {
    await loadSavings()
  },
)
</script>

<template>
  <div class="page-container savings-page">
    <!-- CARGANDO -->
    <div v-if="loading" class="state-card">
      <v-progress-circular indeterminate color="primary" :size="34" :width="3" />

      <span> Cargando tu ahorro... </span>
    </div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="state-card state-card--error">
      <PiggyBank :size="30" />

      <strong> No pudimos cargar tu ahorro </strong>

      <span>
        {{ errorMessage }}
      </span>

      <v-btn color="primary" variant="flat" @click="loadSavings">
        <RefreshCw :size="16" class="mr-2" />

        Reintentar
      </v-btn>
    </div>

    <template v-else-if="overview">
      <!-- HEADER -->
      <section class="page-header">
        <div>
          <span class="eyebrow"> AHORRO DEL CICLO </span>

          <h1>Mi ahorro</h1>

          <p>Registra cuánto has apartado realmente para cumplir tu meta.</p>
        </div>

        <div class="header-actions">
          <div class="cycle-pill">
            <CalendarDays :size="17" />

            <div>
              <span> Ciclo actual </span>

              <strong>
                {{ cycleLabel }}
              </strong>
            </div>
          </div>

          <v-btn color="primary" variant="flat" class="register-button" @click="openRegisterDialog">
            <Plus :size="16" class="mr-2" />

            Registrar ahorro
          </v-btn>
        </div>
      </section>

      <!-- RESUMEN -->
      <section class="summary-grid">
        <article class="summary-card">
          <div class="summary-icon">
            <ShieldCheck :size="20" />
          </div>

          <span> Meta del ciclo </span>

          <strong>
            {{ centsToCurrency(overview.targetCents) }}
          </strong>

          <small> Objetivo protegido </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--green">
            <PiggyBank :size="20" />
          </div>

          <span> Ahorrado realmente </span>

          <strong>
            {{ centsToCurrency(overview.savedCents) }}
          </strong>

          <small> Aportes registrados </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--orange">
            <WalletCards :size="20" />
          </div>

          <span>
            {{ overview.exceededCents > 0 ? 'Meta superada' : 'Falta por ahorrar' }}
          </span>

          <strong>
            {{
              centsToCurrency(
                overview.exceededCents > 0 ? overview.exceededCents : overview.remainingCents,
              )
            }}
          </strong>

          <small>
            {{ overview.exceededCents > 0 ? 'Por encima del objetivo' : 'Para completar la meta' }}
          </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--purple">
            <TrendingUp :size="20" />
          </div>

          <span> Progreso </span>

          <strong> {{ overview.progressPercentage }}% </strong>

          <small> Del objetivo del ciclo </small>
        </article>
      </section>

      <!-- PROGRESO -->
      <section class="progress-card">
        <div class="progress-header">
          <div>
            <span class="eyebrow"> PROGRESO </span>

            <h2>
              {{ goalCompleted ? 'Meta alcanzada' : 'Camino a tu meta' }}
            </h2>
          </div>

          <div
            class="progress-value"
            :class="{
              'progress-value--complete': goalCompleted,
            }"
          >
            {{ overview.progressPercentage }}%
          </div>
        </div>

        <v-progress-linear
          :model-value="progressForBar"
          :color="goalCompleted ? 'success' : 'primary'"
          height="10"
          rounded
          class="progress-bar"
        />

        <div class="progress-footer">
          <span>
            {{ centsToCurrency(overview.savedCents) }}
            ahorrados
          </span>

          <span>
            Meta:
            {{ centsToCurrency(overview.targetCents) }}
          </span>
        </div>

        <div v-if="goalCompleted" class="goal-message">
          <CheckCircle2 :size="16" />

          <span> Cumpliste tu meta de ahorro para este ciclo. </span>
        </div>
      </section>

      <!-- HISTORIAL -->
      <section class="history-card">
        <div class="history-header">
          <div>
            <span class="eyebrow"> HISTORIAL </span>

            <h2>Aportes de ahorro</h2>

            <p>Dinero que marcaste como realmente apartado.</p>
          </div>

          <strong>
            {{ overview.contributions.length }}
            {{ overview.contributions.length === 1 ? 'aporte' : 'aportes' }}
          </strong>
        </div>

        <div v-if="overview.contributions.length === 0" class="empty-state">
          <div class="empty-icon">
            <PiggyBank :size="25" />
          </div>

          <strong> Todavía no has registrado ahorro </strong>

          <span> Cuando apartes dinero para tu meta, regístralo aquí. </span>

          <v-btn color="primary" variant="tonal" size="small" @click="openRegisterDialog">
            Registrar primer ahorro
          </v-btn>
        </div>

        <div v-else class="contributions-list">
          <article
            v-for="contribution in overview.contributions"
            :key="contribution.id"
            class="contribution-row"
          >
            <div class="contribution-main">
              <div class="contribution-icon">
                <PiggyBank :size="17" />
              </div>

              <div>
                <strong> Aporte de ahorro </strong>

                <span>
                  {{ formatContributionDate(contribution.contributionDate) }}
                </span>

                <small v-if="contribution.notes">
                  {{ contribution.notes }}
                </small>
              </div>
            </div>

            <div class="contribution-actions">
              <strong>
                +
                {{ centsToCurrency(contribution.amountCents) }}
              </strong>

              <v-btn
                icon
                variant="text"
                size="small"
                class="delete-button"
                @click="askDelete(contribution)"
              >
                <Trash2 :size="15" />
              </v-btn>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- REGISTRAR -->
    <v-dialog v-model="registerDialogOpen" max-width="480">
      <v-card rounded="xl" class="dialog-card">
        <v-card-title> Registrar ahorro </v-card-title>

        <v-card-text>
          <p class="dialog-description">
            Registra únicamente dinero que realmente hayas apartado para tu meta.
          </p>

          <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="mb-4">
            {{ formError }}
          </v-alert>

          <div class="form-field">
            <label> Monto ahorrado </label>

            <v-text-field
              v-model="amount"
              type="number"
              min="0.01"
              step="0.01"
              prefix="$"
              placeholder="0.00"
              variant="outlined"
              density="comfortable"
              hide-details
              autofocus
            />
          </div>

          <div class="form-field">
            <label> Fecha </label>

            <v-text-field
              v-model="contributionDate"
              type="date"
              :min="overview?.cycleStartDate"
              :max="overview?.cycleEndDate"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <div class="form-field">
            <label>
              Nota
              <span> opcional </span>
            </label>

            <v-textarea
              v-model="notes"
              placeholder="Ej. Transferí este dinero a mi cuenta de ahorro"
              variant="outlined"
              density="comfortable"
              rows="2"
              auto-grow
              hide-details
            />
          </div>

          <div class="info-box">
            <ShieldCheck :size="16" />

            <span>
              Este registro mide tu progreso. No se descontará nuevamente de tu dinero disponible.
            </span>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" :disabled="saving" @click="registerDialogOpen = false">
            Cancelar
          </v-btn>

          <v-btn color="primary" variant="flat" :loading="saving" @click="saveContribution">
            Registrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ELIMINAR -->
    <v-dialog v-model="deleteDialogOpen" max-width="410">
      <v-card rounded="xl" class="dialog-card">
        <v-card-title> Eliminar aporte </v-card-title>

        <v-card-text>
          ¿Quieres eliminar este aporte de
          <strong> {{ centsToCurrency(contributionToDelete?.amountCents ?? 0) }} </strong>?

          <p class="delete-description">El progreso de tu meta se recalculará automáticamente.</p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" :disabled="deleting" @click="deleteDialogOpen = false">
            Cancelar
          </v-btn>

          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" :timeout="3500">
      {{ successMessage }}
    </v-snackbar>
  </div>
</template>

<style scoped lang="scss">
.savings-page {
  animation: savings-enter 0.35s ease-out;
}

@keyframes savings-enter {
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

  margin-bottom: 22px;
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
.history-header p {
  margin: 6px 0 0;

  color: #64748b;

  font-size: 10px;
}

.header-actions {
  display: flex;

  align-items: center;

  gap: 10px;
}

.cycle-pill {
  display: flex;

  align-items: center;

  gap: 10px;

  padding: 11px 15px;

  border: 1px solid #e5eaf1;
  border-radius: 14px;

  background: white;

  color: #64748b;
}

.cycle-pill div {
  display: flex;
  flex-direction: column;
}

.cycle-pill span {
  font-size: 8px;
}

.cycle-pill strong {
  margin-top: 2px;

  color: #334155;

  font-size: 10px;
}

.register-button {
  text-transform: none;
}

.summary-grid {
  display: grid;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 13px;
}

.summary-card {
  display: flex;

  flex-direction: column;

  padding: 17px;

  border: 1px solid #e8edf4;
  border-radius: 18px;

  background: white;
}

.summary-icon {
  display: grid;

  width: 40px;
  height: 40px;

  place-items: center;

  margin-bottom: 12px;

  border-radius: 12px;

  background: #eff6ff;

  color: #3b82f6;
}

.summary-icon--green {
  background: #ecfdf3;

  color: #22c55e;
}

.summary-icon--orange {
  background: #fff7ed;

  color: #f59e0b;
}

.summary-icon--purple {
  background: #f5f3ff;

  color: #8b5cf6;
}

.summary-card > span {
  color: #94a3b8;

  font-size: 9px;
}

.summary-card > strong {
  margin-top: 4px;

  color: #1e293b;

  font-size: 18px;
  font-weight: 800;
}

.summary-card small {
  margin-top: 4px;

  color: #94a3b8;

  font-size: 8px;
}

.progress-card,
.history-card {
  margin-top: 16px;

  padding: 21px;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: white;
}

.progress-header,
.history-header {
  display: flex;

  align-items: flex-start;
  justify-content: space-between;

  gap: 20px;
}

.progress-header h2,
.history-header h2 {
  margin: 0;

  color: #1e293b;

  font-size: 15px;
}

.progress-value {
  color: #2563eb;

  font-size: 24px;
  font-weight: 800;
}

.progress-value--complete {
  color: #16a34a;
}

.progress-bar {
  margin-top: 19px;
}

.progress-footer {
  display: flex;

  justify-content: space-between;

  gap: 12px;

  margin-top: 9px;

  color: #94a3b8;

  font-size: 8px;
}

.goal-message {
  display: flex;

  align-items: center;

  gap: 7px;

  margin-top: 14px;
  padding: 10px 12px;

  border-radius: 11px;

  background: #ecfdf3;

  color: #16a34a;

  font-size: 9px;
  font-weight: 600;
}

.history-header > strong {
  color: #64748b;

  font-size: 9px;
}

.empty-state {
  display: flex;

  min-height: 210px;

  align-items: center;
  justify-content: center;
  flex-direction: column;

  gap: 8px;

  text-align: center;
}

.empty-icon {
  display: grid;

  width: 48px;
  height: 48px;

  place-items: center;

  margin-bottom: 3px;

  border-radius: 14px;

  background: #eff6ff;

  color: #3b82f6;
}

.empty-state strong {
  color: #334155;

  font-size: 11px;
}

.empty-state span {
  max-width: 320px;

  color: #94a3b8;

  font-size: 9px;
}

.contributions-list {
  margin-top: 17px;
}

.contribution-row {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 16px;

  padding: 14px 4px;

  border-bottom: 1px solid #edf1f5;
}

.contribution-row:last-child {
  border-bottom: 0;
}

.contribution-main {
  display: flex;

  align-items: center;

  gap: 11px;

  min-width: 0;
}

.contribution-icon {
  display: grid;

  width: 38px;
  height: 38px;

  flex-shrink: 0;

  place-items: center;

  border-radius: 11px;

  background: #ecfdf3;

  color: #16a34a;
}

.contribution-main > div:last-child {
  display: flex;

  min-width: 0;

  flex-direction: column;
}

.contribution-main strong {
  color: #334155;

  font-size: 10px;
}

.contribution-main span {
  margin-top: 2px;

  color: #94a3b8;

  font-size: 8px;

  text-transform: capitalize;
}

.contribution-main small {
  overflow: hidden;

  max-width: 450px;

  margin-top: 4px;

  color: #64748b;

  font-size: 8px;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.contribution-actions {
  display: flex;

  flex-shrink: 0;

  align-items: center;

  gap: 7px;
}

.contribution-actions > strong {
  color: #16a34a;

  font-size: 12px;
}

.delete-button {
  color: #94a3b8;
}

.delete-button:hover {
  color: #e11d48;
}

.dialog-card {
  padding: 4px;
}

.dialog-description {
  margin: 0 0 17px;

  color: #64748b;

  font-size: 9px;

  line-height: 1.6;
}

.form-field {
  margin-bottom: 15px;
}

.form-field label {
  display: block;

  margin-bottom: 6px;

  color: #475569;

  font-size: 9px;
  font-weight: 700;
}

.form-field label span {
  color: #94a3b8;

  font-weight: 400;
}

.info-box {
  display: flex;

  align-items: flex-start;

  gap: 8px;

  padding: 11px 12px;

  border-radius: 11px;

  background: #eff6ff;

  color: #3b82f6;

  font-size: 8px;

  line-height: 1.5;
}

.info-box svg {
  flex-shrink: 0;
}

.delete-description {
  margin: 10px 0 0;

  color: #94a3b8;

  font-size: 9px;
}

@media (max-width: 1000px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;

    align-items: stretch;
    flex-direction: column;
  }

  .cycle-pill,
  .register-button {
    width: 100%;
  }

  .contribution-main small {
    max-width: 230px;
  }
}

@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .progress-header,
  .history-header {
    flex-direction: column;
  }

  .contribution-row {
    align-items: flex-start;
  }

  .contribution-actions {
    align-items: flex-end;
    flex-direction: column;
  }

  .contribution-main small {
    max-width: 170px;
  }
}
</style>
