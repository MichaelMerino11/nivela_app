<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ListChecks,
  RefreshCw,
  TrendingUp,
  Trophy,
} from 'lucide-vue-next'

import VChart from 'vue-echarts'

import { use } from 'echarts/core'

import { CanvasRenderer } from 'echarts/renderers'

import { BarChart, LineChart } from 'echarts/charts'

import { GridComponent, TooltipComponent } from 'echarts/components'

import { format, parseISO } from 'date-fns'

import { es } from 'date-fns/locale'

import { getStatisticsOverview, type StatisticsOverview } from '@/services/statistics'

import { centsToCurrency } from '@/utils/money'

import { useFinanceStore } from '@/stores/finance'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent])

const financeStore = useFinanceStore()

const overview = ref<StatisticsOverview | null>(null)

const loading = ref(true)

const errorMessage = ref('')

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

const plannedDifferenceLabel = computed(() => {
  if (!overview.value) {
    return '—'
  }

  const difference = overview.value.planned.differenceCents

  if (difference > 0) {
    return `${centsToCurrency(difference)} a favor`
  }

  if (difference < 0) {
    return `${centsToCurrency(Math.abs(difference))} por encima`
  }

  return centsToCurrency(0)
})

const plannedDifferenceClass = computed(() => {
  if (!overview.value) {
    return ''
  }

  const difference = overview.value.planned.differenceCents

  if (difference > 0) {
    return 'positive'
  }

  if (difference < 0) {
    return 'negative'
  }

  return ''
})

const categoriesChartOption = computed(() => {
  const categories = overview.value?.categories ?? []

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any[]) => {
        const item = params[0]

        if (!item) {
          return ''
        }

        return `
              <strong>
                ${item.name}
              </strong>
              <br>
              ${centsToCurrency(Number(item.value))}
            `
      },
    },

    grid: {
      top: 15,
      right: 20,
      bottom: 30,
      left: 70,
    },

    xAxis: {
      type: 'value',

      axisLabel: {
        formatter: (value: number) => centsToCurrency(value),
      },

      splitLine: {
        lineStyle: {
          color: '#eef2f7',
        },
      },
    },

    yAxis: {
      type: 'category',

      data: categories.map((category) => category.categoryName).reverse(),

      axisTick: {
        show: false,
      },

      axisLine: {
        show: false,
      },

      axisLabel: {
        color: '#64748b',

        fontSize: 10,
      },
    },

    series: [
      {
        type: 'bar',

        data: categories.map((category) => category.totalCents).reverse(),

        barMaxWidth: 30,

        itemStyle: {
          borderRadius: [0, 7, 7, 0],

          color: '#3b82f6',
        },
      },
    ],
  }
})

const evolutionChartOption = computed(() => {
  const daily = overview.value?.daily ?? []

  return {
    tooltip: {
      trigger: 'axis',

      formatter: (params: any[]) => {
        const item = params[0]

        if (!item) {
          return ''
        }

        return `
              <strong>
                ${item.axisValue}
              </strong>
              <br>
              Acumulado:
              ${centsToCurrency(Number(item.value))}
            `
      },
    },

    grid: {
      top: 20,
      right: 18,
      bottom: 45,
      left: 65,
    },

    xAxis: {
      type: 'category',

      boundaryGap: false,

      data: daily.map((day) =>
        format(parseISO(day.date), 'd MMM', {
          locale: es,
        }),
      ),

      axisTick: {
        show: false,
      },

      axisLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },

      axisLabel: {
        color: '#94a3b8',

        fontSize: 9,
      },
    },

    yAxis: {
      type: 'value',

      axisLabel: {
        formatter: (value: number) => centsToCurrency(value),

        color: '#94a3b8',

        fontSize: 9,
      },

      splitLine: {
        lineStyle: {
          color: '#eef2f7',
        },
      },
    },

    series: [
      {
        type: 'line',

        data: daily.map((day) => day.cumulativeCents),

        smooth: true,

        symbol: 'circle',

        symbolSize: 6,

        lineStyle: {
          width: 3,

          color: '#3b82f6',
        },

        itemStyle: {
          color: '#3b82f6',
        },

        areaStyle: {
          color: 'rgba(59, 130, 246, 0.08)',
        },
      },
    ],
  }
})

async function loadStatistics() {
  errorMessage.value = ''

  try {
    loading.value = true

    overview.value = await getStatisticsOverview()
  } catch (error: any) {
    console.error('ERROR CARGANDO ESTADÍSTICAS:', error)

    errorMessage.value = error?.message || 'No pudimos cargar tus estadísticas.'
  } finally {
    loading.value = false
  }
}

