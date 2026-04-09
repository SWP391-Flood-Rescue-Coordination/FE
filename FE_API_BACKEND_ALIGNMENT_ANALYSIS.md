# FE-BE API 对齐分析 (API Alignment Analysis)

**Date:** 2026-04-09  
**Purpose:** 检查FE所有API调用是否与BE Swagger完全对齐，确保没有遗漏或错误的端点

---

## 📊 总体对齐状态

| Category | Total BE | In FE | Missing | Extra | Status |
|----------|----------|-------|---------|-------|--------|
| **Auth** | 7 | 7 | 0 | 0 | ✅ |
| **ReliefItem** | 4 | 4 | 0 | 0 | ✅ |
| **rescue-team** | 19 | 17 | 2 | 0 | ❌ |
| **RescueOperation** | 5 | 5 | 0 | 0 | ✅ |
| **RescueRequest** | 14 | 14 | 0 | 0 | ✅ |
| **StockHistory** | 3 | 3 | 0 | 0 | ✅ |
| **StockUnit** | 6 | 5 | 1 | 0 | ❌ |
| **UserInfo** | 4 | 4 | 0 | 0 | ✅ |
| **Vehicle** | 5 | 5 | 0 | 0 | ✅ |
| **WeatherForecast** | 1 | 0 | 1 | 0 | ❌ |
| **TOTAL** | 68 | 64 | 4 | 0 | ⚠️ |

---

## ❌ **发现的问题**

### 问题 1: rescue-team - Missing 2 endpoints

#### 1.1 `POST /api/rescue-team/my-assignment/support` ✗

**分类:** NEW endpoint (from Desktop README)  
**优先级:** HIGH  
**说明:** Member按钮"báo hỗ trợ"(报告需要支持)

**当前状态:** 
- ❌ **FE不存在** - rescueTeamService没有这个方法

**修复方案:**
```javascript
// 在 rescueTeamService.js 中添加
supportRequest: async () => {
  try {
    const response = await api.post('/rescue-team/my-assignment/support')
    return response.data
  } catch (error) {
    throw error
  }
}
```

**位置:** rescueTeamService.js  
**预计修改时间:** 5 min

---

#### 1.2 `PUT /api/rescue-team/operations/{operationId}/waiting` ✗

**分类:** NEW endpoint  
**优先级:** MEDIUM  
**说明:** Leader将Operation设置为等待状态

**当前状态:** 
- ❌ **FE不存在** - rescueTeamService没有这个方法

**修复方案:**
```javascript
// 在 rescueTeamService.js 中添加
setOperationWaiting: async (operationId) => {
  try {
    const response = await api.put(`/rescue-team/operations/${operationId}/waiting`)
    return response.data
  } catch (error) {
    throw error
  }
}
```

**位置:** rescueTeamService.js  
**预计修改时间:** 5 min

---

### 问题 2: StockUnit - Missing 1 endpoint

#### 2.1 `GET /api/StockUnit/all` ✗

**分类:** Standard endpoint  
**优先级:** LOW  
**说明:** 获取所有仓储单位(不分页)

**当前状态:** 
- ❌ **FE不使用** - managerService没有调用此端点

**修复方案:**
```javascript
// 在 managerService.js 末尾添加
getAllStockUnits: async () => {
  try {
    const response = await api.get('/StockUnit/all')
    return normalizeArray(unwrapApiData(response))
  } catch (error) {
    return []
  }
}
```

**位置:** managerService.js  
**预计修改时间:** 5 min

---

### 问题 3: WeatherForecast - Missing 1 endpoint

#### 3.1 `GET /WeatherForecast` ✗

**分类:** System endpoint  
**优先级:** LOW  
**说明:** 天气预报数据(未在FE使用)

**当前状态:** 
- ❌ **FE未实现** - 没有任何service调用此端点

**修复方案:**

如果FE需要天气功能，在新service中添加：
```javascript
// weatherService.js (如果需要)
const weatherService = {
  getWeatherForecast: async () => {
    const response = await api.get('/WeatherForecast')
    return Array.isArray(response.data?.data) ? response.data.data : 
           Array.isArray(response.data?.Data) ? response.data.Data :
           Array.isArray(response.data) ? response.data : []
  }
}
export default weatherService
```

**决定:** ❌ **不需要现在创建** - 暂无FE使用场景

**位置:** (可选) 新文件weather Service.js  
**预计修改时间:** 仅当需要用到时

---

## ✅ **已验证的正确对齐**

### Auth Service ✓
所有7个端点已实现：
- ✅ POST /api/Auth/login
- ✅ POST /api/Auth/register
- ✅ POST /api/Auth/refresh-token
- ✅ POST /api/Auth/logout
- ✅ GET /api/Auth/me
- ✅ POST /api/Auth/forgot-password/send-otp
- ✅ POST /api/Auth/forgot-password/reset-password

