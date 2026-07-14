# hikvideoctrl

[![npm version](https://img.shields.io/npm/v/hikvideoctrl.svg)](https://www.npmjs.com/package/hikvideoctrl)
[![license](https://img.shields.io/npm/l/hikvideoctrl.svg)](./LICENSE)

海康威视无插件 Web 视频 SDK 的 TypeScript 封装，基于官方 `WebSDK_noPlugin V3.4.0`。将底层同步/回调/Promise 混合调用形态统一为 `async/await` 接口，提供完整类型定义、语义化事件模型与结构化错误处理。

适用于 Vue、React、Svelte 等现代前端框架及原生项目，覆盖设备接入、实时预览、录像回放、抓拍录像、云台控制与设备维护等完整监控业务流。

## 目录

- [特性](#特性)
- [安装](#安装)
- [准备静态资源](#准备静态资源)
- [运行环境](#运行环境)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [Vue 3 示例](#vue-3-示例)
- [React 示例](#react-示例)
- [完整 API 参考](#完整-api-参考)
  - [加载与创建](#加载与创建)
  - [实例属性与状态](#实例属性与状态)
  - [生命周期](#生命周期)
  - [事件订阅](#事件订阅)
  - [设备与通道](#设备与通道)
  - [实时预览](#实时预览)
  - [回放控制](#回放控制)
  - [窗口与布局](#窗口与布局)
  - [音量、缩放与加密](#音量缩放与加密)
  - [抓拍录像与下载](#抓拍录像与下载)
  - [PTZ 云台](#ptz-云台)
  - [设备维护](#设备维护)
  - [透传请求与文件选择](#透传请求与文件选择)
  - [低级桥接 API](#低级桥接-api)
  - [错误类与辅助函数](#错误类与辅助函数)
  - [工具函数](#工具函数)
  - [常量与取值](#常量与取值)
  - [类型速查](#类型速查)
- [事件](#事件)
- [错误处理](#错误处理)
- [常见业务组合](#常见业务组合)
- [排障指南](#排障指南)
- [测试](#测试)
- [开发命令](#开发命令)
- [致谢](#致谢)
- [License](#license)

## 特性

- **全面 Promise 化**：登录、预览、回放、抓拍、PTZ、录像、升级等操作均支持 `await`，失败统一抛出 `HikError`。
- **完整 TypeScript 支持**：导出所有常量字面量类型、参数类型、事件负载类型与错误码联合类型，消除 `any` 传递。
- **资源自动回收**：`destroy()` 自动停止播放、释放底层 Worker、清空事件监听，避免组件卸载后的内存与连接泄漏。
- **零运行时依赖**：仅依赖海康原生 `webVideoCtrl.js` 及其同目录静态资源，不引入任何 npm 依赖。
- **渐进式接入**：高频能力封装为高级 API；特殊 ISAPI 请求与未封装方法可通过 `sendHttpRequest()` 与低级桥接 API 直接透传。

## 安装

```bash
pnpm add hikvideoctrl
# 或
npm i hikvideoctrl
# 或
yarn add hikvideoctrl
```

播放内核、解码 Worker、加密脚本等底层静态资源须复制到 Web 项目静态目录，不由 npm 包分发。

## 准备静态资源

从海康开放平台下载无插件 Web SDK：[官方 SDK 下载地址](https://open.hikvision.com/download/5cda567cf47ae80dd41a54b3?type=20&id=6343bb4b03df46c39032d2ef825eb70d)。解压后，把 `codebase` 目录复制到项目静态目录，例如 Vite、Vue CLI、Next.js 的 `public/codebase`。

```text
public/
└─ codebase/
   ├─ webVideoCtrl.js
   ├─ jsPlugin/
   ├─ encryption/
   └─ ...
```

要求：

- `webVideoCtrl.js` 必须能通过浏览器 URL 访问，例如 `/codebase/webVideoCtrl.js`。
- `codebase` 内部目录结构必须原样保留，脚本会按相对路径加载 Worker、WASM 和加密模块。
- 页面必须运行在浏览器环境中，SSR 阶段不要创建播放器实例。

## 运行环境

| 项目 | 要求或说明 |
| --- | --- |
| 浏览器 | Chromium 91+（Chrome、Edge、Brave、国产 Chromium 内核浏览器均可） |
| 设备 | 摄像机或 NVR 固件需支持 WebSocket 取流（V3.4 兼容 ISAPI 设备） |
| 视频编码 | H.264、H.265、smartH264、smartH265 |
| 接入协议 | HTTP / HTTPS；HTTPS 或跨网段访问通常需要 WebSocket 代理 |
| 反向代理 | 官方 SDK 自带 Nginx 示例；直连失败、HTTPS 或跨网段场景需配置等效代理 |
| 页面环境 | `localhost`、内网 HTTP，或可信 HTTPS 域名 |
| 不支持环境 | IE、有插件 OCX 模式、Node.js / SSR 渲染阶段 |

官方包提供 `nginx-1.28.0/conf/nginx.conf` 示例，包含 `/ISAPI`、`/SDK` 与 `/webSocketVideoCtrlProxy` 转发规则。当设备 HTTP/HTTPS 与 WebSocket 可直连时无需代理；生产环境可使用 Nginx、API 网关或后端服务实现等效转发。

## 快速开始

准备容器：

```html
<div id="player" style="width: 960px; height: 540px"></div>
```

接入代码：

```ts
import { createHikPlayer, loadWebVideoCtrl, PTZ_COMMAND, STREAM_TYPE } from 'hikvideoctrl'

await loadWebVideoCtrl('/codebase/webVideoCtrl.js')

const player = createHikPlayer()

await player.init({
  container: '#player',
  width: '100%',
  height: '100%',
  layout: 1,
})

const device = await player.login({
  host: '192.168.1.64',
  port: 80,
  protocol: 'http',
  username: 'admin',
  password: 'YourPassword',
})

const channels = await player.getChannels(device.id)
const firstChannel = Number(channels[0].id)

await player.startPreview(device.id, {
  channel: firstChannel,
  streamType: STREAM_TYPE.Main,
})

await player.ptzStart({ action: PTZ_COMMAND.Right, speed: 5 })
window.setTimeout(() => {
  player.ptzStop(PTZ_COMMAND.Right).catch(console.error)
}, 500)

await player.capture({ fileName: 'snapshot.jpg' })

// 组件卸载或离开页面时调用
await player.destroy()
```

## 核心概念

### Player 实例

一个 `HikPlayer` 实例对应一个视频区域、一组播放窗口与一组已登录设备。如需同时展示多个独立视频区域，请为每个区域创建独立实例，并挂载至不同容器。

```ts
const player = createHikPlayer()
```

### deviceId

`login()` 成功后返回 `DeviceSession`。后续所有需要 `deviceId` 的 API 均应传入 `device.id`，请勿手动拼接设备标识符。

```ts
const device = await player.login({ host: '192.168.1.64', username: 'admin', password: 'pwd' })
await player.startPreview(device.id, { channel: 1 })
```

### windowIndex

播放窗口从 `0` 开始编号。`layout: 1` 只有窗口 `0`；`layout: 2` 对应 `0` 到 `3`。不传 `windowIndex` 时使用当前选中窗口。

```ts
await player.changeLayout(2)
await player.startPreview(device.id, { channel: 1, windowIndex: 0 })
await player.startPreview(device.id, { channel: 2, windowIndex: 1 })
```

### channel

通道列表通过 `getChannels()` 获取。返回的 `channel.id` 为字符串类型，传入播放 API 时需转换为数字。

```ts
const channels = await player.getChannels(device.id)
for (const channel of channels) {
  console.log(channel.id, channel.name, channel.kind, channel.online)
}
```

### 时间格式

回放、录像搜索、按时间下载都使用 `yyyy-MM-dd HH:mm:ss`。

```ts
await player.startPlayback(device.id, {
  channel: 1,
  startTime: '2026-05-17 09:00:00',
  endTime: '2026-05-17 10:00:00',
})
```

### 代理与端口

内网 HTTP 直连场景通常无需额外参数，SDK 自动协商端口。遇到 HTTPS 部署、跨网段或 WebSocket 直连失败时：

1. 在 Web 服务侧配置 WebSocket 代理（参考官方 Nginx 示例：`/ISAPI`、`/SDK`、`/webSocketVideoCtrlProxy`）。
2. 播放时传 `useProxy: true`。
3. 自动协商失败时显式传 `webSocketPort`，必要时再传 `rtspPort`。

```ts
await player.startPreview(device.id, {
  channel: 1,
  useProxy: true,
  webSocketPort: 7681,
})
```

## Vue 3 示例

```vue
<script setup lang="ts">
import type { HikPlayer } from 'hikvideoctrl'
import { createHikPlayer, loadWebVideoCtrl, STREAM_TYPE } from 'hikvideoctrl'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const containerRef = ref<HTMLDivElement>()
let player: HikPlayer | null = null

onMounted(async () => {
  await loadWebVideoCtrl('/codebase/webVideoCtrl.js')
  player = createHikPlayer()
  await player.init({ container: containerRef.value!, width: '100%', height: '100%' })

  const device = await player.login({
    host: '192.168.1.64',
    username: 'admin',
    password: 'YourPassword',
  })
  const [first] = await player.getChannels(device.id)
  if (first) {
    await player.startPreview(device.id, {
      channel: Number(first.id),
      streamType: STREAM_TYPE.Sub,
    })
  }
})

onBeforeUnmount(async () => {
  await player?.destroy()
  player = null
})
</script>

<template>
  <div ref="containerRef" style="width: 960px; height: 540px" />
</template>
```

## React 示例

```tsx
import type { HikPlayer } from 'hikvideoctrl'
import { createHikPlayer, loadWebVideoCtrl, STREAM_TYPE } from 'hikvideoctrl'
import { useEffect, useRef } from 'react'

export function CameraPanel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let player: HikPlayer | null = null

    ;(async () => {
      await loadWebVideoCtrl('/codebase/webVideoCtrl.js')
      if (disposed || !containerRef.current)
        return

      player = createHikPlayer()
      await player.init({ container: containerRef.current, width: '100%', height: '100%' })

      const device = await player.login({
        host: '192.168.1.64',
        username: 'admin',
        password: 'YourPassword',
      })
      const [first] = await player.getChannels(device.id)
      if (first) {
        await player.startPreview(device.id, {
          channel: Number(first.id),
          streamType: STREAM_TYPE.Sub,
        })
      }
    })().catch(console.error)

    return () => {
      disposed = true
      player?.destroy().catch(console.error)
      player = null
    }
  }, [])

  return <div ref={containerRef} style={{ width: 960, height: 540 }} />
}
```

## 完整 API 参考

以下列出所有公开 API 的参数签名、返回值与常用类型说明。优先使用 `HikPlayer` 高级 API；需要调用底层未封装方法时，可使用低级桥接 API。

### 加载与创建

调用顺序：`loadWebVideoCtrl()` → `createHikPlayer()` → `player.init()` → 其他 API。

#### `loadWebVideoCtrl(scriptUrl: string, options?: LoadWebVideoCtrlOptions): Promise<WebVideoCtrlSDK>`

加载底层 `webVideoCtrl.js`，等待 `window.WebVideoCtrl` 就绪。`src` 相同时默认复用已有 `<script>` 节点。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `timeout` | `number` | 否 | `15000` | 等待就绪的最长毫秒数 |
| `strategy` | `'reuse' \| 'fresh'` | 否 | `'reuse'` | 复用已有脚本或强制插入新脚本 |

#### `createHikPlayer(options?: HikPlayerOptions): HikPlayer`

创建 `HikPlayer` 实例。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `sdk` | `WebVideoCtrlSDK` | 否 | 读取全局 `window.WebVideoCtrl` | 注入底层 SDK，常用于测试 |

#### `new HikPlayer(options?: HikPlayerOptions)`

直接构造播放器实例，参数与 `createHikPlayer()` 相同。

#### `isNoPluginSupported(): boolean`

检测无插件模式可用性。内部读取 `window.WebVideoCtrl?.I_SupportNoPlugin?.()`，因此必须先 `loadWebVideoCtrl()` 加载底层脚本；脚本未加载时返回 `false`。

### 实例属性与状态

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `player.isInitialized` | `boolean` | 是否已完成 `init()` |
| `player.activeWindowIndex` | `number` | 当前选中窗口索引，未初始化时为 `0` |
| `player.containerId` | `string \| null` | 当前挂载容器 id，未初始化时为 `null` |
| `player.sdk` | `WebVideoCtrlSDK` | 底层 SDK 实例，供扩展场景使用 |

#### `player.supportsNoPlugin(): boolean`

检测当前实例所使用的底层 SDK 是否支持无插件模式。

#### `player.checkPluginVersion(): number`

调用官方版本检查接口；无插件模式固定返回 `0`。

### 生命周期

#### `player.init(options: PluginInitOptions): Promise<void>`

初始化播放器窗口，调用任何设备或播放 API 前必须先执行。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `container` | `string \| HTMLElement` | 是 | 无 | 容器 id、`#id` 或 DOM 元素 |
| `width` | `number \| string` | 否 | 容器宽度/800 | 宽度，支持数字、`px`、`%` |
| `height` | `number \| string` | 否 | 容器高度/600 | 高度，支持数字、`px`、`%` |
| `layout` | [`Layout`](#layout) \| `number` | 否 | `1` | 初始分屏，`1/2/3/4` 对应 `1×1/2×2/3×3/4×4` |
| `colorProperty` | `string` | 否 | 底层默认 | 窗口背景和边框颜色配置串 |
| `debugMode` | `boolean` | 否 | `false` | 是否输出底层调试日志 |
| `timeout` | `number` | 否 | `15000` | 等待底层播放组件完成初始化的毫秒数 |
| `onWindowSelect` | `(windowIndex: number) => void` | 否 | 无 | 窗口选中回调 |
| `onWindowDoubleClick` | `(windowIndex: number, fullScreen: boolean) => void` | 否 | 无 | 窗口双击回调 |
| `onEvent` | `(eventType:` [`PluginEventCode`](#plugineventcode) `\| number, windowIndex: number, param2: number) => void` | 否 | 无 | 播放异常类事件回调 |
| `onError` | `(windowIndex: number, errorCode: number, error: unknown) => void` | 否 | 无 | 插件错误回调 |
| `onPerformanceLack` | `() => void` | 否 | 无 | 性能不足回调 |
| `onSecretKeyError` | `(windowIndex: number) => void` | 否 | 无 | 码流加密密钥错误回调 |

#### `player.destroy(): Promise<void>`

停止播放、释放底层 Worker、清空设备和事件状态。重复调用安全。

#### `player.resize(width?: number | string, height?: number | string): void`

调整播放器尺寸。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `width` | `number \| string` | 否 | 容器宽度 | 新宽度，支持数字、`px`、`%` |
| `height` | `number \| string` | 否 | 容器高度 | 新高度，支持数字、`px`、`%` |

### 事件订阅

#### `player.on(event: keyof HikPlayerEventMap, handler: (payload) => void): () => void`

订阅事件，返回取消订阅函数。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `event` | `keyof HikPlayerEventMap` | 是 | 无 | 事件名 |
| `handler` | `(payload) => void` | 是 | 无 | 事件处理函数 |

#### `player.once(event: keyof HikPlayerEventMap, handler: (payload) => void): () => void`

订阅一次性事件，触发后自动解除，返回取消订阅函数。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `event` | `keyof HikPlayerEventMap` | 是 | 无 | 事件名 |
| `handler` | `(payload) => void` | 是 | 无 | 事件处理函数 |

#### `player.off(event: keyof HikPlayerEventMap, handler?: (payload) => void): void`

取消订阅。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `event` | `keyof HikPlayerEventMap` | 是 | 无 | 事件名 |
| `handler` | `(payload) => void` | 否 | 无 | 指定处理函数；不传则清空该事件 |

### 设备与通道

#### `player.login(credentials: DeviceCredentials): Promise<DeviceSession>`

登录设备。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `host` | `string` | 是 | 无 | IP、域名或 `localhost` |
| `port` | `number` | 否 | `http=80`、`https=443` | HTTP/HTTPS 端口 |
| `protocol` | `'http' \| 'https'` | 否 | `'http'` | 访问协议 |
| `username` | `string` | 是 | 无 | 用户名 |
| `password` | `string` | 是 | 无 | 密码 |
| `login` | `DeviceLoginOptions` | 否 | 无 | 登录扩展选项，见下表 |

`DeviceLoginOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `async` | `boolean` | 否 | `true` | HTTP 交互方式，`true` 异步、`false` 同步 |
| `cgi` | `number` | 否 | 自动协商 | CGI 协议选择，`1` 强制 ISAPI |

#### `player.logout(deviceId: string): Promise<void>`

登出设备，登出前自动停止相关播放窗口。

#### 设备查询方法

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `player.listDevices()` | 无 | `DeviceSession[]` | 获取已登录设备列表 |
| `player.getDevice(deviceId)` | `deviceId: string` | `DeviceSession \| undefined` | 获取单个设备会话 |
| `player.getDeviceInfo(deviceId)` | `deviceId: string` | `Promise<DeviceInfo \| null>` | 获取设备信息 |
| `player.getSecurityVersion(deviceId)` | `deviceId: string` | `Promise<Document \| null>` | 获取设备安全能力版本 XML |
| `player.getDevicePort(deviceId)` | `deviceId: string` | `DevicePort` | 获取设备端口 |
| `player.getAnalogChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取模拟通道 |
| `player.getDigitalChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取数字通道 |
| `player.getZeroChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取零通道 |
| `player.getChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取模拟、数字、零通道合集 |
| `player.getAudioChannels(deviceId)` | `deviceId: string` | `Promise<Document \| null>` | 获取语音对讲通道 XML |

### 实时预览

#### `player.startPreview(deviceId: string, options: PreviewOptions): Promise<void>`

开始实时预览。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `number` | 是 | 无 | 通道号 |
| `windowIndex` | `number` | 否 | 当前窗口 | 播放窗口，从 `0` 开始 |
| `streamType` | [`StreamType`](#streamtype) | 否 | `1` | 码流类型 |
| `zeroChannel` | `boolean` | 否 | `false` | 是否播放零通道 |
| `rtspPort` | `number` | 否 | 自动识别 | RTSP 端口，通常不需要传 |
| `webSocketPort` | `number` | 否 | 自动识别 | WebSocket 取流端口，端口识别失败时再传 |
| `useProxy` | `boolean` | 否 | `false` | 是否通过 WebSocket 代理取流；HTTPS 部署及部分设备需置 `true` |

#### `player.stop(windowIndex?: number): Promise<void>`

停止指定窗口的预览或回放，不传则停止当前窗口。

#### `player.stopAll(): Promise<void>`

停止所有窗口。

### 回放控制

#### `player.startPlayback(deviceId: string, options: PlaybackOptions): Promise<void>`

按时间段开始回放。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `number` | 是 | 无 | 通道号 |
| `startTime` | `string` | 是 | 无 | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `endTime` | `string` | 是 | 无 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `windowIndex` | `number` | 否 | 当前窗口 | 播放窗口 |
| `streamType` | [`StreamType`](#streamtype) | 否 | `1` | 码流类型 |
| `rtspPort` | `number` | 否 | 自动识别 | RTSP 端口 |
| `webSocketPort` | `number` | 否 | 自动识别 | WebSocket 取流端口 |
| `useProxy` | `boolean` | 否 | `false` | 是否通过 WebSocket 代理取流；HTTPS 部署及部分设备需置 `true` |

V3.4.0 的无插件实现会拒绝 `oTransCodeParam`，因此高级回放 API 不提供转码参数。

#### 回放操作方法

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `player.pause(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 暂停回放 |
| `player.resume(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 恢复回放 |
| `player.playFast(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 快放 |
| `player.playSlow(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 慢放 |
| `player.getOsdTime(windowIndex?)` | `windowIndex?: number` | `Promise<string>` | 获取当前回放 OSD 时间 |

`windowIndex` 不传时使用当前选中窗口。

### 窗口与布局

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `player.changeLayout(layout)` | `layout:` [`Layout`](#layout) `\| number` | `Promise<void>` | 切换布局（`1/2/3/4` 对应 `1×1/2×2/3×3/4×4`） |
| `player.fullScreen(enable?)` | `enable?: boolean` | `Promise<void>` | 进入或退出全屏；也可按 Esc 退出 |
| `player.getWindowStatus(windowIndex?)` | `windowIndex?: number` | `WindowStatus \| null` | 获取单个窗口状态 |
| `player.getAllWindows()` | 无 | `WindowStatus[]` | 获取全部正在播放的窗口状态 |

### 音量、缩放与加密

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `player.openSound(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 打开指定窗口声音 |
| `player.closeSound(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 关闭指定窗口声音 |
| `player.setVolume(volume, windowIndex?)` | `volume: number`, `windowIndex?: number` | `Promise<void>` | 设置音量，`volume` 范围 `0-100` |
| `player.enableEZoom(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 开启电子放大 |
| `player.disableEZoom(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 关闭电子放大 |
| `player.enable3DZoom(windowIndex?, onZoomInfo?)` | `windowIndex?: number`, `onZoomInfo?: (info: unknown) => void` | `Promise<void>` | 开启 3D 放大并可接收缩放信息 |
| `player.disable3DZoom(windowIndex?)` | `windowIndex?: number` | `Promise<void>` | 关闭 3D 放大 |
| `player.setSecretKey(secretKey, windowIndex?)` | `secretKey: string`, `windowIndex?: number` | `Promise<void>` | 设置加密码流密钥 |

### 抓拍录像与下载

#### `player.capture(options?: CaptureOptions): Promise<string>`

抓拍当前窗口，返回实际使用的文件名。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | 否 | 自动生成 | 抓拍文件名，`.bmp` 结尾时抓 BMP |
| `windowIndex` | `number` | 否 | 当前窗口 | 抓拍窗口 |
| `onData` | `(data: Uint8Array) => void \| Promise<void>` | 否 | 无 | 接收图片字节；传入后不触发浏览器下载 |

#### `player.captureDevice(deviceId: string, options: DeviceCaptureOptions): Promise<string>`

直接从设备通道抓取 JPEG，无需先开始窗口预览。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `number` | 是 | 无 | 设备通道号 |
| `fileName` | `string` | 否 | 自动生成 | 保存文件名 |
| `width` | `number` | 否 | 设备默认 | 图片宽度，须与 `height` 同时传入 |
| `height` | `number` | 否 | 设备默认 | 图片高度，须与 `width` 同时传入 |
| `byDateDirectory` | `boolean` | 否 | `true` | 是否按日期创建目录 |

#### `player.startRecording(options?: RecordingOptions): Promise<string>`

开始浏览器本地录像，返回实际使用的文件名。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | 否 | 自动生成 | 录像文件名 |
| `windowIndex` | `number` | 否 | 当前窗口 | 录像窗口 |
| `byDateDirectory` | `boolean` | 否 | `true` | 是否按日期创建目录 |

#### `player.stopRecording(windowIndex?: number): Promise<void>`

停止本地录像，不传则停止当前窗口。

#### `player.searchRecords(deviceId: string, options: RecordSearchOptions): Promise<RecordSearchResult>`

搜索录像。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `number` | 是 | 无 | 通道号 |
| `startTime` | `string` | 是 | 无 | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `endTime` | `string` | 是 | 无 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `streamType` | [`StreamType`](#streamtype) | 否 | `1` | 码流类型 |
| `searchPos` | `number` | 否 | `(page - 1) * 40` | 搜索起点，必须为 40 的倍数；优先级高于 `page` |
| `page` | `number` | 否 | `1` | 1 基页码 |

#### `player.downloadRecord(deviceId: string, playbackUri: string, fileName: string, options?: DownloadOptions): Promise<unknown>`

按 `RecordMatch.playbackUri` 下载录像，`fileName` 为本地保存文件名。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `byDateDirectory` | `boolean` | 否 | `true` | 是否按日期创建目录 |

#### `player.downloadRecordByTime(deviceId: string, playbackUri: string, options: DownloadByTimeOptions): Promise<unknown>`

按时间段下载录像，`playbackUri` 来自 `RecordMatch.playbackUri`。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | 是 | 无 | 下载文件名 |
| `startTime` | `string` | 是 | 无 | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `endTime` | `string` | 是 | 无 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `byDateDirectory` | `boolean` | 否 | `true` | 是否按日期创建目录 |

### PTZ 云台

#### `player.ptzStart(options: PtzControlOptions): Promise<void>`

开始云台动作。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `action` | [`PtzCommand`](#ptzcommand) `\| number` | 是 | 无 | 控制动作 |
| `speed` | `number` | 否 | `4` | 速度，范围 `1-7` |
| `windowIndex` | `number` | 否 | 当前窗口 | 操作窗口 |

#### PTZ 其它方法

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `player.ptzStop(action, windowIndex?)` | `action:` [`PtzCommand`](#ptzcommand) `\| number`, `windowIndex?: number` | `Promise<void>` | 停止云台动作 |
| `player.setPreset(presetId, windowIndex?)` | `presetId: number`, `windowIndex?: number` | `Promise<void>` | 保存预置位 |
| `player.goPreset(presetId, windowIndex?)` | `presetId: number`, `windowIndex?: number` | `Promise<void>` | 调用预置位 |

### 设备维护

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `player.exportDeviceConfig(deviceId, password)` | `deviceId: string`, `password: string` | `Promise<unknown>` | 导出设备配置 |
| `player.restoreDefault(deviceId, mode)` | `deviceId: string`, `mode:` [`RestoreMode`](#restoremode) | `Promise<void>` | 恢复出厂参数 |
| `player.restart(deviceId)` | `deviceId: string` | `Promise<void>` | 重启设备 |
| `player.reconnect(deviceId)` | `deviceId: string` | `Promise<void>` | 重新连接设备 |
| `player.getUpgradeProgress(deviceId?)` | `deviceId?: string` | `Promise<{ percent: number, upgrading: boolean }>` | 查询升级进度 |

#### `player.importDeviceConfig(deviceId: string, fileName: string, options: ImportDeviceConfigOptions): Promise<unknown>`

导入设备配置，`fileName` 取自 `openFileDialog()` 返回的 `szFileName`。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `password` | `string` | 否 | 无 | 配置文件密码 |
| `file` | `File` | 是 | 无 | `openFileDialog()` 返回的 `file` |

#### `player.startUpgrade(deviceId: string, fileName: string, options: StartUpgradeOptions): Promise<unknown>`

开始固件升级，`fileName` 取自 `openFileDialog()` 返回的 `szFileName`。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `file` | `File` | 是 | 无 | `openFileDialog()` 返回的 `file` |

### 透传请求与文件选择

#### `player.sendHttpRequest(deviceId: string, uri: string, options?: HttpRequestOptions): Promise<Document | null>`

透传 ISAPI 请求至已登录设备，`uri` 不以 `/` 开头（SDK 内部已补入分隔符）。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'DELETE'` | 否 | `'GET'` | 请求方法 |
| `body` | `string` | 否 | 无 | 请求体，通常是 XML 字符串 |
| `async` | `boolean` | 否 | `true` | 是否异步 |
| `auth` | `boolean \| string` | 否 | `true` | 是否携带设备认证或直接透传认证值 |

#### `player.getTextOverlay(deviceId: string, uri: string): Promise<Document | null>`

读取通道 OSD 字符叠加配置，`uri` 为叠加信息 ISAPI 路径。

#### `player.openFileDialog(type: FileDialogType): Promise<OpenFileDialogResult>`

打开文件或文件夹选择框，`type` 参见 [`FileDialogType`](#filedialogtype)。

### 低级桥接 API

低级桥接 API 直接透传至底层 SDK，用于访问本库尚未封装的 `I_*` 方法。建议优先使用高级 API，仅在必要时使用低级桥接。

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `callSync<T>(sdk, method, ...args)` | `sdk: WebVideoCtrlSDK`, `method: string`, `...args: unknown[]` | `T` | 调用同步返回的底层方法 |
| `callPromise<T>(sdk, method, ...args)` | `sdk: WebVideoCtrlSDK`, `method: string`, `...args: unknown[]` | `Promise<T>` | 调用返回 Promise 或 thenable 的底层方法 |
| `callWithCallback<T>(sdk, method, ...args)` | `sdk: WebVideoCtrlSDK`, `method: string`, `...args: unknown[]` | `Promise<T>` | 调用通过 `success/error` 回调返回的底层方法 |

参数说明：

- `sdk`：通常传 `player.sdk`。
- `method`：底层方法名，例如 `'I_SomeMethod'`。
- `...args`：传给底层方法的实参；`callWithCallback` 会在最后一个 plain object 上自动挂载 `success/error`。

### 错误类与辅助函数

所有封装 API 的失败均以 `HikError` 抛出。建议以 `code` 字段作为错误分支依据，`message` 仅用于日志记录，不应作为程序判断条件。

#### `new HikError(code: HikErrorCode, message: string, details?: HikErrorDetails, cause?: unknown)`

库统一错误类型。其它任意异常可通过 `toHikError()` 收敛为它。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `code` | `HikErrorCode` | 是 | 无 | 错误码 |
| `message` | `string` | 是 | 无 | 面向日志和用户提示的说明 |
| `details` | `HikErrorDetails` | 否 | 无 | SDK 方法名、返回值等上下文 |
| `cause` | `unknown` | 否 | 无 | 原始异常 |

实例字段：`name`、`code`、`message`、`details`、`cause`。

#### `toHikError(error: unknown, fallbackCode?: HikErrorCode, fallbackMessage?: string): HikError`

把任意异常收敛为 `HikError`，适合在业务统一错误处理中使用。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `error` | `unknown` | 是 | 无 | 原始异常 |
| `fallbackCode` | `HikErrorCode` | 否 | `'SDK_CALL_FAILED'` | 原始异常不是 `HikError` 时使用 |
| `fallbackMessage` | `string` | 否 | `'调用 SDK 失败'` | 原始异常没有 message 时使用 |

### 工具函数

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `formatDate(date, pattern?)` | `date: Date`, `pattern?: string` | `string` | 格式化日期，默认 `yyyy-MM-dd HH:mm:ss` |
| `currentTimestamp(pattern?)` | `pattern?: string` | `string` | 格式化当前时间 |
| `todayTimeRange()` | 无 | `{ start: string, end: string }` | 当天起止时间 |
| `isValidTimeRange(start, end)` | `start: string`, `end: string` | `boolean` | 严格校验 SDK 时间格式且结束时间不早于开始时间 |
| `isIPv4(value)` | `value: string` | `boolean` | 判断 IPv4 |
| `isIPv6(value)` | `value: string` | `boolean` | 判断 IPv6 |
| `isHostname(value)` | `value: string` | `boolean` | 判断 DNS 主机名（含局域网单标签名称） |
| `isValidHost(host)` | `host: string` | `boolean` | 判断 IP、域名或 localhost |
| `isValidPort(port)` | `port: number` | `boolean` | 判断端口是否在 `1-65535` |
| `normalizePort(port)` | `port: number` | `number` | 规范化端口，非法时抛 `HikError` |
| `makeDeviceIdentify(host, port)` | `host: string`, `port: number` | `string` | 生成设备标识 |
| `parseDeviceIdentify(identify)` | `identify: string` | `{ host: string, port: number }` | 解析设备标识 |
| `toProtocolValue(protocol)` | `protocol: 'http' \| 'https'` | `1 \| 2` | 协议转底层数值 |
| `parseXml(xml)` | `xml: string \| null \| undefined` | `Document \| null` | 解析 XML 字符串 |
| `ensureXmlDocument(input)` | `input: unknown` | `Document \| null` | 将字符串、Document 或 jqXHR-like 响应转为 XML 文档 |
| `stringifyXml(doc)` | `doc: Document \| null \| undefined` | `string` | 序列化 XML 文档 |
| `xmlText(doc, selector, fallback?)` | `doc: Document \| Element \| null \| undefined`, `selector: string`, `fallback?: string` | `string` | 读取 XML 节点文本 |
| `uniqueFileName(prefix, extension)` | `prefix: string`, `extension: string` | `string` | 生成唯一文件名 |

### 常量与取值

每个 TypeScript 字面量类型（如 `StreamType`）均对应同名运行时常量对象（如 `STREAM_TYPE`），两者取值完全一致：

- **类型（Type）**：用于函数签名约束与编辑器自动补全；
- **常量（Constant）**：用于业务代码中以语义化成员名访问，例如 `STREAM_TYPE.Main` 等价于字面量 `1`。

#### Protocol

底层 SDK 协议数值。运行时常量：`PROTOCOL`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `HTTP` | `1` | HTTP |
| `HTTPS` | `2` | HTTPS |

#### StreamType

码流类型。运行时常量：`STREAM_TYPE`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `Main` | `1` | 主码流 |
| `Sub` | `2` | 子码流 |
| `Third` | `3` | 第三码流 |

#### Layout

窗口分屏布局。运行时常量：`LAYOUT`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `Single` | `1` | `1×1` 单画面 |
| `Quad` | `2` | `2×2` 四分屏 |
| `Nine` | `3` | `3×3` 九分屏 |
| `Sixteen` | `4` | `4×4` 十六分屏 |

#### FileDialogType

文件选择对话框模式。运行时常量：`FILE_DIALOG`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `Directory` | `0` | 选择文件夹 |
| `File` | `1` | 选择单个文件 |

#### RestoreMode

设备恢复出厂模式。运行时常量：`RESTORE_MODE`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `Basic` | `'basic'` | 简单恢复（保留网络、用户等基础参数） |
| `Full` | `'full'` | 完全恢复出厂设置 |

#### PlayStatus

`getWindowStatus()` 返回的播放状态。运行时常量：`PLAY_STATUS`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `Idle` | `0` | 空闲 |
| `Preview` | `1` | 预览中 |
| `Playback` | `2` | 回放中 |
| `Paused` | `3` | 暂停 |
| `SingleFrame` | `4` | 单帧 |
| `Reverse` | `5` | 倒放 |
| `ReversePaused` | `6` | 倒放暂停 |

#### PtzCommand

云台控制动作。运行时常量：`PTZ_COMMAND`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `Up` | `1` | 上 |
| `Down` | `2` | 下 |
| `Left` | `3` | 左 |
| `Right` | `4` | 右 |
| `UpLeft` | `5` | 左上 |
| `DownLeft` | `6` | 左下 |
| `UpRight` | `7` | 右上 |
| `DownRight` | `8` | 右下 |
| `AutoPan` | `9` | 自动巡航 |
| `ZoomIn` | `10` | 变倍近 |
| `ZoomOut` | `11` | 变倍远 |
| `FocusFar` | `12` | 聚焦远 |
| `FocusNear` | `13` | 聚焦近 |
| `IrisOpen` | `14` | 光圈开 |
| `IrisClose` | `15` | 光圈关 |

#### TranscodeFrameRate

回放转码帧率档位。运行时常量：`TRANSCODE_FRAME_RATE`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `All` | `'0'` | 全部帧率 |
| `Fps1` | `'5'` | 1 fps |
| `Fps2` | `'6'` | 2 fps |
| `Fps4` | `'7'` | 4 fps |
| `Fps6` | `'8'` | 6 fps |
| `Fps8` | `'9'` | 8 fps |
| `Fps10` | `'10'` | 10 fps |
| `Fps12` | `'11'` | 12 fps |
| `Fps16` | `'12'` | 16 fps |
| `Fps20` | `'13'` | 20 fps |
| `Fps15` | `'14'` | 15 fps |
| `Fps18` | `'15'` | 18 fps |
| `Fps22` | `'16'` | 22 fps |
| `Auto` | `'255'` | 自动 |

#### TranscodeResolution

回放转码分辨率档位。运行时常量：`TRANSCODE_RESOLUTION`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `CIF` | `'1'` | CIF |
| `QCIF` | `'2'` | QCIF |
| `D1` | `'3'` | D1 |
| `Auto` | `'255'` | 自动 |

#### TranscodeBitrate

回放转码码率档位（单位 kbps，`Auto` 表示自动）。运行时常量：`TRANSCODE_BITRATE`。

| 成员 | 值 | 成员 | 值 | 成员 | 值 |
| --- | --- | --- | --- | --- | --- |
| `K32` | `'2'` | `K256` | `'11'` | `K1280` | `'20'` |
| `K48` | `'3'` | `K320` | `'12'` | `K1536` | `'21'` |
| `K64` | `'4'` | `K384` | `'13'` | `K1792` | `'22'` |
| `K80` | `'5'` | `K448` | `'14'` | `K2048` | `'23'` |
| `K96` | `'6'` | `K512` | `'15'` | `K3072` | `'24'` |
| `K128` | `'7'` | `K640` | `'16'` | `K4096` | `'25'` |
| `K160` | `'8'` | `K768` | `'17'` | `K8192` | `'26'` |
| `K192` | `'9'` | `K896` | `'18'` | `Auto` | `'255'` |
| `K224` | `'10'` | `K1024` | `'19'` |  |  |

#### PluginEventCode

`plugin:event` 事件回调中的 `eventType` 取值。运行时常量：`PLUGIN_EVENT`。

| 成员 | 值 | 说明 |
| --- | --- | --- |
| `PlayAbnormal` | `0` | 回放异常或取流被动断开 |
| `PlaybackEnd` | `2` | 回放正常结束 |
| `AudioTalkFail` | `3` | 对讲失败 |
| `NoFreeSpace` | `21` | 本地录像存储空间不足 |

#### SdkRuntimeError

`plugin:error` 事件回调中的 `errorCode` 取值。运行时常量：`SDK_RUNTIME_ERROR`（值 → 中文描述）。

| 错误码 | 说明 |
| --- | --- |
| `1001` | 码流传输过程异常 |
| `1002` | 回放结束 |
| `1003` | 取流失败，连接被动断开 |
| `1004` | 对讲连接被动断开 |
| `1005` | 广播连接被动断开 |
| `1006` | 视频编码格式不支持，仅支持 H.264 / H.265 |
| `1007` | 网络异常导致 WebSocket 断开 |
| `1008` | 首帧回调超时 |
| `1009` | 对讲码流传输过程异常 |
| `1010` | 广播码流传输过程异常 |
| `1011` | 数据接收异常，请检查是否修改了视频格式 |
| `1012` | 播放资源不足 |
| `1013` | 当前环境不支持该鱼眼展开模式 |
| `1014` | 外部强制关闭 |
| `1015` | 获取播放 URL 失败 |
| `1016` | 文件下载完成 |
| `1017` | 密码错误 |
| `1018` | 链接到萤石平台失败 |
| `1019` | 未找到录像片段 |
| `1020` | 水印模式等场景，当前通道需要重新播放 |
| `1021` | 缓存溢出 |
| `1022` | 采集音频失败：非 https / localhost 域名或未插耳机等 |

#### 其他常量

无对应 TS 字面量类型，直接以常量形式使用。

| 常量 | 取值 | 说明 |
| --- | --- | --- |
| `DEFAULT_PORT` | `HTTP=80`、`HTTPS=443`、`RTSP=554` | 协议默认端口 |
| `PTZ_SPEED_RANGE` | `{ min: 1, max: 7, default: 4 }` | 云台速度合法范围与推荐默认值 |
| `RECORD_SEARCH_PAGE_SIZE` | `40` | `searchRecords()` 每页条数（与 SDK 内部分页大小一致） |

### 类型速查

| 类型 | 字段或说明 |
| --- | --- |
| `DeviceSession` | `id`、`host`、`port`、`username`、`protocol` |
| `DeviceInfo` | `deviceName`、`deviceId`、`deviceType`、`model`、`serialNumber`、`macAddress`、`firmwareVersion`、`firmwareReleasedDate`、`encoderVersion`、`encoderReleasedDate`、`raw` |
| `DevicePort` | `iDevicePort`、`iRtspPort`、`iHttpPort?`、`iWebSocketPort?`、`iWebSocketsPort?` |
| `ChannelInfo` | `id`、`name`、`kind`、`online`、`enabled`、`videoFormat?` |
| `WindowStatus` | `index`、`deviceId`、`channelId`、`playStatus`（[`PlayStatus`](#playstatus)）、`raw` |
| `RecordMatch` | `trackId`、`startTime`、`endTime`、`fileName`、`playbackUri`、`kind` |
| `RecordSearchResult` | `matches`、`status`、`count`、`raw` |
| `OpenFileDialogResult` | `szFileName: string \| -1`、`file` |
| `HikError` | `name`、`code`、`message`、`details`、`cause` |

## 事件

通过 [`on / once / off`](#事件订阅) 订阅，事件名采用 `<domain>:<action>` 命名约定。

```ts
const off = player.on('preview:started', ({ deviceId, channel, windowIndex }) => {
  console.log(deviceId, channel, windowIndex)
})

off() // 取消订阅
```

| 事件名 | 负载 | 说明 |
| --- | --- | --- |
| `plugin:initialized` | `void` | 初始化完成 |
| `plugin:destroyed` | `void` | 销毁完成 |
| `plugin:event` | `{ eventType:` [`PluginEventCode`](#plugineventcode) `\| number, windowIndex, param2 }` | 播放异常 / 回放结束 / 对讲失败 / 空间不足 |
| `plugin:error` | `{ windowIndex, errorCode: number, error }` | 插件运行时错误，常见 `errorCode` 见 [`SDK_RUNTIME_ERROR`](#sdkruntimeerror) |
| `plugin:performance-lack` | `void` | 设备或环境性能不足 |
| `plugin:secret-key-error` | `{ windowIndex }` | 码流加密密钥错误 |
| `window:selected` | `{ windowIndex }` | 用户选中窗口 |
| `window:dblclick` | `{ windowIndex, fullScreen }` | 用户双击窗口 |
| `device:connected` | `DeviceSession` | 登录成功 |
| `device:disconnected` | `{ deviceId }` | 登出成功 |
| `preview:started` | `{ deviceId, channel, windowIndex, zeroChannel }` | 预览开始 |
| `preview:stopped` | `{ deviceId, windowIndex }` | 预览停止 |
| `preview:stopped-all` | `void` | 所有窗口停止 |
| `playback:started` | `{ deviceId, channel, windowIndex, startTime, endTime }` | 回放开始 |
| `playback:stopped` | `{ deviceId, windowIndex }` | 回放停止 |
| `recording:started` | `{ fileName, windowIndex }` | 本地录像开始 |
| `recording:stopped` | `{ windowIndex }` | 本地录像停止 |
| `capture:completed` | `{ fileName, windowIndex, asFile }` | 抓拍完成 |
| `device-capture:completed` | `{ deviceId, channel, fileName }` | 设备端抓图完成 |

运行时错误码可通过 `SDK_RUNTIME_ERROR` 转中文描述：

```ts
player.on('plugin:error', ({ errorCode }) => {
  console.error(SDK_RUNTIME_ERROR[errorCode as keyof typeof SDK_RUNTIME_ERROR] ?? errorCode)
})
```

## 错误处理

所有封装 API 的失败均以 `HikError` 抛出，`code` 字段为稳定的程序判断依据。

```ts
import { HikError } from 'hikvideoctrl'

try {
  await player.startPreview(device.id, { channel: 1 })
}
catch (err) {
  if (err instanceof HikError) {
    switch (err.code) {
      case 'SDK_NOT_FOUND':
        console.error('底层脚本未加载或浏览器不支持')
        break
      case 'DEVICE_NOT_FOUND':
        console.error('设备未登录或已登出')
        break
      case 'SDK_CALL_FAILED':
        console.error(err.details?.status, err.details?.responseXml)
        break
      default:
        console.error(err.message)
    }
  }
}
```

错误码：

| code | 说明 |
| --- | --- |
| `SDK_NOT_FOUND` | 未加载底层脚本，或当前浏览器不支持 |
| `SDK_METHOD_MISSING` | 当前底层资源版本缺少目标方法 |
| `SDK_CALL_FAILED` | 底层调用失败，可能带 `status/responseXml` |
| `SCRIPT_LOAD_FAILED` | `loadWebVideoCtrl()` 加载失败或超时 |
| `NOT_INITIALIZED` | 尚未调用 `init()` |
| `ALREADY_INITIALIZED` | 重复调用 `init()` |
| `INITIALIZATION_TIMEOUT` | 底层播放组件未在指定时间内完成初始化 |
| `INVALID_ARGUMENT` | 参数非法，例如端口越界、时间范围错误 |
| `DEVICE_NOT_FOUND` | 设备未登录或已登出 |
| `WINDOW_NOT_PLAYING` | 对未播放窗口执行停止等操作 |

## 常见业务组合

### 登录后自动选择第一个在线通道预览

```ts
const device = await player.login({
  host: '192.168.1.64',
  username: 'admin',
  password: 'YourPassword',
})

const channels = await player.getChannels(device.id)
const channel = channels.find(item => item.online && item.enabled)

if (!channel)
  throw new Error('没有可播放通道')

await player.startPreview(device.id, {
  channel: Number(channel.id),
  streamType: STREAM_TYPE.Sub,
})
```

### 四宫格预览

```ts
await player.changeLayout(LAYOUT.Quad)

const channels = (await player.getChannels(device.id)).slice(0, 4)

await Promise.all(channels.map((channel, index) => {
  return player.startPreview(device.id, {
    channel: Number(channel.id),
    windowIndex: index,
    streamType: STREAM_TYPE.Sub,
  })
}))
```

### 异常断流后重试

```ts
player.on('plugin:event', async ({ eventType, windowIndex }) => {
  if (eventType !== PLUGIN_EVENT.PlayAbnormal)
    return

  await player.stop(windowIndex).catch(() => {})
  await player.startPreview(device.id, {
    channel: 1,
    windowIndex,
    streamType: STREAM_TYPE.Sub,
  })
})
```

### 按当天时间搜索并回放第一段录像

```ts
const { start, end } = todayTimeRange()

const result = await player.searchRecords(device.id, {
  channel: 1,
  startTime: start,
  endTime: end,
})

const [record] = result.matches
if (record) {
  await player.startPlayback(device.id, {
    channel: 1,
    startTime: record.startTime,
    endTime: record.endTime,
  })
}
```

## 排障指南

### 提示 `SDK_NOT_FOUND`

检查：

- 是否先调用了 `await loadWebVideoCtrl('/codebase/webVideoCtrl.js')`。
- 浏览器 Network 面板里 `/codebase/webVideoCtrl.js` 是否 200。
- `codebase` 目录是否原样保留。
- 是否在 SSR 或 Node.js 环境中提前创建了播放器。

### `init()` 失败

检查：

- `container` 对应 DOM 是否存在。
- 容器是否有非 0 宽高。
- 当前浏览器是否为 Chromium 91+。

### 登录失败

检查：

- `host` 不要带 `http://`，只传 IP 或域名。
- `protocol` 与 `port` 是否匹配。
- 设备账号密码是否正确。
- 浏览器是否能访问设备 HTTP/HTTPS 地址。

### 预览或回放失败

检查：

- 设备是否支持 WebSocket 取流。
- 先用 `STREAM_TYPE.Sub` 测试子码流。
- HTTPS 页面或跨网段访问时传 `useProxy: true`。
- 端口识别失败时传 `webSocketPort`。
- 设备视频编码是否在支持范围内。

### 多窗口只有一路成功

检查：

- 是否先调用 `changeLayout()` 或在 `init()` 里设置足够的 `layout`。
- 每路播放是否传了不同的 `windowIndex`。
- 多画面建议使用子码流。

### 抓拍没有下载

检查：

- 当前窗口是否正在预览或回放。
- 如果传了 `onData`，底层会返回数据而不触发浏览器下载。
- 浏览器是否拦截了下载行为。

### 导入配置或升级失败

检查：

- 是否通过 `openFileDialog(FILE_DIALOG.File)` 获取文件。
- 是否把返回的 `file` 传给 `importDeviceConfig()` 或 `startUpgrade()`。
- 升级期间不要重复发起升级或断开设备。

## 测试

通过构造函数注入最小 SDK 替身，可在无浏览器环境下对业务逻辑进行单元测试。

```ts
import type { WebVideoCtrlSDK } from 'hikvideoctrl'
import { createHikPlayer } from 'hikvideoctrl'

const fakeSdk: Partial<WebVideoCtrlSDK> = {
  I_SupportNoPlugin: () => true,
  I_InitPlugin: (_, __, options) => options.cbInitPluginComplete?.(),
  I_InsertOBJECTPlugin: () => 0,
  I_Login: (_host, _protocol, _port, _username, _password, options) => {
    options.success?.(new DOMParser().parseFromString('<ok/>', 'text/xml'))
    return 0
  },
}

const player = createHikPlayer({ sdk: fakeSdk as WebVideoCtrlSDK })
```

## 开发命令

```bash
pnpm install      # 安装依赖
pnpm lint         # ESLint 检查
pnpm lint:fix     # 自动修复 lint 问题
pnpm typecheck    # 仅运行类型检查
pnpm build        # 类型 + Vite 构建产物
pnpm release      # bumpp + pnpm publish 发版
```

## 致谢

感谢海康威视提供 [无插件 Web 开发包](https://open.hikvision.com/download/5cda567cf47ae80dd41a54b3?type=20&id=6343bb4b03df46c39032d2ef825eb70d)。本项目仅作为其上层 TypeScript 封装，与海康官方无附属关系。

## 许可证

[MIT](./LICENSE)