onMounted(loadStatistics)

watch(
  () => financeStore.revision,

  async () => {
    await loadStatistics()
  },
)
</script>

<template>
  <div class="page-container statistics-page">
    <div v-if="loading" class="state-card">
      <v-progress-circular indeterminate color="primary" :size="34" :width="3" />

      <span> Calculando estadísticas... </span>
    </div>

    <div v-else-if="errorMessage" class="state-card state-card--error">
      <BarChart3 :size="30" />

      <strong> No pudimos cargar tus estadísticas </strong>

      <span>
        {{ errorMessage }}
      </span>

      <v-btn color="primary" variant="flat" @click="loadStatistics">
        <RefreshCw :size="16" class="mr-2" />

        Reintentar
      </v-btn>
    </div>

    <template v-else-if="overview">
      <!-- HEADER -->
      <section class="page-header">
        <div>
          <span class="eyebrow"> ANÁLISIS DEL CICLO </span>

          <h1>Estadísticas</h1>

          <p>Así se ha comportado tu dinero durante el ciclo financiero actual.</p>
        </div>

        <div class="cycle-pill">
          <CalendarDays :size="17" />

          <div>
            <span> Ciclo actual </span>

            <strong>
              {{ cycleLabel }}
            </strong>
          </div>
        </div>
      </section>

      <!-- RESUMEN -->
      <section class="summary-grid">
        <article class="summary-card">
          <div class="summary-icon">
            <CircleDollarSign :size="20" />
          </div>

          <span> Total gastado </span>

          <strong>
            {{ centsToCurrency(overview.totalSpentCents) }}
          </strong>

          <small> Durante este ciclo </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--green">
            <ListChecks :size="20" />
          </div>

          <span> Gastos registrados </span>

          <strong>
            {{ overview.expenseCount }}
          </strong>

          <small> Movimientos de gasto </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--orange">
            <TrendingUp :size="20" />
          </div>

          <span> Promedio diario </span>

          <strong>
            {{ centsToCurrency(overview.dailyAverageCents) }}
          </strong>

          <small>
            En
            {{ overview.elapsedDays }}
            {{ overview.elapsedDays === 1 ? 'día' : 'días' }}
          </small>
        </article>

        <article class="summary-card">
          <div class="summary-icon summary-icon--purple">
            <Trophy :size="20" />
          </div>

          <span> Mayor categoría </span>

          <strong class="category-name">
            {{ overview.topCategory?.categoryName ?? 'Sin datos' }}
          </strong>

          <small>
            <template v-if="overview.topCategory">
              {{ centsToCurrency(overview.topCategory.totalCents) }}
              gastados
            </template>

            <template v-else> Aún sin gastos </template>
          </small>
        </article>
      </section>

      <!-- GRÁFICOS -->
      <section class="charts-grid">
        <article class="chart-card">
          <div class="chart-header">
            <div>
              <span class="eyebrow"> DISTRIBUCIÓN </span>

              <h2>Gastos por categoría</h2>

              <p>En qué se está yendo tu dinero.</p>
            </div>
          </div>

          <div v-if="overview.categories.length === 0" class="chart-empty">
            Todavía no hay gastos suficientes para mostrar este gráfico.
          </div>

          <VChart v-else class="chart" :option="categoriesChartOption" autoresize />
        </article>

        <article class="chart-card">
          <div class="chart-header">
            <div>
              <span class="eyebrow"> EVOLUCIÓN </span>

              <h2>Gasto acumulado</h2>

              <p>Cómo ha crecido el gasto durante el ciclo.</p>
            </div>
          </div>

          <div v-if="overview.daily.length === 0" class="chart-empty">
            Todavía no hay días disponibles para mostrar.
          </div>

          <VChart v-else class="chart" :option="evolutionChartOption" autoresize />
        </article>
      </section>

      <!-- CATEGORÍAS -->
      <section class="categories-card">
        <div class="section-header">
          <div>
            <span class="eyebrow"> DETALLE </span>

            <h2>Por categoría</h2>
          </div>
        </div>

        <div v-if="overview.categories.length === 0" class="empty-section">
          No hay gastos registrados durante este ciclo.
        </div>

        <div v-else class="category-list">
          <article
            v-for="category in overview.categories"
            :key="category.categoryId ?? 'uncategorized'"
            class="category-row"
          >
            <div class="category-info">
              <div
                class="category-dot"
                :style="{
                  backgroundColor: category.categoryColor || '#cbd5e1',
                }"
              />

              <strong>
                {{ category.categoryName }}
              </strong>
            </div>

            <div class="category-values">
              <strong>
                {{ centsToCurrency(category.totalCents) }}
              </strong>

              <span> {{ category.percentage }}% </span>
            </div>
          </article>
        </div>
      </section>

      <!-- PLANEADO VS REAL -->
      <section class="planned-card">
        <div class="section-header">
          <div>
            <span class="eyebrow"> PLANIFICACIÓN </span>

            <h2>Planeado vs. real</h2>

            <p>Comparación de gastos planificados que ya fueron pagados en este ciclo.</p>
          </div>
        </div>

        <div v-if="overview.planned.completedCount === 0" class="empty-section">
          Aún no tienes gastos planificados completados durante este ciclo.
        </div>

        <div v-else class="planned-grid">
          <div>
            <span> Planeado </span>

            <strong>
              {{ centsToCurrency(overview.planned.totalPlannedCents) }}
            </strong>
          </div>

          <div>
            <span> Real </span>

            <strong>
              {{ centsToCurrency(overview.planned.totalActualCents) }}
            </strong>
          </div>

          <div>
            <span> Diferencia </span>

            <strong :class="plannedDifferenceClass">
              {{ plannedDifferenceLabel }}
            </strong>
          </div>

          <div>
            <span> Completados </span>

            <strong>
              {{ overview.planned.completedCount }}
            </strong>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.statistics-page {
  animation: statistics-enter 0.35s ease-out;
}

