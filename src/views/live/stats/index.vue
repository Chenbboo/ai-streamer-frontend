<template>
  <div class="live-report-page">
    <section class="report-header">
      <div>
        <div class="eyebrow">WEEKLY REPORT · 主播运营看板</div>
        <h1>第{{ weekNo }}周内容情况</h1>
        <p>{{ query.beginDate }} 至 {{ query.endDate }}</p>
      </div>
      <el-form :model="query" inline class="filter-bar">
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="-"
            start-placeholder="开始"
            end-placeholder="结束"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item label="主播">
          <el-select v-model="query.streamerId" placeholder="全部" clearable style="width: 150px" @change="loadData">
            <el-option v-for="s in streamers" :key="s.streamerId" :label="s.stageName" :value="s.streamerId" />
          </el-select>
        </el-form-item>
      </el-form>
    </section>

    <main v-loading="loading" class="report-body">
      <section class="overview-pills">
        <span>主播 {{ overview.streamerCount || 0 }} 位</span>
        <span>总流水 {{ formatNumber(overview.totalXu) }}</span>
        <span>私信客户 {{ formatNumber(overview.chatCustomers) }}</span>
      </section>

      <section class="section-title">
        <span>01 · 主播本周表现</span>
      </section>
      <div class="streamer-grid">
        <article v-for="card in cards" :key="card.streamerId" class="streamer-card" :class="card.health">
          <div class="card-top">
            <strong>{{ card.stageName }}</strong>
            <el-tag :type="healthTag(card.health)" effect="dark" size="small">
              {{ healthText(card.health, card.changeRate) }}
            </el-tag>
          </div>
          <div class="main-number">{{ formatNumber(card.totalXu) }}</div>
          <div class="delta" :class="{ down: Number(card.changeRate) < 0 }">
            {{ Number(card.changeRate) >= 0 ? '▲' : '▼' }} {{ Math.abs(Number(card.changeRate || 0)).toFixed(1) }}% vs 上周期
          </div>
          <div class="metrics">
            <div>
              <span>打赏识别</span>
              <b>{{ formatNumber(card.giftXu) }}</b>
            </div>
            <div>
              <span>打赏客户</span>
              <b>{{ formatNumber(card.giftCustomers) }}</b>
            </div>
            <div>
              <span>私信客户</span>
              <b>{{ formatNumber(card.chatCustomers) }}</b>
            </div>
            <div>
              <span>日报天数</span>
              <b>{{ formatNumber(card.reportDays) }}</b>
            </div>
          </div>
        </article>
        <el-empty v-if="!cards.length" description="暂无统计数据" />
      </div>

      <section class="section-title">
        <span>02 · 本周每日走势</span>
      </section>
      <section class="chart-panel">
        <div class="panel-heading">
          <strong>每日流水走势</strong>
          <span>按主播拆分展示已确认日报数据</span>
        </div>
        <div ref="trendChartRef" class="trend-chart"></div>
      </section>

      <section class="section-title">
        <span>03 · 客户触达情况</span>
      </section>
      <div class="customer-grid">
        <article v-for="item in customerCards" :key="item.streamerId" class="customer-card" :class="{ alert: Number(item.contactRate || 0) < 50 }">
          <div class="card-top">
            <strong>{{ item.stageName }}</strong>
            <el-tag v-if="Number(item.contactRate || 0) < 50" type="danger" effect="dark" size="small">急需跟进</el-tag>
          </div>
          <div class="customer-row">
            <span>月活打赏客户</span>
            <b>{{ formatNumber(item.activeCustomers) }}</b>
          </div>
          <div class="customer-row">
            <span>已私信客户</span>
            <b>{{ formatNumber(item.chatCustomers) }}</b>
          </div>
          <div class="customer-row">
            <span>中高价值客户</span>
            <b>{{ formatNumber(item.highValueCustomers) }}</b>
          </div>
          <el-progress :percentage="Number(item.contactRate || 0)" :show-text="false" :stroke-width="8" />
          <div class="rate">{{ Number(item.contactRate || 0).toFixed(1) }}%</div>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup name="LiveStats">
import * as echarts from 'echarts'
import { weeklyStats } from '@/api/live/stats'
import { listStreamers } from '@/api/live/upload'

const loading = ref(false)
const cards = ref([])
const customerCards = ref([])
const trend = ref([])
const streamers = ref([])
const overview = ref({})
const trendChartRef = ref(null)
let trendChart = null

const today = new Date()
const defaultEnd = formatDate(today)
const defaultBegin = formatDate(new Date(today.getTime() - 6 * 86400000))
const dateRange = ref([defaultBegin, defaultEnd])

const query = reactive({
  beginDate: defaultBegin,
  endDate: defaultEnd,
  streamerId: undefined
})

