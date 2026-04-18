# 睡了么 WHUSLEEP

一个围绕武汉大学校园场景设计的睡眠恢复前端原型。项目把课表导入、补觉时间轴、校园地图、睡友社交、聊天和留言板串在一起，目标是帮助大学生在上课、吃饭、通勤和休息之间，更轻松地安排“补觉”这件事。

当前仓库以 React + Vite 前端为主，部分能力可以纯本地体验，部分能力需要接入 LLM、高德地图和 Supabase 后才会完整生效。

## 现在已经实现的功能

### 1. 引导与个人化设置

- 首次进入会先走引导页，要求先准备课表后再进入主流程
- 支持上传课表截图，调用多模态模型做 OCR 识别
- 识别结果可以手动校准、删除、补录，再保存为正式课表
- 支持选择日常交通方式：步行 / 电动车 / 校巴
- 支持设置常去食堂，并添加自定义地点

### 2. 首页睡眠面板

- 记录当天睡眠时长和睡眠质量
- 自动计算今日睡眠缺口 `sleepDebt`
- 根据当前状态给出默认目标入睡时间，也支持手动修改
- 展示最近 7 天睡眠趋势图
- 支持一键开启“睡眠模式”进行小睡倒计时
- 展示每日“躺平语录”和社交状态卡片

### 3. 补觉时间轴

- 根据课表挑选参考日程，生成“今天什么时候上课、什么时候能补觉”的时间轴
- 接入 LLM 时，会把课程、通勤、用餐和补觉窗口一起规划出来
- LLM 不可用时，会自动退回到仅展示课程事件的本地时间轴
- 高优先级补觉窗口可以直接进入睡眠模式

### 4. 校园地图

- 围绕当前节点和下一个节点展示校园动线
- 接入高德地图 JS API 后可直接显示地图、标记点和路线
- 路线规划支持步行 / 电动车 / 校巴三种模式
- 当高德 JS 路线失败时，会退回到 REST 距离测量兜底
- 食堂偏好和课表地点会联动到地图规划

### 5. 睡友社交

- 上报在线状态、位置和当前补觉需求
- 查看附近睡友、同样在“补觉还债”的人
- 支持发送好友申请、接受申请、删除好友
- 好友之间支持实时聊天

### 6. 留言板与个人页

- 留言板支持发帖、分类筛选、匿名发言、点赞、回复
- 留言板数据当前保存在本地 `localStorage`
- 个人页支持编辑基础资料
- 个人页可以继续修改交通方式、食堂偏好并返回课表校准入口

### 7. 按钮级 AI 提示层

- 项目内很多按钮都挂了 `data-ai-*` 元数据
- 接入 LLM 后，可以根据当前页面和状态生成即时操作说明
- LLM 不可用时，会退回到本地预设文案

## 功能与依赖关系

| 功能 | 不额外配置时 | 需要的额外配置 |
| --- | --- | --- |
| 页面骨架、首页睡眠记录、个人设置、留言板 | 可直接运行 | 无 |
| 手动补录课表并生成基础时间轴 | 可运行 | 无 |
| 课表截图 OCR | 不可用 | LLM 接口 + 多模态模型 |
| AI 补觉时间轴 | 可降级到本地课表时间轴 | LLM 接口 |
| 按钮级 AI 说明 | 可降级到本地提示 | LLM 接口 |
| 校园地图渲染与真实路线 | 部分空状态 / 兜底逻辑可见 | 高德 JS API，建议同时配置 Web Service |
| 睡友状态、好友、聊天 | 不可用 | Supabase |

## 技术栈

- `React 19`
- `TypeScript`
- `Vite 6`
- `React Router`
- `motion`
- `Recharts`
- `Tailwind CSS 4`
- `Supabase JS`
- `高德地图 JS API / Web Service`

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

如果你只是想先看纯前端交互，不一定要一次性把所有配置补齐；但 OCR、AI 时间轴、地图和社交能力会按下面的说明分别依赖外部服务。

### 3. 启动开发环境

```bash
npm run dev
```

默认地址：

