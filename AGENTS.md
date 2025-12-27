# Omnix Vibe-Coding 指南

## 架构概览

Omnix 是一个部署在 **Cloudflare Workers** 上的 **React + Vite SPA**，支持边缘侧 AI 流式响应。

```
src/           → 前端 (React 19, Zustand, MUI + Ark UI)
worker/        → Cloudflare Worker (Hono API, AI 流式传输)
shared/dto/    → 前后端共享的 TypeScript DTO
```

### 数据流模式
1. 前端通过 `src/features/*/api/*.ts` 调用 `/api/life-kline`
2. Worker 在 `worker/features/*/service.ts` 中校验请求
3. Worker 在 `worker/features/*/prompts.ts` 中构建提示词
4. AI 响应以文本流形式返回，由 `src/features/*/lib/yamlStreamParser.ts` 解析
5. 图表 Hook 增量消费解析后的数据

## 开发命令

```bash
npm run dev        # 启动 Vite + Worker 开发服务器 (0.0.0.0)
npm run build      # TypeScript 检查 + Vite 构建
npm run deploy     # 构建 + Wrangler 部署到 Cloudflare
npm run test       # Vitest (jsdom 环境)
npm run cf-typegen # 生成 worker-configuration.d.ts
```

### 本地环境配置
在项目根目录创建 `.dev.vars` 文件配置 Worker 环境变量：
```
AI_API_KEY=your-api-key
AI_API_BASE=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

## 代码模式

### Feature Slice 结构 (参考 FSD)
每个功能模块位于 `src/features/<name>/` 下：
```
index.ts       → 仅导出公开 API
api/           → API 调用 (fetch 封装)
lib/           → 纯工具函数 (解析器、辅助函数)
model/         → Hook、类型、状态逻辑 (useXxxController, useXxxChart)
ui/            → React 组件
```

### 状态管理
- **全局状态**: Zustand store，位于 `src/app/store/appStore.ts`
- **功能状态**: 本地 `useState` + Controller Hook (如 `useLifeKlineController`)
- **图表状态**: 使用 Ref 管理 `lightweight-charts` 实例 (见 `useLifeKlineChart`)

### AI 流式响应模式
```typescript
// Worker: 从 createChatCompletionStream() 返回 ReadableStream
// 前端: 使用 yamlStreamParser 进行增量 YAML 解析
const parser = createYamlStreamParser({
  onResult: (partial) => setAnalysis(partial),
  onChartPoint: (point) => addChartPoint(point),
})
```

### UI 组件库
- **Ark UI**: 无样式原语组件 (Select, Portal) - `@ark-ui/react`
- **MUI**: 表单控件 (TextField, DatePicker) - `@mui/material`
- 主题: 通过 MUI 的 `createTheme()` 处理，支持深色模式检测

### Worker API 模式
```typescript
// worker/features/<name>/handler.ts
export const handleXxx = async (request: Request, env: Env) => {
  const validated = validateRequest(payload)  // service.ts
  const prompt = buildPrompt(params)          // prompts.ts
  return new Response(stream, { headers: {...} })
}
```

## 重要文件

| 用途 | 位置 |
|------|------|
| 功能注册 | `src/app/config/features.ts` |
| 共享 DTO | `shared/dto/lifeKline.ts` |
| AI 流式工具 | `worker/shared/ai/chatCompletions.ts` |
| Worker 环境类型 | `worker/shared/types.ts` (Env 接口) |
| 路径别名 `@/` | 配置于 `vite.config.ts` |

## 约定

- **导入**: 使用 `@/` 别名引用 `src/` 路径
- **类型**: 从 `model/types.ts` 导出，DTO 从 `shared/dto/` 导出
- **中文本地化**: dayjs 使用 `zh-cn`，UI 文本为中文
- **lunar-typescript**: 用于计算大运、流年、干支等命理数据。文档查询：通过 Context7 工具使用 library ID `/websites/6tail_cn_calendar` 获取（可以通过搜索"libraryName"为"lunar"时找到）
- **错误处理**: Worker 中返回 `jsonResponse({ error }, { status })`
