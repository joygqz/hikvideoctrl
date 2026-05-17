# hikvideoctrl

海康威视无插件 Web 视频能力的 TypeScript 封装。你可以用它在 Vue、React、Svelte 或普通前端项目中完成设备登录、实时预览、录像回放、抓拍、录像搜索、云台控制、设备维护等常见监控业务。

## 目录

- [特性](#特性)
- [安装](#安装)
- [准备静态资源](#准备静态资源)
- [运行环境](#运行环境)
- [快速开始](#快速开始)
- [推荐接入流程](#推荐接入流程)
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
  - [声音缩放与加密](#声音缩放与加密)
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
- [License](#license)

## 特性

- Promise 优先：登录、预览、回放、抓拍、PTZ、录像、升级等操作可直接 `await`。
- TypeScript 友好：导出常量、参数类型、事件负载类型和统一错误类型。
- SPA 友好：`destroy()` 会停止播放、释放底层 Worker，并清理事件监听。
- 无运行时依赖：安装本包后，自行托管底层静态资源即可。
- 可渐进接入：常用能力有高级 API，特殊 ISAPI 请求可用 `sendHttpRequest()` 透传。

## 安装

```bash
pnpm add hikvideoctrl
# 或
npm i hikvideoctrl
# 或
yarn add hikvideoctrl
```

播放内核、解码 Worker、加密脚本等底层静态资源需要放到 Web 项目静态目录中。

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

| 项目       | 要求或说明                                                           |
| ---------- | -------------------------------------------------------------------- |
| 浏览器     | Chromium 91+，例如 Chrome、Edge、Brave 或国产 Chromium 内核浏览器    |
| 设备       | 设备需要支持 WebSocket 取流                                          |
| 视频编码   | H.264、H.265、smartH264、smartH265                                   |
| 协议       | 支持 HTTP / HTTPS；HTTPS 或跨网段访问通常需要 WebSocket 代理         |
| 反向代理   | 官方 SDK 包含 Nginx 示例；直连失败、HTTPS 或跨网段场景需配置等效代理 |
| 页面环境   | `localhost`、内网 HTTP 或可信 HTTPS 域名                             |
| 不支持环境 | IE、有插件模式、纯 Node.js / SSR 渲染阶段                            |

官方包提供 `nginx-1.28.0/conf/nginx.conf` 示例，包含 `/ISAPI`、`/SDK` 和 `/webSocketVideoCtrlProxy` 转发。设备 HTTP/HTTPS 与 WebSocket 可直连时无需代理；生产环境可用 Nginx、网关或后端服务实现等效转发。

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

## 推荐接入流程

1. 复制 `codebase` 静态资源。
2. 在页面创建视频容器，并确保容器有宽高。
3. 调用 `loadWebVideoCtrl('/codebase/webVideoCtrl.js')` 加载底层脚本。
4. 调用 `createHikPlayer()` 创建播放器实例。
5. 调用 `player.init()` 初始化窗口。
6. 调用 `player.login()` 登录设备，保存返回的 `device.id`。
7. 调用 `player.getChannels()` 获取通道，再进行预览、回放、抓拍或云台控制。
8. 页面卸载时调用 `player.destroy()`。

## 核心概念

### Player 实例

一个 `HikPlayer` 实例对应一个视频区域、一组选中窗口和一批已登录设备。多个视频区域请创建多个实例，并使用独立容器。

```ts
const player = createHikPlayer()
```

### deviceId

`login()` 成功后返回 `DeviceSession`。后续 API 的 `deviceId` 都传 `device.id`，不要自己拼字符串。

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

通道来自 `getChannels()`。返回的 `id` 是字符串，播放时转成数字传入。

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

内网 HTTP 直连通常不需要额外参数。HTTPS、跨网段或 WebSocket 直连失败时：

- 在你的 Web 服务侧配置 WebSocket 代理。
- 播放时传 `useProxy: true`。
- 如端口自动识别失败，优先传 `webSocketPort`。

官方 Nginx 示例使用 `/ISAPI`、`/SDK` 转发设备 HTTP 接口，使用 `/webSocketVideoCtrlProxy` 转发 WebSocket 取流。底层 SDK 通过 `webVideoCtrlProxy`、`webVideoCtrlProxyWs`、`webVideoCtrlProxyWss` 等 cookie 传递真实设备地址；自建网关需兼容这些入口。

```ts
await player.startPreview(device.id, {
  channel: 1,
  useProxy: true,
  webSocketPort: 7681,
})
```

`rtspPort` 仅为兼容字段；无插件播放主要使用 WebSocket 取流端口。

## Vue 3 示例

```vue
<script setup lang="ts">
import { createHikPlayer, loadWebVideoCtrl, type HikPlayer } from 'hikvideoctrl'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const containerRef = ref<HTMLDivElement>()
let player: HikPlayer | null = null

onMounted(async () => {
  await loadWebVideoCtrl('/codebase/webVideoCtrl.js')
  player = createHikPlayer()
  await player.init({ container: containerRef.value!, width: '100%', height: '100%' })
})

onBeforeUnmount(async () => {
  await player?.destroy()
})
</script>

<template>
  <div ref="containerRef" style="width: 960px; height: 540px" />
</template>
```

## React 示例

```tsx
import { createHikPlayer, loadWebVideoCtrl } from 'hikvideoctrl'
import { useEffect, useRef } from 'react'

export function CameraPanel() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let player: ReturnType<typeof createHikPlayer> | null = null

    ;(async () => {
      await loadWebVideoCtrl('/codebase/webVideoCtrl.js')
      if (disposed || !ref.current)
        return
      player = createHikPlayer()
      await player.init({ container: ref.current, width: '100%', height: '100%' })
    })().catch(console.error)

    return () => {
      disposed = true
      player?.destroy().catch(console.error)
    }
  }, [])

  return <div ref={ref} style={{ width: 960, height: 540 }} />
}
```

## 完整 API 参考

公开 API、参数、返回值和常用类型如下。优先使用 `HikPlayer` 高级 API；特殊能力可用低级桥接 API。

### 加载与创建

#### `loadWebVideoCtrl(scriptUrl, options?)`

加载底层脚本，并等待 `window.WebVideoCtrl` 就绪。

| 参数               | 类型                      | 必填 | 默认值    | 说明                         |
| ------------------ | ------------------------- | ---- | --------- | ---------------------------- |
| `scriptUrl`        | `string`                  | 是   | 无        | `webVideoCtrl.js` 的访问地址 |
| `options`          | `LoadWebVideoCtrlOptions` | 否   | `{}`      | 加载选项                     |
| `options.timeout`  | `number`                  | 否   | `15000`   | 等待就绪的最长毫秒数         |
| `options.strategy` | `'reuse' \| 'fresh'`      | 否   | `'reuse'` | 复用已有脚本或强制插入新脚本 |

返回：`Promise<WebVideoCtrlSDK>`。

#### `createHikPlayer(options?)`

创建 `HikPlayer` 实例。

| 参数          | 类型               | 必填 | 默认值                         | 说明                     |
| ------------- | ------------------ | ---- | ------------------------------ | ------------------------ |
| `options`     | `HikPlayerOptions` | 否   | `{}`                           | 构造选项                 |
| `options.sdk` | `WebVideoCtrlSDK`  | 否   | 读取全局 `window.WebVideoCtrl` | 注入底层 SDK，常用于测试 |

返回：`HikPlayer`。

#### `new HikPlayer(options?)`

直接构造播放器实例，参数与 `createHikPlayer(options?)` 相同。

#### `isNoPluginSupported()`

检测当前浏览器环境是否支持无插件播放。

参数：无。

返回：`boolean`。

### 实例属性与状态

| 属性                       | 类型              | 说明                                 |
| -------------------------- | ----------------- | ------------------------------------ |
| `player.isInitialized`     | `boolean`         | 是否已完成 `init()`                  |
| `player.activeWindowIndex` | `number`          | 当前选中窗口索引，未初始化时为 `0`   |
| `player.containerId`       | `string \| null`  | 当前挂载容器 id，未初始化时为 `null` |
| `player.sdk`               | `WebVideoCtrlSDK` | 底层 SDK 实例，供扩展场景使用        |

#### `player.supportsNoPlugin()`

检测当前实例所使用的底层 SDK 是否支持无插件模式。

参数：无。

返回：`boolean`。

### 生命周期

#### `player.init(options)`

初始化播放器窗口。调用任何设备或播放 API 前必须先初始化。

| 参数                          | 类型                                                               | 必填 | 默认值       | 说明                                       |
| ----------------------------- | ------------------------------------------------------------------ | ---- | ------------ | ------------------------------------------ |
| `options`                     | `PluginInitOptions`                                                | 是   | 无           | 初始化选项                                 |
| `options.container`           | `string \| HTMLElement`                                            | 是   | 无           | 容器 id、`#id` 或 DOM 元素                 |
| `options.width`               | `number \| string`                                                 | 否   | 容器宽度/800 | 宽度，支持数字、`px`、`%`                  |
| `options.height`              | `number \| string`                                                 | 否   | 容器高度/600 | 高度，支持数字、`px`、`%`                  |
| `options.layout`              | `Layout \| number`                                                 | 否   | `1`          | 初始分屏，`1/2/3/4` 对应 `1x1/2x2/3x3/4x4` |
| `options.colorProperty`       | `string`                                                           | 否   | 底层默认     | 窗口背景和边框颜色配置串                   |
| `options.debugMode`           | `boolean`                                                          | 否   | `false`      | 是否输出底层调试日志                       |
| `options.onWindowSelect`      | `(windowIndex: number) => void`                                    | 否   | 无           | 窗口选中回调                               |
| `options.onWindowDoubleClick` | `(windowIndex: number, fullScreen: boolean) => void`               | 否   | 无           | 窗口双击回调                               |
| `options.onEvent`             | `(eventType: number, windowIndex: number, param2: number) => void` | 否   | 无           | 播放异常类事件回调                         |
| `options.onError`             | `(windowIndex: number, errorCode: number, error: unknown) => void` | 否   | 无           | 插件错误回调                               |
| `options.onPerformanceLack`   | `() => void`                                                       | 否   | 无           | 性能不足回调                               |
| `options.onSecretKeyError`    | `(windowIndex: number) => void`                                    | 否   | 无           | 码流加密密钥错误回调                       |

返回：`Promise<void>`。

#### `player.destroy()`

停止播放、释放底层 Worker、清空设备和事件状态。重复调用安全。

参数：无。

返回：`Promise<void>`。

#### `player.resize(width?, height?)`

调整播放器尺寸。

| 参数     | 类型               | 必填 | 默认值   | 说明                        |
| -------- | ------------------ | ---- | -------- | --------------------------- |
| `width`  | `number \| string` | 否   | 容器宽度 | 新宽度，支持数字、`px`、`%` |
| `height` | `number \| string` | 否   | 容器高度 | 新高度，支持数字、`px`、`%` |

返回：`void`。

### 事件订阅

#### `player.on(event, handler)`

订阅事件。

| 参数      | 类型                      | 必填 | 默认值 | 说明         |
| --------- | ------------------------- | ---- | ------ | ------------ |
| `event`   | `keyof HikPlayerEventMap` | 是   | 无     | 事件名       |
| `handler` | `(payload) => void`       | 是   | 无     | 事件处理函数 |

返回：`() => void`，调用后取消本次订阅。

#### `player.once(event, handler)`

订阅一次性事件。

| 参数      | 类型                      | 必填 | 默认值 | 说明         |
| --------- | ------------------------- | ---- | ------ | ------------ |
| `event`   | `keyof HikPlayerEventMap` | 是   | 无     | 事件名       |
| `handler` | `(payload) => void`       | 是   | 无     | 事件处理函数 |

返回：`() => void`，调用后取消本次订阅。

#### `player.off(event, handler?)`

取消订阅。

| 参数      | 类型                      | 必填 | 默认值 | 说明                           |
| --------- | ------------------------- | ---- | ------ | ------------------------------ |
| `event`   | `keyof HikPlayerEventMap` | 是   | 无     | 事件名                         |
| `handler` | `(payload) => void`       | 否   | 无     | 指定处理函数；不传则清空该事件 |

返回：`void`。

### 设备与通道

#### `player.login(credentials)`

登录设备。

| 参数                      | 类型                 | 必填 | 默认值                 | 说明                   |
| ------------------------- | -------------------- | ---- | ---------------------- | ---------------------- |
| `credentials`             | `DeviceCredentials`  | 是   | 无                     | 登录参数               |
| `credentials.host`        | `string`             | 是   | 无                     | IP、域名或 `localhost` |
| `credentials.port`        | `number`             | 否   | `http=80`、`https=443` | HTTP/HTTPS 端口        |
| `credentials.protocol`    | `'http' \| 'https'`  | 否   | `'http'`               | 访问协议               |
| `credentials.username`    | `string`             | 是   | 无                     | 用户名                 |
| `credentials.password`    | `string`             | 是   | 无                     | 密码                   |
| `credentials.login`       | `DeviceLoginOptions` | 否   | 无                     | 登录扩展选项           |
| `credentials.login.async` | `boolean`            | 否   | 底层默认               | 是否异步交互           |
| `credentials.login.cgi`   | `number`             | 否   | 底层默认               | CGI 协议选择           |

返回：`Promise<DeviceSession>`。

#### `player.logout(deviceId)`

登出设备，登出前会尝试停止相关播放窗口。

| 参数       | 类型     | 必填 | 默认值 | 说明                    |
| ---------- | -------- | ---- | ------ | ----------------------- |
| `deviceId` | `string` | 是   | 无     | `login()` 返回的设备 id |

返回：`Promise<void>`。

#### 设备查询方法

| 方法                                  | 参数               | 返回值                        | 说明                       |
| ------------------------------------- | ------------------ | ----------------------------- | -------------------------- |
| `player.listDevices()`                | 无                 | `DeviceSession[]`             | 获取已登录设备列表         |
| `player.getDevice(deviceId)`          | `deviceId: string` | `DeviceSession \| undefined`  | 获取单个设备会话           |
| `player.getDeviceInfo(deviceId)`      | `deviceId: string` | `Promise<DeviceInfo \| null>` | 获取设备信息               |
| `player.getDevicePort(deviceId)`      | `deviceId: string` | `DevicePort`                  | 获取设备端口               |
| `player.getAnalogChannels(deviceId)`  | `deviceId: string` | `Promise<ChannelInfo[]>`      | 获取模拟通道               |
| `player.getDigitalChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>`      | 获取数字通道               |
| `player.getZeroChannels(deviceId)`    | `deviceId: string` | `Promise<ChannelInfo[]>`      | 获取零通道                 |
| `player.getChannels(deviceId)`        | `deviceId: string` | `Promise<ChannelInfo[]>`      | 获取模拟、数字、零通道合集 |
| `player.getAudioChannels(deviceId)`   | `deviceId: string` | `Promise<Document \| null>`   | 获取语音对讲通道 XML       |

### 实时预览

#### `player.startPreview(deviceId, options)`

开始实时预览。

| 参数                    | 类型             | 必填 | 默认值   | 说明                                   |
| ----------------------- | ---------------- | ---- | -------- | -------------------------------------- |
| `deviceId`              | `string`         | 是   | 无       | `login()` 返回的设备 id                |
| `options`               | `PreviewOptions` | 是   | 无       | 预览选项                               |
| `options.channel`       | `number`         | 是   | 无       | 通道号                                 |
| `options.windowIndex`   | `number`         | 否   | 当前窗口 | 播放窗口，从 `0` 开始                  |
| `options.streamType`    | `StreamType`     | 否   | `1`      | `1` 主码流、`2` 子码流、`3` 第三码流   |
| `options.zeroChannel`   | `boolean`        | 否   | `false`  | 是否播放零通道                         |
| `options.rtspPort`      | `number`         | 否   | 自动识别 | RTSP 端口，通常不需要传                |
| `options.webSocketPort` | `number`         | 否   | 自动识别 | WebSocket 取流端口，端口识别失败时再传 |
| `options.useProxy`      | `boolean`        | 否   | 底层默认 | 是否通过 WebSocket 代理取流            |

返回：`Promise<void>`。

#### `player.stop(windowIndex?)`

停止指定窗口的预览或回放。

| 参数          | 类型     | 必填 | 默认值   | 说明                      |
| ------------- | -------- | ---- | -------- | ------------------------- |
| `windowIndex` | `number` | 否   | 当前窗口 | 要停止的窗口，从 `0` 开始 |

返回：`Promise<void>`。

#### `player.stopAll()`

停止所有窗口。

参数：无。

返回：`Promise<void>`。

### 回放控制

#### `player.startPlayback(deviceId, options)`

按时间段开始回放。

| 参数                           | 类型                | 必填 | 默认值   | 说明                                 |
| ------------------------------ | ------------------- | ---- | -------- | ------------------------------------ |
| `deviceId`                     | `string`            | 是   | 无       | `login()` 返回的设备 id              |
| `options`                      | `PlaybackOptions`   | 是   | 无       | 回放选项                             |
| `options.channel`              | `number`            | 是   | 无       | 通道号                               |
| `options.startTime`            | `string`            | 是   | 无       | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `options.endTime`              | `string`            | 是   | 无       | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `options.windowIndex`          | `number`            | 否   | 当前窗口 | 播放窗口                             |
| `options.streamType`           | `StreamType`        | 否   | `1`      | 码流类型                             |
| `options.rtspPort`             | `number`            | 否   | 自动识别 | RTSP 端口                            |
| `options.webSocketPort`        | `number`            | 否   | 自动识别 | WebSocket 取流端口                   |
| `options.useProxy`             | `boolean`           | 否   | 底层默认 | 是否通过 WebSocket 代理取流          |
| `options.transcode`            | `PlaybackTranscode` | 否   | 无       | 转码参数                             |
| `options.transcode.frameRate`  | `string`            | 否   | 无       | 转码帧率档位                         |
| `options.transcode.resolution` | `string`            | 否   | 无       | 转码分辨率档位                       |
| `options.transcode.bitrate`    | `string`            | 否   | 无       | 转码码率档位                         |

返回：`Promise<void>`。

#### 回放操作方法

| 方法                              | 参数                   | 返回值            | 说明                  |
| --------------------------------- | ---------------------- | ----------------- | --------------------- |
| `player.pause(windowIndex?)`      | `windowIndex?: number` | `Promise<void>`   | 暂停回放              |
| `player.resume(windowIndex?)`     | `windowIndex?: number` | `Promise<void>`   | 恢复回放              |
| `player.playFast(windowIndex?)`   | `windowIndex?: number` | `Promise<void>`   | 快放                  |
| `player.playSlow(windowIndex?)`   | `windowIndex?: number` | `Promise<void>`   | 慢放                  |
| `player.getOsdTime(windowIndex?)` | `windowIndex?: number` | `Promise<string>` | 获取当前回放 OSD 时间 |

`windowIndex` 不传时使用当前选中窗口。

### 窗口与布局

| 方法                                   | 参数                   | 返回值                 | 说明                                       |
| -------------------------------------- | ---------------------- | ---------------------- | ------------------------------------------ |
| `player.changeLayout(layout)`          | `layout: number`       | `Promise<void>`        | 切换布局，`1/2/3/4` 对应 `1x1/2x2/3x3/4x4` |
| `player.fullScreen(enable?)`           | `enable?: boolean`     | `Promise<void>`        | 进入全屏；默认 `true`                      |
| `player.getWindowStatus(windowIndex?)` | `windowIndex?: number` | `WindowStatus \| null` | 获取单个窗口状态                           |
| `player.getAllWindows()`               | 无                     | `WindowStatus[]`       | 获取底层返回的窗口状态列表                 |

### 声音缩放与加密

| 方法                                             | 参数                                                           | 返回值          | 说明                            |
| ------------------------------------------------ | -------------------------------------------------------------- | --------------- | ------------------------------- |
| `player.openSound(windowIndex?)`                 | `windowIndex?: number`                                         | `Promise<void>` | 打开指定窗口声音                |
| `player.closeSound(windowIndex?)`                | `windowIndex?: number`                                         | `Promise<void>` | 关闭指定窗口声音                |
| `player.setVolume(volume, windowIndex?)`         | `volume: number`, `windowIndex?: number`                       | `Promise<void>` | 设置音量，`volume` 范围 `0-100` |
| `player.enableEZoom(windowIndex?)`               | `windowIndex?: number`                                         | `Promise<void>` | 开启电子放大                    |
| `player.disableEZoom(windowIndex?)`              | `windowIndex?: number`                                         | `Promise<void>` | 关闭电子放大                    |
| `player.enable3DZoom(windowIndex?, onZoomInfo?)` | `windowIndex?: number`, `onZoomInfo?: (info: unknown) => void` | `Promise<void>` | 开启 3D 放大并可接收缩放信息    |
| `player.disable3DZoom(windowIndex?)`             | `windowIndex?: number`                                         | `Promise<void>` | 关闭 3D 放大                    |
| `player.setSecretKey(secretKey, windowIndex?)`   | `secretKey: string`, `windowIndex?: number`                    | `Promise<void>` | 设置加密码流密钥                |

### 抓拍录像与下载

#### `player.capture(options?)`

抓拍当前窗口。

| 参数                  | 类型                                          | 必填 | 默认值   | 说明                                 |
| --------------------- | --------------------------------------------- | ---- | -------- | ------------------------------------ |
| `options`             | `CaptureOptions`                              | 否   | `{}`     | 抓拍选项                             |
| `options.fileName`    | `string`                                      | 否   | 自动生成 | 抓拍文件名，`.bmp` 结尾时抓 BMP      |
| `options.windowIndex` | `number`                                      | 否   | 当前窗口 | 抓拍窗口                             |
| `options.onData`      | `(data: Uint8Array) => void \| Promise<void>` | 否   | 无       | 接收图片字节；传入后不触发浏览器下载 |

返回：`Promise<string>`，值为实际使用的文件名。

#### `player.startRecording(options?)`

开始浏览器本地录像。

| 参数                      | 类型               | 必填 | 默认值   | 说明               |
| ------------------------- | ------------------ | ---- | -------- | ------------------ |
| `options`                 | `RecordingOptions` | 否   | `{}`     | 录像选项           |
| `options.fileName`        | `string`           | 否   | 自动生成 | 录像文件名         |
| `options.windowIndex`     | `number`           | 否   | 当前窗口 | 录像窗口           |
| `options.byDateDirectory` | `boolean`          | 否   | `true`   | 是否按日期创建目录 |

返回：`Promise<string>`，值为实际使用的文件名。

#### `player.stopRecording(windowIndex?)`

停止本地录像。

| 参数          | 类型     | 必填 | 默认值   | 说明     |
| ------------- | -------- | ---- | -------- | -------- |
| `windowIndex` | `number` | 否   | 当前窗口 | 录像窗口 |

返回：`Promise<void>`。

#### `player.searchRecords(deviceId, options)`

搜索录像。

| 参数                 | 类型                  | 必填 | 默认值         | 说明                                 |
| -------------------- | --------------------- | ---- | -------------- | ------------------------------------ |
| `deviceId`           | `string`              | 是   | 无             | `login()` 返回的设备 id              |
| `options`            | `RecordSearchOptions` | 是   | 无             | 搜索条件                             |
| `options.channel`    | `number`              | 是   | 无             | 通道号                               |
| `options.startTime`  | `string`              | 是   | 无             | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `options.endTime`    | `string`              | 是   | 无             | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `options.streamType` | `StreamType`          | 否   | `1`            | 码流类型                             |
| `options.searchPos`  | `number`              | 否   | 按 `page` 计算 | 搜索起点，通常为 `0/40/80...`        |
| `options.page`       | `number`              | 否   | `1`            | 1 基页码，自动换算为搜索起点         |

返回：`Promise<RecordSearchResult>`。

#### `player.downloadRecord(deviceId, playbackUri, fileName, options?)`

按录像搜索结果中的 `playbackUri` 下载录像。

| 参数                      | 类型              | 必填 | 默认值 | 说明                      |
| ------------------------- | ----------------- | ---- | ------ | ------------------------- |
| `deviceId`                | `string`          | 是   | 无     | `login()` 返回的设备 id   |
| `playbackUri`             | `string`          | 是   | 无     | `RecordMatch.playbackUri` |
| `fileName`                | `string`          | 是   | 无     | 下载文件名                |
| `options`                 | `DownloadOptions` | 否   | `{}`   | 下载选项                  |
| `options.byDateDirectory` | `boolean`         | 否   | `true` | 是否按日期创建目录        |

返回：`Promise<unknown>`。

#### `player.downloadRecordByTime(deviceId, playbackUri, options)`

按时间段下载录像。

| 参数                      | 类型                    | 必填 | 默认值 | 说明                                 |
| ------------------------- | ----------------------- | ---- | ------ | ------------------------------------ |
| `deviceId`                | `string`                | 是   | 无     | `login()` 返回的设备 id              |
| `playbackUri`             | `string`                | 是   | 无     | `RecordMatch.playbackUri`            |
| `options`                 | `DownloadByTimeOptions` | 是   | 无     | 下载选项                             |
| `options.fileName`        | `string`                | 是   | 无     | 下载文件名                           |
| `options.startTime`       | `string`                | 是   | 无     | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `options.endTime`         | `string`                | 是   | 无     | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `options.byDateDirectory` | `boolean`               | 否   | `true` | 是否按日期创建目录                   |

返回：`Promise<unknown>`。

### PTZ 云台

#### `player.ptzStart(options)`

开始云台动作。

| 参数                  | 类型                   | 必填 | 默认值   | 说明             |
| --------------------- | ---------------------- | ---- | -------- | ---------------- |
| `options`             | `PtzControlOptions`    | 是   | 无       | 云台控制参数     |
| `options.action`      | `PtzCommand \| number` | 是   | 无       | 控制动作         |
| `options.speed`       | `number`               | 否   | `4`      | 速度，范围 `1-7` |
| `options.windowIndex` | `number`               | 否   | 当前窗口 | 操作窗口         |

返回：`Promise<void>`。

#### PTZ 其它方法

| 方法                                       | 参数                                                   | 返回值          | 说明         |
| ------------------------------------------ | ------------------------------------------------------ | --------------- | ------------ |
| `player.ptzStop(action, windowIndex?)`     | `action: PtzCommand \| number`, `windowIndex?: number` | `Promise<void>` | 停止云台动作 |
| `player.setPreset(presetId, windowIndex?)` | `presetId: number`, `windowIndex?: number`             | `Promise<void>` | 保存预置位   |
| `player.goPreset(presetId, windowIndex?)`  | `presetId: number`, `windowIndex?: number`             | `Promise<void>` | 调用预置位   |

### 设备维护

| 方法                                            | 参数                                    | 返回值                                             | 说明         |
| ----------------------------------------------- | --------------------------------------- | -------------------------------------------------- | ------------ |
| `player.exportDeviceConfig(deviceId, password)` | `deviceId: string`, `password: string`  | `Promise<unknown>`                                 | 导出设备配置 |
| `player.restoreDefault(deviceId, mode)`         | `deviceId: string`, `mode: RestoreMode` | `Promise<void>`                                    | 恢复出厂参数 |
| `player.restart(deviceId)`                      | `deviceId: string`                      | `Promise<void>`                                    | 重启设备     |
| `player.reconnect(deviceId)`                    | `deviceId: string`                      | `Promise<void>`                                    | 重新连接设备 |
| `player.getUpgradeProgress(deviceId?)`          | `deviceId?: string`                     | `Promise<{ percent: number, upgrading: boolean }>` | 查询升级进度 |

#### `player.importDeviceConfig(deviceId, fileName, options?)`

导入设备配置。

| 参数               | 类型                        | 必填 | 默认值 | 说明                                   |
| ------------------ | --------------------------- | ---- | ------ | -------------------------------------- |
| `deviceId`         | `string`                    | 是   | 无     | `login()` 返回的设备 id                |
| `fileName`         | `string`                    | 是   | 无     | `openFileDialog()` 返回的 `szFileName` |
| `options`          | `ImportDeviceConfigOptions` | 否   | `{}`   | 导入选项                               |
| `options.password` | `string`                    | 否   | 无     | 配置文件密码                           |
| `options.file`     | `File \| null`              | 否   | 无     | `openFileDialog()` 返回的 `file`       |

返回：`Promise<unknown>`。

#### `player.startUpgrade(deviceId, fileName, options?)`

开始固件升级。

| 参数           | 类型                  | 必填 | 默认值 | 说明                                   |
| -------------- | --------------------- | ---- | ------ | -------------------------------------- |
| `deviceId`     | `string`              | 是   | 无     | `login()` 返回的设备 id                |
| `fileName`     | `string`              | 是   | 无     | `openFileDialog()` 返回的 `szFileName` |
| `options`      | `StartUpgradeOptions` | 否   | `{}`   | 升级选项                               |
| `options.file` | `File \| null`        | 否   | 无     | `openFileDialog()` 返回的 `file`       |

返回：`Promise<unknown>`。

### 透传请求与文件选择

#### `player.sendHttpRequest(deviceId, uri, options?)`

发送设备 ISAPI 请求。

| 参数             | 类型                                   | 必填 | 默认值  | 说明                             |
| ---------------- | -------------------------------------- | ---- | ------- | -------------------------------- |
| `deviceId`       | `string`                               | 是   | 无      | `login()` 返回的设备 id          |
| `uri`            | `string`                               | 是   | 无      | ISAPI 路径，建议不以 `/` 开头    |
| `options`        | `HttpRequestOptions`                   | 否   | `{}`    | 请求选项                         |
| `options.method` | `'GET' \| 'POST' \| 'PUT' \| 'DELETE'` | 否   | `'GET'` | 请求方法                         |
| `options.body`   | `string`                               | 否   | 无      | 请求体，通常是 XML 字符串        |
| `options.async`  | `boolean`                              | 否   | `true`  | 是否异步                         |
| `options.auth`   | `boolean \| string`                    | 否   | `true`  | 是否携带设备认证或直接透传认证值 |

返回：`Promise<Document \| null>`。

#### `player.getTextOverlay(deviceId, uri)`

读取通道 OSD 字符叠加配置。

| 参数       | 类型     | 必填 | 默认值 | 说明                    |
| ---------- | -------- | ---- | ------ | ----------------------- |
| `deviceId` | `string` | 是   | 无     | `login()` 返回的设备 id |
| `uri`      | `string` | 是   | 无     | 叠加信息 ISAPI 路径     |

返回：`Promise<Document \| null>`。

#### `player.openFileDialog(type)`

打开文件或文件夹选择框。

| 参数   | 类型             | 必填 | 默认值 | 说明                                          |
| ------ | ---------------- | ---- | ------ | --------------------------------------------- |
| `type` | `FileDialogType` | 是   | 无     | `FILE_DIALOG.File` 或 `FILE_DIALOG.Directory` |

返回：`Promise<OpenFileDialogResult>`。

### 低级桥接 API

低级桥接 API 直接调用底层方法，适合临时接入本库尚未封装的能力。

| 方法                                        | 参数                                                           | 返回值       | 说明                                        |
| ------------------------------------------- | -------------------------------------------------------------- | ------------ | ------------------------------------------- |
| `callSync<T>(sdk, method, ...args)`         | `sdk: WebVideoCtrlSDK`, `method: string`, `...args: unknown[]` | `T`          | 调用同步返回的底层方法                      |
| `callPromise<T>(sdk, method, ...args)`      | `sdk: WebVideoCtrlSDK`, `method: string`, `...args: unknown[]` | `Promise<T>` | 调用返回 Promise 或 thenable 的底层方法     |
| `callWithCallback<T>(sdk, method, ...args)` | `sdk: WebVideoCtrlSDK`, `method: string`, `...args: unknown[]` | `Promise<T>` | 调用通过 `success/error` 回调返回的底层方法 |

参数说明：

- `sdk`：通常传 `player.sdk`。
- `method`：底层方法名，例如 `'I_SomeMethod'`。
- `...args`：传给底层方法的实参；`callWithCallback` 会在最后一个 plain object 上自动挂载 `success/error`。

### 错误类与辅助函数

#### `new HikError(code, message, details?, cause?)`

封装库统一错误类型，所有高级 API 失败都会抛出它或可被 `toHikError()` 转成它。

| 参数      | 类型              | 必填 | 默认值 | 说明                       |
| --------- | ----------------- | ---- | ------ | -------------------------- |
| `code`    | `HikErrorCode`    | 是   | 无     | 错误码                     |
| `message` | `string`          | 是   | 无     | 面向日志和用户提示的说明   |
| `details` | `HikErrorDetails` | 否   | 无     | SDK 方法名、返回值等上下文 |
| `cause`   | `unknown`         | 否   | 无     | 原始异常                   |

实例字段：`name`、`code`、`message`、`details`、`cause`。

#### `toHikError(error, fallbackCode?, fallbackMessage?)`

把任意异常收敛为 `HikError`，适合在业务统一错误处理中使用。

| 参数              | 类型           | 必填 | 默认值              | 说明                           |
| ----------------- | -------------- | ---- | ------------------- | ------------------------------ |
| `error`           | `unknown`      | 是   | 无                  | 原始异常                       |
| `fallbackCode`    | `HikErrorCode` | 否   | `'SDK_CALL_FAILED'` | 原始异常不是 `HikError` 时使用 |
| `fallbackMessage` | `string`       | 否   | `'调用 SDK 失败'`   | 原始异常没有 message 时使用    |

返回：`HikError`。

### 工具函数

| 方法                                | 参数                                                                                     | 返回值                           | 说明                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------- |
| `formatDate(date, pattern?)`        | `date: Date`, `pattern?: string`                                                         | `string`                         | 格式化日期，默认 `yyyy-MM-dd HH:mm:ss`             |
| `currentTimestamp(pattern?)`        | `pattern?: string`                                                                       | `string`                         | 格式化当前时间                                     |
| `todayTimeRange()`                  | 无                                                                                       | `{ start: string, end: string }` | 当天起止时间                                       |
| `isValidTimeRange(start, end)`      | `start: string`, `end: string`                                                           | `boolean`                        | 判断时间范围是否可解析且结束时间不早于开始时间     |
| `isIPv4(value)`                     | `value: string`                                                                          | `boolean`                        | 判断 IPv4                                          |
| `isIPv6(value)`                     | `value: string`                                                                          | `boolean`                        | 判断 IPv6                                          |
| `isHostname(value)`                 | `value: string`                                                                          | `boolean`                        | 判断域名                                           |
| `isValidHost(host)`                 | `host: string`                                                                           | `boolean`                        | 判断 IP、域名或 localhost                          |
| `isValidPort(port)`                 | `port: number`                                                                           | `boolean`                        | 判断端口是否在 `1-65535`                           |
| `normalizePort(port)`               | `port: number`                                                                           | `number`                         | 规范化端口，非法时抛 `HikError`                    |
| `makeDeviceIdentify(host, port)`    | `host: string`, `port: number`                                                           | `string`                         | 生成设备标识                                       |
| `parseDeviceIdentify(identify)`     | `identify: string`                                                                       | `{ host: string, port: number }` | 解析设备标识                                       |
| `toProtocolValue(protocol)`         | `protocol: 'http' \| 'https'`                                                            | `1 \| 2`                         | 协议转底层数值                                     |
| `parseXml(xml)`                     | `xml: string \| null \| undefined`                                                       | `Document \| null`               | 解析 XML 字符串                                    |
| `ensureXmlDocument(input)`          | `input: unknown`                                                                         | `Document \| null`               | 将字符串、Document 或 jqXHR-like 响应转为 XML 文档 |
| `stringifyXml(doc)`                 | `doc: Document \| null \| undefined`                                                     | `string`                         | 序列化 XML 文档                                    |
| `xmlText(doc, selector, fallback?)` | `doc: Document \| Element \| null \| undefined`, `selector: string`, `fallback?: string` | `string`                         | 读取 XML 节点文本                                  |
| `uniqueFileName(prefix, extension)` | `prefix: string`, `extension: string`                                                    | `string`                         | 生成唯一文件名                                     |

### 常量与取值

#### 基础常量

| 常量                      | 成员与取值                                  | 说明                       |
| ------------------------- | ------------------------------------------- | -------------------------- |
| `PROTOCOL`                | `HTTP=1`、`HTTPS=2`                         | 底层 SDK 使用的协议数值    |
| `DEFAULT_PORT`            | `HTTP=80`、`HTTPS=443`、`RTSP=554`          | 默认端口                   |
| `STREAM_TYPE`             | `Main=1`、`Sub=2`、`Third=3`                | 主码流、子码流、第三码流   |
| `LAYOUT`                  | `Single=1`、`Quad=2`、`Nine=3`、`Sixteen=4` | `1x1`、`2x2`、`3x3`、`4x4` |
| `FILE_DIALOG`             | `Directory=0`、`File=1`                     | 文件夹或文件选择框         |
| `RESTORE_MODE`            | `Basic='basic'`、`Full='full'`              | 简单恢复或完全恢复         |
| `PTZ_SPEED_RANGE`         | `{ min: 1, max: 7, default: 4 }`            | 云台速度范围               |
| `RECORD_SEARCH_PAGE_SIZE` | `40`                                        | 录像搜索每页条数           |

#### `PLAY_STATUS`

| 成员            | 值  | 说明     |
| --------------- | --- | -------- |
| `Idle`          | `0` | 空闲     |
| `Preview`       | `1` | 预览     |
| `Playback`      | `2` | 回放     |
| `Paused`        | `3` | 暂停     |
| `SingleFrame`   | `4` | 单帧     |
| `Reverse`       | `5` | 倒放     |
| `ReversePaused` | `6` | 倒放暂停 |

#### `PTZ_COMMAND`

| 成员        | 值   | 说明     |
| ----------- | ---- | -------- |
| `Up`        | `1`  | 上       |
| `Down`      | `2`  | 下       |
| `Left`      | `3`  | 左       |
| `Right`     | `4`  | 右       |
| `UpLeft`    | `5`  | 左上     |
| `DownLeft`  | `6`  | 左下     |
| `UpRight`   | `7`  | 右上     |
| `DownRight` | `8`  | 右下     |
| `AutoPan`   | `9`  | 自动巡航 |
| `ZoomIn`    | `10` | 变倍近   |
| `ZoomOut`   | `11` | 变倍远   |
| `FocusFar`  | `12` | 聚焦远   |
| `FocusNear` | `13` | 聚焦近   |
| `IrisOpen`  | `14` | 光圈开   |
| `IrisClose` | `15` | 光圈关   |

#### 转码常量

| 常量                   | 成员与取值                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCODE_FRAME_RATE` | `All='0'`、`Fps1='5'`、`Fps2='6'`、`Fps4='7'`、`Fps6='8'`、`Fps8='9'`、`Fps10='10'`、`Fps12='11'`、`Fps16='12'`、`Fps20='13'`、`Fps15='14'`、`Fps18='15'`、`Fps22='16'`、`Auto='255'`                                                                                                                                                        |
| `TRANSCODE_RESOLUTION` | `CIF='1'`、`QCIF='2'`、`D1='3'`、`Auto='255'`                                                                                                                                                                                                                                                                                                |
| `TRANSCODE_BITRATE`    | `K32='2'`、`K48='3'`、`K64='4'`、`K80='5'`、`K96='6'`、`K128='7'`、`K160='8'`、`K192='9'`、`K224='10'`、`K256='11'`、`K320='12'`、`K384='13'`、`K448='14'`、`K512='15'`、`K640='16'`、`K768='17'`、`K896='18'`、`K1024='19'`、`K1280='20'`、`K1536='21'`、`K1792='22'`、`K2048='23'`、`K3072='24'`、`K4096='25'`、`K8192='26'`、`Auto='255'` |

#### `PLUGIN_EVENT`

| 成员            | 值   | 说明                   |
| --------------- | ---- | ---------------------- |
| `PlayAbnormal`  | `0`  | 回放异常或取流被动断开 |
| `PlaybackEnd`   | `2`  | 回放正常结束           |
| `AudioTalkFail` | `3`  | 对讲失败               |
| `NoFreeSpace`   | `21` | 本地录像存储空间不足   |

#### `SDK_RUNTIME_ERROR`

| 错误码 | 说明                                              |
| ------ | ------------------------------------------------- |
| `1001` | 码流传输过程异常                                  |
| `1002` | 回放结束                                          |
| `1003` | 取流失败，连接被动断开                            |
| `1004` | 对讲连接被动断开                                  |
| `1005` | 广播连接被动断开                                  |
| `1006` | 视频编码格式不支持，目前只支持 H.264 / H.265      |
| `1007` | 网络异常导致 WebSocket 断开                       |
| `1008` | 首帧回调超时                                      |
| `1009` | 对讲码流传输过程异常                              |
| `1010` | 广播码流传输过程异常                              |
| `1011` | 数据接收异常，请检查是否修改了视频格式            |
| `1012` | 播放资源不足                                      |
| `1013` | 当前环境不支持该鱼眼展开模式                      |
| `1014` | 外部强制关闭                                      |
| `1015` | 获取播放 URL 失败                                 |
| `1016` | 文件下载完成                                      |
| `1017` | 密码错误                                          |
| `1018` | 链接到萤石平台失败                                |
| `1019` | 未找到录像片段                                    |
| `1020` | 水印模式等场景，当前通道需要重新播放              |
| `1021` | 缓存溢出                                          |
| `1022` | 采集音频失败：非 https/localhost 域名或未插耳机等 |

### 类型速查

| 类型                   | 字段或说明                                                                       |
| ---------------------- | -------------------------------------------------------------------------------- |
| `DeviceSession`        | `id`、`host`、`port`、`username`、`protocol`                                     |
| `DeviceInfo`           | `deviceName`、`deviceId`、`deviceType`、`model`、`serialNumber`、版本字段、`raw` |
| `DevicePort`           | `iDevicePort`、`iRtspPort`、`iHttpPort?`、`iWebSocketPort?`、`iWebSocketsPort?`  |
| `ChannelInfo`          | `id`、`name`、`kind`、`online`、`enabled`、`videoFormat?`                        |
| `WindowStatus`         | `index`、`deviceId`、`channelId`、`playStatus`、`raw`                            |
| `RecordMatch`          | `trackId`、`startTime`、`endTime`、`fileName`、`playbackUri`、`kind`             |
| `RecordSearchResult`   | `matches`、`status`、`count`、`raw`                                              |
| `OpenFileDialogResult` | `szFileName`、`file`                                                             |
| `HikError`             | `name`、`code`、`message`、`details`、`cause`                                    |

## 事件

使用 `on` 订阅事件，返回值是取消订阅函数。

```ts
const off = player.on('preview:started', (payload) => {
  console.log(payload.deviceId, payload.channel, payload.windowIndex)
})

off()
```

也可以使用 `once` 和 `off`。

```ts
player.once('plugin:initialized', () => console.log('ready'))
player.off('preview:started')
```

事件列表：

| 事件名                    | 负载                                                     | 说明               |
| ------------------------- | -------------------------------------------------------- | ------------------ |
| `plugin:initialized`      | `void`                                                   | 初始化完成         |
| `plugin:destroyed`        | `void`                                                   | 销毁完成           |
| `plugin:event`            | `{ eventType, windowIndex, param2 }`                     | 播放异常或状态事件 |
| `plugin:error`            | `{ windowIndex, errorCode, error }`                      | 插件错误           |
| `plugin:performance-lack` | `void`                                                   | 设备或环境性能不足 |
| `plugin:secret-key-error` | `{ windowIndex }`                                        | 码流加密密钥错误   |
| `window:selected`         | `{ windowIndex }`                                        | 用户选中窗口       |
| `window:dblclick`         | `{ windowIndex, fullScreen }`                            | 用户双击窗口       |
| `device:connected`        | `DeviceSession`                                          | 登录成功           |
| `device:disconnected`     | `{ deviceId }`                                           | 登出成功           |
| `preview:started`         | `{ deviceId, channel, windowIndex, zeroChannel }`        | 预览开始           |
| `preview:stopped`         | `{ deviceId, windowIndex }`                              | 预览停止           |
| `preview:stopped-all`     | `void`                                                   | 所有窗口停止       |
| `playback:started`        | `{ deviceId, channel, windowIndex, startTime, endTime }` | 回放开始           |
| `playback:stopped`        | `{ deviceId, windowIndex }`                              | 回放停止           |
| `recording:started`       | `{ fileName, windowIndex }`                              | 本地录像开始       |
| `recording:stopped`       | `{ windowIndex }`                                        | 本地录像停止       |
| `capture:completed`       | `{ fileName, windowIndex, asFile }`                      | 抓拍完成           |

常见事件值：

```ts
PLUGIN_EVENT.PlayAbnormal // 0, 取流异常或被动断开
PLUGIN_EVENT.PlaybackEnd // 2, 回放结束
PLUGIN_EVENT.AudioTalkFail // 3, 对讲失败
PLUGIN_EVENT.NoFreeSpace // 21, 存储空间不足
```

运行时错误码可通过 `SDK_RUNTIME_ERROR` 转中文。

```ts
player.on('plugin:error', ({ errorCode }) => {
  console.error(SDK_RUNTIME_ERROR[errorCode] ?? errorCode)
})
```

## 错误处理

所有封装 API 的失败都会抛出 `HikError`。

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

| code                  | 说明                                      |
| --------------------- | ----------------------------------------- |
| `SDK_NOT_FOUND`       | 未加载底层脚本，或当前浏览器不支持        |
| `SDK_METHOD_MISSING`  | 当前底层资源版本缺少目标方法              |
| `SDK_CALL_FAILED`     | 底层调用失败，可能带 `status/responseXml` |
| `SCRIPT_LOAD_FAILED`  | `loadWebVideoCtrl()` 加载失败或超时       |
| `NOT_INITIALIZED`     | 尚未调用 `init()`                         |
| `ALREADY_INITIALIZED` | 重复调用 `init()`                         |
| `INVALID_ARGUMENT`    | 参数非法，例如端口越界、时间范围错误      |
| `DEVICE_NOT_FOUND`    | 设备未登录或已登出                        |
| `WINDOW_NOT_PLAYING`  | 对未播放窗口执行停止等操作                |

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

业务单元测试可以注入一个最小 SDK 替身。

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
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

## License

MIT © [joygqz](https://github.com/joygqz)
