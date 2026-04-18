# 睡了么

一个围绕大学生日程、补觉和休息地点推荐的前端原型项目。

项目当前仍然是纯前端架构，但 AI 调度层已经改成了可配置模式，不再绑定 Gemini。你现在可以自己决定调用哪个 API，以及是否使用自定义请求协议。

## 项目思路

- 结合用户睡眠欠债、课程表、出行方式和吃饭偏好，生成当天补觉时间轴
- 后续可以继续扩展课表 OCR、地图导航、地点推荐和后端代理服务
- 当前页面中的 AI 结果如果不可用，会自动回退到本地示例时间轴

## 本地运行

**前置条件：** Node.js

1. 安装依赖：`npm install`
2. 按需创建 `.env.local`
3. 启动开发环境：`npm run dev`

## AI 配置

项目默认读取这些环境变量：

- `VITE_SLEEP_SCHEDULER_MODE`
- `VITE_LLM_API_URL`
- `VITE_LLM_API_KEY`
- `VITE_LLM_MODEL`
- `VITE_LLM_VISION_MODEL`
- `VITE_LLM_AUTH_SCHEME`
- `VITE_LLM_EXTRA_HEADERS`

### 1. OpenAI-compatible 模式

适用于兼容 `/v1/chat/completions` 协议的接口。

```env
VITE_SLEEP_SCHEDULER_MODE=openai-compatible
VITE_LLM_API_URL=https://your-api-host/v1/chat/completions
VITE_LLM_API_KEY=your-api-key
VITE_LLM_MODEL=your-model-name
VITE_LLM_VISION_MODEL=your-multimodal-model-name
```

如果你的服务不是 `Bearer` 鉴权，还可以额外设置：

```env
VITE_LLM_AUTH_SCHEME=Bearer
VITE_LLM_EXTRA_HEADERS={"X-Custom-Header":"demo"}
```

### 2. Custom 模式

如果你的接口协议和 OpenAI-compatible 不一致，可以把模式切到 `custom`，然后直接修改 [src/lib/customSleepScheduler.ts](./src/lib/customSleepScheduler.ts)：

```env
VITE_SLEEP_SCHEDULER_MODE=custom
VITE_LLM_API_URL=https://your-own-api
VITE_LLM_API_KEY=your-api-key
VITE_LLM_MODEL=your-model-name
```

这个文件里你可以完全自己定义：

- 请求 URL
- headers
- body 结构
- 响应解析方式

课表导入现在会优先使用 `VITE_LLM_VISION_MODEL`，如果没有设置，则回退到 `VITE_LLM_MODEL`。

### 3. Mock 模式

如果你只想看页面效果、不发任何 AI 请求：

```env
VITE_SLEEP_SCHEDULER_MODE=mock
```

## 说明

- 现在 `Timeline` 页面已经不再依赖 Gemini SDK。
- 由于这是纯前端项目，任何直接放在前端环境变量里的 API Key 都可能暴露给浏览器。后续如果要上线，建议把真正的密钥调用迁到后端代理。
