import request from '@/utils/request'

export function weeklyStats(query) {
  return request({
    url: '/live/stats/weekly',
    method: 'get',
    params: query
  })
}