@keyframes statistics-enter {
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
.chart-header p,
.section-header p {
  margin: 6px 0 0;

  color: #64748b;

  font-size: 10px;
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

.summary-grid {
  display: grid;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 13px;
}

.summary-card {
  display: flex;

  flex-direction: column;

  min-width: 0;

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
  overflow: hidden;

  margin-top: 4px;

  color: #1e293b;

  font-size: 18px;
  font-weight: 800;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.summary-card .category-name {
  font-size: 15px;
}

.summary-card small {
  margin-top: 4px;

  color: #94a3b8;

  font-size: 8px;
}

.charts-grid {
  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 16px;

  margin-top: 16px;
}

.chart-card,
.categories-card,
.planned-card {
  padding: 21px;

  border: 1px solid #e8edf4;
  border-radius: 20px;

  background: white;
}

.categories-card,
.planned-card {
  margin-top: 16px;
}

.chart-header h2,
.section-header h2 {
  margin: 0;

  color: #1e293b;

  font-size: 15px;
}

.chart {
  width: 100%;
  height: 310px;

  margin-top: 10px;
}

.chart-empty,
.empty-section {
  display: flex;

  min-height: 180px;

  align-items: center;
  justify-content: center;

  padding: 20px;

  color: #94a3b8;

  font-size: 9px;

  text-align: center;
}

.category-list {
  margin-top: 15px;
}

.category-row {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 16px;

  padding: 13px 3px;

  border-bottom: 1px solid #edf1f5;
}

.category-row:last-child {
  border-bottom: 0;
}

.category-info {
  display: flex;

  min-width: 0;

  align-items: center;

  gap: 9px;
}

.category-dot {
  width: 9px;
  height: 9px;

  flex-shrink: 0;

  border-radius: 999px;
}

.category-info strong {
  overflow: hidden;

  color: #334155;

  font-size: 10px;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.category-values {
  display: flex;

  flex-shrink: 0;

  align-items: center;

  gap: 14px;
}

.category-values strong {
  color: #334155;

  font-size: 11px;
}

.category-values span {
  min-width: 36px;

  color: #94a3b8;

  font-size: 9px;

  text-align: right;
}

.planned-grid {
  display: grid;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 12px;

  margin-top: 17px;
}

.planned-grid > div {
  display: flex;

  flex-direction: column;

  padding: 14px;

  border-radius: 13px;

  background: #f8fafc;
}

.planned-grid span {
  color: #94a3b8;

  font-size: 8px;
}

.planned-grid strong {
  margin-top: 4px;

  color: #334155;

  font-size: 13px;
}

.positive {
  color: #16a34a !important;
}

.negative {
  color: #e11d48 !important;
}

@media (max-width: 1000px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .cycle-pill {
    width: 100%;
  }

  .planned-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .summary-grid,
  .planned-grid {
    grid-template-columns: 1fr;
  }

  .chart {
    height: 280px;
  }
}
</style>