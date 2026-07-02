<template>
  <div class="app-container">
    <!-- 每日提交 -->
    <el-card class="box-card" shadow="never">
      <template #header><b>每日提交</b></template>
      <el-form :model="form" label-width="90px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="业务日期" required>
              <el-date-picker v-model="form.bizDate" type="date" value-format="YYYY-MM-DD" placeholder="数据属于哪一天" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="主播" required>
              <el-select v-model="form.streamerId" placeholder="选择主播" style="width: 100%">
                <el-option v-for="s in streamers" :key="s.streamerId" :label="s.stageName" :value="s.streamerId" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="打赏榜截图">
              <el-upload ref="giftUploadRef" v-model:file-list="giftFiles" :auto-upload="false" multiple accept="image/*" list-type="picture-card">
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="聊天截图">
              <el-upload ref="chatUploadRef" v-model:file-list="chatFiles" :auto-upload="false" multiple accept="image/*" list-type="picture-card">
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="工作汇报">
          <el-input v-model="form.rawText" type="textarea" :rows="2" placeholder="如:Zhenzhen Ngày 1/7 Tổng 27079" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">提 交</el-button>
          <span class="tip">三项可分次提交,同一天自动归到一起</span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 查询 + 列表 -->
    <el-card class="box-card" shadow="never" style="margin-top: 12px">
      <el-form :model="query" inline>
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="-" start-placeholder="开始" end-placeholder="结束" />
        </el-form-item>
        <el-form-item label="主播">
          <el-select v-model="query.streamerId" placeholder="全部" clearable style="width: 160px">
            <el-option v-for="s in streamers" :key="s.streamerId" :label="s.stageName" :value="s.streamerId" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" v-show="activeTab === 'detail'">
          <el-select v-model="query.uploadType" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-tabs v-model="activeTab" @tab-change="handleQuery">
        <!-- 按日汇总 -->
        <el-tab-pane label="按日汇总" name="daily">
          <el-table v-loading="loading" :data="dailyList">
            <el-table-column label="日期" prop="bizDate" width="120" />
            <el-table-column label="主播" prop="stageName" width="140" />
            <el-table-column label="打赏榜截图" align="center">
              <template #default="{ row }">
                <el-tag :type="row.giftCount > 0 ? 'success' : 'danger'">{{ row.giftCount > 0 ? row.giftCount + ' 张' : '未交' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="聊天截图" align="center">
              <template #default="{ row }">
                <el-tag :type="row.chatCount > 0 ? 'success' : 'danger'">{{ row.chatCount > 0 ? row.chatCount + ' 张' : '未交' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="工作汇报" align="center">
              <template #default="{ row }">
                <el-tag :type="row.reportCount > 0 ? 'success' : 'danger'">{{ row.reportCount > 0 ? '已交' : '未交' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <pagination v-show="dailyTotal > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="dailyTotal" @pagination="loadDaily" />
        </el-tab-pane>

        <!-- 明细 -->
        <el-tab-pane label="明细列表" name="detail">
          <el-table v-loading="loading" :data="detailList">
            <el-table-column label="内容" width="110" align="center">
              <template #default="{ row }">
                <el-image v-if="row.filePath" :src="baseApi + row.filePath" :preview-src-list="[baseApi + row.filePath]" preview-teleported fit="cover" style="width: 80px; height: 80px" />
                <span v-else class="report-text">{{ row.rawText }}</span>
              </template>
            </el-table-column>
            <el-table-column label="日期" prop="bizDate" width="110" />
            <el-table-column label="主播" prop="stageName" width="120" />
            <el-table-column label="类型" width="110" align="center">
              <template #default="{ row }">{{ typeLabel(row.uploadType) }}</template>
            </el-table-column>
            <el-table-column label="识别状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.aiStatus)">{{ statusLabel(row.aiStatus) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="上传人" prop="uploadByName" width="120" />
            <el-table-column label="上传时间" prop="createTime" width="170" />
            <el-table-column label="操作" width="90" align="center">
              <template #default="{ row }">
                <el-button v-hasPermi="['live:upload:remove']" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pagination v-show="detailTotal > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="detailTotal" @pagination="loadDetail" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup name="LiveUpload">
import { listUpload, dailySummary, uploadImages, submitReport, delUpload, listStreamers } from '@/api/live/upload'

const { proxy } = getCurrentInstance()
const baseApi = import.meta.env.VITE_APP_BASE_API

const streamers = ref([])
const giftFiles = ref([])
const chatFiles = ref([])
const submitting = ref(false)
const loading = ref(false)
const activeTab = ref('daily')
const dailyList = ref([])
const dailyTotal = ref(0)
const detailList = ref([])
const detailTotal = ref(0)
const dateRange = ref([])

const form = reactive({
  bizDate: proxy.parseTime(new Date(), '{y}-{m}-{d}'),
  streamerId: undefined,
  rawText: ''
})

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  streamerId: undefined,
  uploadType: undefined
})

const typeOptions = [
  { value: '1', label: '打赏榜截图' },
  { value: '2', label: '聊天截图' },
  { value: '3', label: '汇报文本' }
]

function typeLabel(v) {
  return (typeOptions.find(t => t.value === v) || {}).label || v
}
function statusLabel(v) {
  return { '0': '待识别', '1': '已识别', '2': '已校正', '3': '识别失败' }[v] || v
}
function statusTag(v) {
  return { '0': 'info', '1': 'warning', '2': 'success', '3': 'danger' }[v] || 'info'
}

async function handleSubmit() {
  if (!form.bizDate) return proxy.$modal.msgError('请选择业务日期')
  if (!form.streamerId) return proxy.$modal.msgError('请选择主播')
  const hasGift = giftFiles.value.length > 0
  const hasChat = chatFiles.value.length > 0
  const hasReport = form.rawText && form.rawText.trim() !== ''
  if (!hasGift && !hasChat && !hasReport) return proxy.$modal.msgError('请至少填写一项内容')

  submitting.value = true
  try {
    if (hasGift) {
      await doUploadImages('1', giftFiles.value)
      giftFiles.value = []
    }
    if (hasChat) {
      await doUploadImages('2', chatFiles.value)
      chatFiles.value = []
    }
    if (hasReport) {
      await submitReport({ bizDate: form.bizDate, streamerId: form.streamerId, rawText: form.rawText.trim() })
      form.rawText = ''
    }
    proxy.$modal.msgSuccess('提交成功')
    handleQuery()
  } finally {
    submitting.value = false
  }
}

function doUploadImages(uploadType, files) {
  const fd = new FormData()
  fd.append('bizDate', form.bizDate)
  fd.append('streamerId', form.streamerId)
  fd.append('uploadType', uploadType)
  files.forEach(f => fd.append('files', f.raw))
  return uploadImages(fd)
}

function buildParams() {
  const p = { ...query }
  if (dateRange.value && dateRange.value.length === 2) {
    p.beginDate = dateRange.value[0]
    p.endDate = dateRange.value[1]
  }
  return p
}

async function loadDaily() {
  loading.value = true
  try {
    const res = await dailySummary(buildParams())
    dailyList.value = res.rows
    dailyTotal.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadDetail() {
  loading.value = true
  try {
    const res = await listUpload(buildParams())
    detailList.value = res.rows
    detailTotal.value = res.total
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  query.pageNum = 1
  activeTab.value === 'daily' ? loadDaily() : loadDetail()
}

function resetQuery() {
  dateRange.value = []
  query.streamerId = undefined
  query.uploadType = undefined
  handleQuery()
}

function handleDelete(row) {
  proxy.$modal.confirm('确认删除这条上传记录吗?文件将一并删除').then(() => delUpload(row.uploadId)).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    handleQuery()
  }).catch(() => {})
}

listStreamers().then(res => {
  streamers.value = res.data || []
  if (streamers.value.length === 1) {
    form.streamerId = streamers.value[0].streamerId
  }
})
handleQuery()
</script>

<style scoped>
.tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
.report-text {
  font-size: 12px;
  color: #606266;
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