const weekNo = computed(() => {
  const firstDay = new Date(new Date(query.endDate).getFullYear(), 0, 1)
  const diff = Math.floor((new Date(query.endDate) - firstDay) / 86400000)
  return Math.ceil((diff + firstDay.getDay() + 1) / 7)
})

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function healthText(health, changeRate) {
  if (health === 'good') return `月度 ${Number(changeRate || 0).toFixed(1)}% · 稳健`
  if (health === 'risk') return `月度 ${Number(changeRate || 0).toFixed(1)}% · 急需`
  if (health === 'watch') return `月度 ${Number(changeRate || 0).toFixed(1)}% · 观察`
  return '暂无对比'
}

function healthTag(health) {
  return health === 'good' ? 'success' : health === 'risk' ? 'danger' : health === 'watch' ? 'warning' : 'info'
}

function handleDateChange(value) {
  if (value && value.length === 2) {
    query.beginDate = value[0]
    query.endDate = value[1]
    loadData()
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await weeklyStats(query)
    const data = res.data || {}
    overview.value = data.overview || {}
    cards.value = data.cards || []
    customerCards.value = data.customerCards || []
    trend.value = data.trend || []
    await nextTick()
    renderTrend()
  } finally {
    loading.value = false
  }
}

function renderTrend() {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
    window.addEventListener('resize', () => trendChart && trendChart.resize())
  }
  const dates = [...new Set(trend.value.map(item => item.bizDate))]
  const names = [...new Set(trend.value.map(item => item.stageName))]
  const series = names.map(name => ({
    name,
    type: 'line',
    smooth: true,
    symbolSize: 7,
    data: dates.map(date => {
      const row = trend.value.find(item => item.bizDate === date && item.stageName === name)
      return row ? Number(row.totalXu || 0) : 0
    })
  }))
  trendChart.setOption({
    color: ['#16a34a', '#2563eb', '#dc2626', '#111827', '#ca8a04', '#7c3aed'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 0, textStyle: { fontSize: 11 } },
    grid: { left: 36, right: 18, top: 42, bottom: 28 },
    xAxis: { type: 'category', data: dates, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf0f2' } } },
    series
  })
}

listStreamers().then(res => {
  streamers.value = res.data || []
})
loadData()
</script>

<style scoped>
.live-report-page {
  min-height: calc(100vh - 84px);
  background: #f4f5f3;
  color: #111827;
}

.report-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 30px 42px 26px;
  background: #fff;
  border-bottom: 1px solid #d9ded8;
}

.eyebrow {
  color: #8b949e;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
}

.report-header h1 {
  margin: 10px 0 6px;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
}

.report-header p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.filter-bar {
  display: flex;
  justify-content: flex-end;
}

.report-body {
  padding: 18px 42px 42px;
}

.overview-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 22px;
}

.overview-pills span {
  padding: 5px 12px;
  color: #6b7280;
  background: #fff;
  border: 1px solid #d9ded8;
  border-radius: 999px;
  font-size: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  margin: 22px 0 12px;
  color: #8b949e;
  font-size: 12px;
  font-weight: 700;
}

.section-title::after {
  content: "";
  flex: 1;
  height: 1px;
  margin-left: 10px;
  background: #d9ded8;
}

.streamer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(240px, 1fr));
  gap: 14px;
}

.streamer-card,
.chart-panel,
.customer-card {
  background: #fff;
  border: 1px solid #dcdfe3;
  border-radius: 6px;
}

.streamer-card {
  padding: 16px;
  border-top: 3px solid #9ca3af;
}

.streamer-card.good { border-top-color: #16a34a; }
.streamer-card.watch { border-top-color: #ca8a04; }
.streamer-card.risk { border-top-color: #dc2626; }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-top strong {
  font-size: 14px;
}

.main-number {
  margin-top: 12px;
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.delta {
  margin-top: 7px;
  color: #059669;
  font-size: 12px;
}

.delta.down {
  color: #dc2626;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 20px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
}

.metrics span,
.customer-row span,
.panel-heading span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.metrics b,
.customer-row b {
  display: block;
  margin-top: 4px;
  font-size: 14px;
}

.chart-panel {
  padding: 16px;
}

.panel-heading {
  margin-bottom: 8px;
}

.panel-heading strong {
  display: block;
  margin-bottom: 4px;
}

.trend-chart {
  height: 300px;
}

.customer-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: 14px;
}

.customer-card {
  padding: 14px;
}

.customer-card.alert {
  border-top: 3px solid #dc2626;
}

.customer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid #eef0f2;
}

.rate {
  margin-top: 7px;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .streamer-grid {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .customer-grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }
}

@media (max-width: 760px) {
  .report-header {
    display: block;
    padding: 22px 16px;
  }

  .filter-bar {
    justify-content: flex-start;
    margin-top: 16px;
  }

  .report-body {
    padding: 14px 16px 28px;
  }

  .streamer-grid,
  .customer-grid {
    grid-template-columns: 1fr;
  }

  .trend-chart {
    height: 240px;
  }
}
</style>