- [http://localhost:3000](http://localhost:3000)

### 4. 构建生产包

```bash
npm run build
```

## 环境变量说明

根目录的 `.env.example` 已经给出了示例配置。

### LLM 相关

```env
VITE_SLEEP_SCHEDULER_MODE=openai-compatible
VITE_LLM_API_URL=https://your-api-host/v1/chat/completions
VITE_LLM_API_KEY=your-api-key
VITE_LLM_MODEL=your-model-name
VITE_LLM_VISION_MODEL=your-multimodal-model-name
VITE_LLM_AUTH_SCHEME=Bearer
VITE_LLM_EXTRA_HEADERS={"X-Custom-Header":"demo"}
```

`VITE_SLEEP_SCHEDULER_MODE` 支持三种模式：

- `openai-compatible`
  默认模式。用于接兼容 `/chat/completions` 的接口，时间轴生成、课表 OCR、按钮提示都走这条链路。
- `custom`
  需要自己实现 [src/lib/customSleepScheduler.ts](/Users/seint/Desktop/WHUSLEEP/src/lib/customSleepScheduler.ts) 里的请求逻辑。
- `mock`
  不发真实 AI 请求。按钮提示会走本地 fallback，时间轴会降级为课程列表；课表 OCR 不可用。

### 高德地图相关

```env
VITE_AMAP_KEY=your-amap-js-api-key
VITE_AMAP_SECURITY_JS_CODE=your-amap-security-js-code
VITE_AMAP_MAP_STYLE=amap://styles/whitesmoke
VITE_AMAP_WEB_SERVICE_KEY=your-amap-web-service-key
```

- `VITE_AMAP_KEY` + `VITE_AMAP_SECURITY_JS_CODE`
  用于前端地图渲染和路线规划
- `VITE_AMAP_WEB_SERVICE_KEY`
  用于 POI 搜索、距离测量、地理编码等 REST 兜底能力

### Supabase 相关

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

用于：

- 在线状态上报
- 附近睡友
- 好友关系
- 私聊与实时订阅

## Supabase 初始化

根目录提供了 [supabase_schema.sql](/Users/seint/Desktop/WHUSLEEP/supabase_schema.sql)。

这份脚本会创建并配置以下表：

- `users`
- `user_presence`
- `friendships`
- `messages`

同时还会：

- 建立基础索引
- 把 `user_presence`、`friendships`、`messages` 加入 Supabase Realtime
- 开启一套偏演示用途的简化 RLS 策略

如果你要把它用于正式环境，建议重新审查这份 SQL 里的 RLS 和匿名访问策略。

## 项目结构

```text
src/
  components/   通用组件、睡眠模式、食堂选择器、AI 提示层
  lib/          课表处理、LLM 调用、地图封装、Supabase 社交能力
  pages/        Onboarding / Home / Timeline / Map / Social / Chat / MessageBoard / Profile
  store.tsx     全局状态与 localStorage 持久化
docs/           项目补充文档
supabase_schema.sql
```

## 关键实现说明

- 课表是整个应用的入口条件，未导入课表时会被引导到 onboarding
- `store.tsx` 里维护了睡眠记录、课表、食堂偏好、交通方式、留言板数据等本地状态
- 睡眠缺口基于“推荐 8 小时睡眠”与今日记录自动计算
- 留言板当前是本地数据；睡友社交和聊天才是 Supabase 后端数据
- AI 相关能力都做了 fallback，不会因为接口失败直接把页面打挂
- 地图也做了分层降级：JS API 优先，失败后再退到 REST 距离测量

## 当前已知限制

- 这仍然是一个前端原型，密钥直接放在前端环境变量里并不适合正式上线
- 课表 OCR 对截图清晰度、排版和兼容层的多模态支持比较敏感
- `custom` 模式目前只是预留扩展点，需要自行实现
- 个人页里部分“通知设置 / 语言设置 / 隐私设置”等入口仍是占位按钮
- 社交和聊天依赖浏览器定位权限与 Supabase 配置

## 后续可以继续扩展的方向

- 更稳定的武汉大学课表 OCR 与课节时间映射
- 后端代理层，避免在前端暴露真实 API Key
- 更完整的地图 POI 推荐和补觉地点排序
- 留言板接入真实后端与内容审核
- 睡眠统计、课程冲突、晚睡预警等更多数据分析能力