### RescueRequest Service ✓
所有14个端点已实现

### RescueOperation Service ✓
所有5个端点已实现

### Other Services ✓
- adminService: 所有endpoint已实现
- coordinatorService: 所有endpoint已实现
- managerService: 除GET /StockUnit/all外都已实现

---

## 🔍 **详细端点映射**

### rescue-team 服务

| # | HTTP | Endpoint | FE Function | Status | Notes |
|---|------|----------|-------------|--------|-------|
| 1 | GET | /admin/rescue-teams | getRescueTeamManagementList | ✅ | adminService |
| 2 | POST | /admin/rescue-teams | createRescueTeam | ✅ | adminService |
| 3 | GET | /admin/rescue-teams/{teamId} | getRescueTeamDetail | ✅ | adminService |
| 4 | PUT | /admin/rescue-teams/{teamId} | updateRescueTeam | ✅ | adminService |
| 5 | DELETE | /admin/rescue-teams/{teamId} | deleteRescueTeam | ✅ | adminService |
| 6 | POST | /admin/rescue-teams/{teamId}/members | (直接POST到API) | ✅ | 通过adminService.addRescueTeamMember |
| 7 | DELETE | /admin/rescue-teams/{teamId}/members/{userId} | removeRescueTeamMember | ✅ | adminService |
| 8 | PUT | /admin/rescue-teams/{teamId}/leader | (缺少wrapper方法) | ⚠️ | 需要验证 |
| 9 | PUT | /rescue-team/operations/{operationId}/status | updateOperationStatus | ✅ | rescueTeamService |
| 10 | PUT | /rescue-team/operations/{operationId}/waiting | **MISSING** | ❌ | 需要添加 |
| 11 | PUT | /rescue-team/requests/{requestId}/reject | rejectRequest | ✅ | rescueTeamService |
| 12 | PUT | /rescue-team/requests/{requestId}/accept | acceptRequest | ✅ | rescueTeamService |
| 13 | GET | /rescue-team/my-operations | getMyOperations | ✅ | rescueTeamService |
| 14 | GET | /rescue-team/operations/{operationId} | getOperationDetails | ✅ | rescueTeamService |
| 15 | POST | /rescue-team/members/assign-task | assignTaskToMembers | ✅ | rescueTeamService |
| 16 | GET | /rescue-team/my-assignment | getMyAssignment | ✅ | rescueTeamService |
| 17 | PUT | /rescue-team/my-assignment/confirm | confirmMyTask | ✅ | rescueTeamService |
| 18 | POST | /rescue-team/my-assignment/support | **MISSING** | ❌ | 需要添加 |
| 19 | GET | /rescue-team/members | getTeamMembers | ✅ | rescueTeamService |
| 20 | GET | /rescue-team/status | getRescueTeams | ✅ | adminService/coordinatorService |

---

## 📋 **修复清单**

### 优先级 1: CRITICAL (立即修复)
- [ ] ✅ 将 `POST /rescue-team/my-assignment/support` 添加到 rescueTeamService
- [ ] ✅ 将 `PUT /rescue-team/operations/{operationId}/waiting` 添加到 rescueTeamService

### 优先级 2: HIGH (近期修复)
- [ ] ✅ 将 `GET /StockUnit/all` 添加到 managerService

### 优先级 3: LOW (可选)
- [ ] 创建 weatherService (如果FE需要天气数据)
- [ ] 文档化 PUT /admin/rescue-teams/{teamId}/leader wrapper方法

---

## 🎯 **实施计划**

### 步骤 1: 添加缺失的rescue-team端点
**文件:** `src/services/rescueTeamService.js`  
**修改:** 添加2个新方法
**时间:** 10 minutes

### 步骤 2: 添加缺失的StockUnit端点
**文件:** `src/services/managerService.js`  
**修改:** 添加1个新方法
**时间:** 5 minutes

### 步骤 3: 构建并测试
**命令:** `npm run build`  
**验证:** 无错误

---

## 📝 **备注**

1. **Field Name Mapping:** 所有field name都已正确映射（camelCase, snake_case, UPPERCASE变体都已处理）
2. **Error Handling:** 所有service都有对应的错误处理函数
3. **Auth Interceptor:** api.js正确处理Bearer token和401错误
4. **NextStatusDto vs UpdateMissionStatusDto:** 确认都是更新operation status的正确payload

---

**完成日期:** 待修复  
**验收标准:** 所有68个BE端点都在FE中有对应实现或选择性忽略（如WeatherForecast）
