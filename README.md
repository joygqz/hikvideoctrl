# hikvideoctrl

[![npm version](https://img.shields.io/npm/v/hikvideoctrl.svg)](https://www.npmjs.com/package/hikvideoctrl)
[![license](https://img.shields.io/npm/l/hikvideoctrl.svg)](./LICENSE)

海康威视无插件 Web 视频能力的 TypeScript 封装。基于官方 `WebSDK_noPlugin V3.4.0`，将同步、Promise、回调三种调用形态统一为 `async/await`，并提供强类型常量、事件与错误。

适用于 Vue、React、Svelte 或原生前端项目中的设备登录、实时预览、录像回放、抓拍、录像搜索、云台控制、设备维护等监控业务。

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

- **Promise 优先**：登录、预览、回放、抓拍、PTZ、录像、升级等操作可直接 `await`，失败统一抛出 `HikError`。
- **TypeScript 友好**：导出所有常量字面量类型、参数类型、事件负载类型与错误码联合类型。
- **SPA 友好**：`destroy()` 自动停止播放、释放底层 Worker、清空事件监听，避免组件卸载后的资源泄漏。
- **零运行时依赖**：仅依赖海康原生 `webVideoCtrl.js` 及其同目录静态资源，无任何 npm 依赖。
- **可渐进接入**：常用能力封装为高级 API；特殊 ISAPI 请求与未封装方法可通过 `sendHttpRequest()` 与低级桥接 API 直接调用。

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

内网 HTTP 直连场景通常不需要任何额外参数，SDK 会自动协商端口。遇到 HTTPS、跨网段或 WebSocket 直连失败时：

1. 在 Web 服务侧配置 WebSocket 代理（参考官方 Nginx 示例）。
2. 播放时传 `useProxy: true`。
3. 自动协商端口失败时显式传 `webSocketPort`（对应 SDK 内部 `iWSPort`）。
4. 部分 RTSP 链路环境下额外传 `rtspPort`（对应 SDK 内部 `iRtspPort`）。

官方 Nginx 示例通过 `/ISAPI`、`/SDK` 转发设备 HTTP 接口，通过 `/webSocketVideoCtrlProxy` 转发 WebSocket 取流。底层 SDK 通过 `webVideoCtrlProxy`、`webVideoCtrlProxyWs`、`webVideoCtrlProxyWss` 等 Cookie 传递真实设备地址；自建网关需兼容这些入口。

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

> 调用顺序：`loadWebVideoCtrl()` → `createHikPlayer()` → `player.init()` → 其他 API。

#### `loadWebVideoCtrl(scriptUrl, options?)`

加载底层 `webVideoCtrl.js`，并等待 `window.WebVideoCtrl` 就绪。脚本同源、`src` 完全相同时默认复用已存在的 `<script>` 节点。`scriptUrl` 为 `webVideoCtrl.js` 的访问地址；`options` 为可选 `LoadWebVideoCtrlOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `timeout` | `number` | 否 | `15000` | 等待就绪的最长毫秒数 |
| `strategy` | `'reuse' \| 'fresh'` | 否 | `'reuse'` | 复用已有脚本或强制插入新脚本 |

返回：`Promise<WebVideoCtrlSDK>`。

#### `createHikPlayer(options?)`

创建 `HikPlayer` 实例。`options` 为可选 `HikPlayerOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `sdk` | `WebVideoCtrlSDK` | 否 | 读取全局 `window.WebVideoCtrl` | 注入底层 SDK，常用于测试 |

返回：`HikPlayer`。

#### `new HikPlayer(options?)`

直接构造播放器实例，参数与 `createHikPlayer(options?)` 相同。

#### `isNoPluginSupported()`

检测无插件模式可用性。内部读取 `window.WebVideoCtrl?.I_SupportNoPlugin?.()`，因此必须先 `loadWebVideoCtrl()` 加载底层脚本；脚本未加载时返回 `false`。

参数：无。

返回：`boolean`。

### 实例属性与状态

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `player.isInitialized` | `boolean` | 是否已完成 `init()` |
| `player.activeWindowIndex` | `number` | 当前选中窗口索引，未初始化时为 `0` |
| `player.containerId` | `string \| null` | 当前挂载容器 id，未初始化时为 `null` |
| `player.sdk` | `WebVideoCtrlSDK` | 底层 SDK 实例，供扩展场景使用 |

#### `player.supportsNoPlugin()`

检测当前实例所使用的底层 SDK 是否支持无插件模式。

参数：无。

返回：`boolean`。

### 生命周期

#### `player.init(options)`

初始化播放器窗口。调用任何设备或播放 API 前必须先初始化。`options` 为 `PluginInitOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `container` | `string \| HTMLElement` | 是 | 无 | 容器 id、`#id` 或 DOM 元素 |
| `width` | `number \| string` | 否 | 容器宽度/800 | 宽度，支持数字、`px`、`%` |
| `height` | `number \| string` | 否 | 容器高度/600 | 高度，支持数字、`px`、`%` |
| `layout` | [`Layout`](#layout) \| `number` | 否 | `1` | 初始分屏，`1/2/3/4` 对应 `1×1/2×2/3×3/4×4`；大于 `4` 一律按 `4×4` 处理 |
| `colorProperty` | `string` | 否 | 底层默认 | 窗口背景和边框颜色配置串 |
| `debugMode` | `boolean` | 否 | `false` | 是否输出底层调试日志 |
| `onWindowSelect` | `(windowIndex: number) => void` | 否 | 无 | 窗口选中回调 |
| `onWindowDoubleClick` | `(windowIndex: number, fullScreen: boolean) => void` | 否 | 无 | 窗口双击回调 |
| `onEvent` | `(eventType:` [`PluginEventCode`](#plugineventcode) `\| number, windowIndex: number, param2: number) => void` | 否 | 无 | 播放异常类事件回调 |
| `onError` | `(windowIndex: number, errorCode: number, error: unknown) => void` | 否 | 无 | 插件错误回调 |
| `onPerformanceLack` | `() => void` | 否 | 无 | 性能不足回调 |
| `onSecretKeyError` | `(windowIndex: number) => void` | 否 | 无 | 码流加密密钥错误回调 |

返回：`Promise<void>`。

#### `player.destroy()`

停止播放、释放底层 Worker、清空设备和事件状态。重复调用安全。

参数：无。

返回：`Promise<void>`。

#### `player.resize(width?, height?)`

调整播放器尺寸。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `width` | `number \| string` | 否 | 容器宽度 | 新宽度，支持数字、`px`、`%` |
| `height` | `number \| string` | 否 | 容器高度 | 新高度，支持数字、`px`、`%` |

返回：`void`。

### 事件订阅

#### `player.on(event, handler)`

订阅事件。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `event` | `keyof HikPlayerEventMap` | 是 | 无 | 事件名 |
| `handler` | `(payload) => void` | 是 | 无 | 事件处理函数 |

返回：`() => void`，调用后取消本次订阅。

#### `player.once(event, handler)`

订阅一次性事件。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `event` | `keyof HikPlayerEventMap` | 是 | 无 | 事件名 |
| `handler` | `(payload) => void` | 是 | 无 | 事件处理函数 |

返回：`() => void`，调用后取消本次订阅。

#### `player.off(event, handler?)`

取消订阅。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `event` | `keyof HikPlayerEventMap` | 是 | 无 | 事件名 |
| `handler` | `(payload) => void` | 否 | 无 | 指定处理函数；不传则清空该事件 |

返回：`void`。

### 设备与通道

#### `player.login(credentials)`

登录设备。`credentials` 为 `DeviceCredentials`：

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
| `async` | `boolean` | 否 | 底层默认 | 是否异步交互 |
| `cgi` | `number` | 否 | 底层默认 | CGI 协议选择 |

返回：`Promise<DeviceSession>`。

#### `player.logout(deviceId)`

登出设备，登出前会尝试停止相关播放窗口。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `deviceId` | `string` | 是 | 无 | `login()` 返回的设备 id |

返回：`Promise<void>`。

#### 设备查询方法

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `player.listDevices()` | 无 | `DeviceSession[]` | 获取已登录设备列表 |
| `player.getDevice(deviceId)` | `deviceId: string` | `DeviceSession \| undefined` | 获取单个设备会话 |
| `player.getDeviceInfo(deviceId)` | `deviceId: string` | `Promise<DeviceInfo \| null>` | 获取设备信息 |
| `player.getDevicePort(deviceId)` | `deviceId: string` | `DevicePort` | 获取设备端口 |
| `player.getAnalogChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取模拟通道 |
| `player.getDigitalChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取数字通道 |
| `player.getZeroChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取零通道 |
| `player.getChannels(deviceId)` | `deviceId: string` | `Promise<ChannelInfo[]>` | 获取模拟、数字、零通道合集 |
| `player.getAudioChannels(deviceId)` | `deviceId: string` | `Promise<Document \| null>` | 获取语音对讲通道 XML |

### 实时预览

#### `player.startPreview(deviceId, options)`

开始实时预览。`deviceId` 为 `login()` 返回的设备 id；`options` 为 `PreviewOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `number` | 是 | 无 | 通道号 |
| `windowIndex` | `number` | 否 | 当前窗口 | 播放窗口，从 `0` 开始 |
| `streamType` | [`StreamType`](#streamtype) | 否 | `1` | 码流类型 |
| `zeroChannel` | `boolean` | 否 | `false` | 是否播放零通道 |
| `rtspPort` | `number` | 否 | 自动识别 | RTSP 端口，通常不需要传 |
| `webSocketPort` | `number` | 否 | 自动识别 | WebSocket 取流端口，端口识别失败时再传 |
| `useProxy` | `boolean` | 否 | 底层默认 | 是否通过 WebSocket 代理取流 |

返回：`Promise<void>`。

#### `player.stop(windowIndex?)`

停止指定窗口的预览或回放。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `windowIndex` | `number` | 否 | 当前窗口 | 要停止的窗口，从 `0` 开始 |

返回：`Promise<void>`。

#### `player.stopAll()`

停止所有窗口。

参数：无。

返回：`Promise<void>`。

### 回放控制

#### `player.startPlayback(deviceId, options)`

按时间段开始回放。`deviceId` 为 `login()` 返回的设备 id；`options` 为 `PlaybackOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `number` | 是 | 无 | 通道号 |
| `startTime` | `string` | 是 | 无 | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `endTime` | `string` | 是 | 无 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `windowIndex` | `number` | 否 | 当前窗口 | 播放窗口 |
| `streamType` | [`StreamType`](#streamtype) | 否 | `1` | 码流类型 |
| `rtspPort` | `number` | 否 | 自动识别 | RTSP 端口 |
| `webSocketPort` | `number` | 否 | 自动识别 | WebSocket 取流端口 |
| `useProxy` | `boolean` | 否 | 底层默认 | 是否通过 WebSocket 代理取流 |
| `transcode` | `PlaybackTranscode` | 否 | 无 | 转码参数，见下表 |

`PlaybackTranscode`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `frameRate` | [`TranscodeFrameRate`](#transcodeframerate) | 否 | 无 | 转码帧率档位 |
| `resolution` | [`TranscodeResolution`](#transcoderesolution) | 否 | 无 | 转码分辨率档位 |
| `bitrate` | [`TranscodeBitrate`](#transcodebitrate) | 否 | 无 | 转码码率档位 |

返回：`Promise<void>`。

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
| `player.changeLayout(layout)` | `layout:` [`Layout`](#layout) | `Promise<void>` | 切换布局（`1/2/3/4` 对应 `1×1/2×2/3×3/4×4`） |
| `player.fullScreen(enable?)` | `enable?: boolean` | `Promise<void>` | 全屏切换；`true` 进入，`false` 退出，默认 `true` |
| `player.getWindowStatus(windowIndex?)` | `windowIndex?: number` | `WindowStatus \| null` | 获取单个窗口状态 |
| `player.getAllWindows()` | 无 | `WindowStatus[]` | 获取底层返回的窗口状态列表 |

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

#### `player.capture(options?)`

抓拍当前窗口。`options` 为可选 `CaptureOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | 否 | 自动生成 | 抓拍文件名，`.bmp` 结尾时抓 BMP |
| `windowIndex` | `number` | 否 | 当前窗口 | 抓拍窗口 |
| `onData` | `(data: Uint8Array) => void \| Promise<void>` | 否 | 无 | 接收图片字节；传入后不触发浏览器下载 |

返回：`Promise<string>`，值为实际使用的文件名。

#### `player.startRecording(options?)`

开始浏览器本地录像。`options` 为可选 `RecordingOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | 否 | 自动生成 | 录像文件名 |
| `windowIndex` | `number` | 否 | 当前窗口 | 录像窗口 |
| `byDateDirectory` | `boolean` | 否 | `true` | 是否按日期创建目录 |

返回：`Promise<string>`，值为实际使用的文件名。

#### `player.stopRecording(windowIndex?)`

停止本地录像。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `windowIndex` | `number` | 否 | 当前窗口 | 录像窗口 |

返回：`Promise<void>`。

#### `player.searchRecords(deviceId, options)`

搜索录像。`deviceId` 为 `login()` 返回的设备 id；`options` 为 `RecordSearchOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `channel` | `number` | 是 | 无 | 通道号 |
| `startTime` | `string` | 是 | 无 | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `endTime` | `string` | 是 | 无 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `streamType` | [`StreamType`](#streamtype) | 否 | `1` | 码流类型 |
| `searchPos` | `number` | 否 | 按 `page` 计算 | 搜索起点，通常为 `0/40/80...` |
| `page` | `number` | 否 | `1` | 1 基页码，自动换算为搜索起点 |

返回：`Promise<RecordSearchResult>`。

#### `player.downloadRecord(deviceId, playbackUri, fileName, options?)`

按录像搜索结果中的 `playbackUri` 下载录像。`deviceId` 为 `login()` 返回的设备 id；`playbackUri` 为 `RecordMatch.playbackUri`；`fileName` 为下载文件名；`options` 为可选 `DownloadOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `byDateDirectory` | `boolean` | 否 | `true` | 是否按日期创建目录 |

返回：`Promise<unknown>`。

#### `player.downloadRecordByTime(deviceId, playbackUri, options)`

按时间段下载录像。`deviceId` 为 `login()` 返回的设备 id；`playbackUri` 为 `RecordMatch.playbackUri`；`options` 为 `DownloadByTimeOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | 是 | 无 | 下载文件名 |
| `startTime` | `string` | 是 | 无 | 起始时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `endTime` | `string` | 是 | 无 | 结束时间，格式 `yyyy-MM-dd HH:mm:ss` |
| `byDateDirectory` | `boolean` | 否 | `true` | 是否按日期创建目录 |

返回：`Promise<unknown>`。

### PTZ 云台

#### `player.ptzStart(options)`

开始云台动作。`options` 为 `PtzControlOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `action` | [`PtzCommand`](#ptzcommand) `\| number` | 是 | 无 | 控制动作 |
| `speed` | `number` | 否 | `4` | 速度，范围 `1-7` |
| `windowIndex` | `number` | 否 | 当前窗口 | 操作窗口 |

返回：`Promise<void>`。

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

#### `player.importDeviceConfig(deviceId, fileName, options?)`

导入设备配置。`deviceId` 为 `login()` 返回的设备 id；`fileName` 为 `openFileDialog()` 返回的 `szFileName`；`options` 为可选 `ImportDeviceConfigOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `password` | `string` | 否 | 无 | 配置文件密码 |
| `file` | `File \| null` | 否 | 无 | `openFileDialog()` 返回的 `file` |

返回：`Promise<unknown>`。

#### `player.startUpgrade(deviceId, fileName, options?)`

开始固件升级。`deviceId` 为 `login()` 返回的设备 id；`fileName` 为 `openFileDialog()` 返回的 `szFileName`；`options` 为可选 `StartUpgradeOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `file` | `File \| null` | 否 | 无 | `openFileDialog()` 返回的 `file` |

返回：`Promise<unknown>`。

### 透传请求与文件选择

#### `player.sendHttpRequest(deviceId, uri, options?)`

发送设备 ISAPI 请求。`deviceId` 为 `login()` 返回的设备 id；`uri` 为 ISAPI 路径，建议不以 `/` 开头；`options` 为可选 `HttpRequestOptions`：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'DELETE'` | 否 | `'GET'` | 请求方法 |
| `body` | `string` | 否 | 无 | 请求体，通常是 XML 字符串 |
| `async` | `boolean` | 否 | `true` | 是否异步 |
| `auth` | `boolean \| string` | 否 | `true` | 是否携带设备认证或直接透传认证值 |

返回：`Promise<Document \| null>`。

#### `player.getTextOverlay(deviceId, uri)`

读取通道 OSD 字符叠加配置。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `deviceId` | `string` | 是 | 无 | `login()` 返回的设备 id |
| `uri` | `string` | 是 | 无 | 叠加信息 ISAPI 路径 |

返回：`Promise<Document \| null>`。

#### `player.openFileDialog(type)`

打开文件或文件夹选择框。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | [`FileDialogType`](#filedialogtype) | 是 | 无 | 文件或文件夹选择模式 |

返回：`Promise<OpenFileDialogResult>`。

### 低级桥接 API

低级桥接 API 直接调用底层方法，适合临时接入本库尚未封装的能力。

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

所有封装 API 失败都会抛出 `HikError`。优先使用 `code` 字段做分支处理，而非依赖 `message` 文案。

#### `new HikError(code, message, details?, cause?)`

库统一错误类型。其它任意异常可通过 `toHikError()` 收敛为它。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `code` | `HikErrorCode` | 是 | 无 | 错误码 |
| `message` | `string` | 是 | 无 | 面向日志和用户提示的说明 |
| `details` | `HikErrorDetails` | 否 | 无 | SDK 方法名、返回值等上下文 |
| `cause` | `unknown` | 否 | 无 | 原始异常 |

实例字段：`name`、`code`、`message`、`details`、`cause`。

#### `toHikError(error, fallbackCode?, fallbackMessage?)`

把任意异常收敛为 `HikError`，适合在业务统一错误处理中使用。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `error` | `unknown` | 是 | 无 | 原始异常 |
| `fallbackCode` | `HikErrorCode` | 否 | `'SDK_CALL_FAILED'` | 原始异常不是 `HikError` 时使用 |
| `fallbackMessage` | `string` | 否 | `'调用 SDK 失败'` | 原始异常没有 message 时使用 |

返回：`HikError`。

### 工具函数

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `formatDate(date, pattern?)` | `date: Date`, `pattern?: string` | `string` | 格式化日期，默认 `yyyy-MM-dd HH:mm:ss` |
| `currentTimestamp(pattern?)` | `pattern?: string` | `string` | 格式化当前时间 |
| `todayTimeRange()` | 无 | `{ start: string, end: string }` | 当天起止时间 |
| `isValidTimeRange(start, end)` | `start: string`, `end: string` | `boolean` | 判断时间范围是否可解析且结束时间不早于开始时间 |
| `isIPv4(value)` | `value: string` | `boolean` | 判断 IPv4 |
| `isIPv6(value)` | `value: string` | `boolean` | 判断 IPv6 |
| `isHostname(value)` | `value: string` | `boolean` | 判断域名 |
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

每个 TypeScript 字面量类型（如 `StreamType`）都对应一个同语义的运行时常量对象（如 `STREAM_TYPE`）。两者取值完全一致：

- **类型**用于 TS 函数签名约束与编辑器自动补全；
- **常量**用于在业务代码中以语义化成员名访问，例如 `STREAM_TYPE.Main` 等价于字面量 `1`。

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
| `OpenFileDialogResult` | `szFileName`、`file` |
| `HikError` | `name`、`code`、`message`、`details`、`cause` |

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

| 事件名 | 负载 | 说明 |
| --- | --- | --- |
| `plugin:initialized` | `void` | 初始化完成 |
| `plugin:destroyed` | `void` | 销毁完成 |
| `plugin:event` | `{ eventType:` [`PluginEventCode`](#plugineventcode)`, windowIndex, param2 }` | 播放异常或状态事件 |
| `plugin:error` | `{ windowIndex, errorCode:` [`SdkRuntimeError`](#sdkruntimeerror)`, error }` | 插件错误 |
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

| code | 说明 |
| --- | --- |
| `SDK_NOT_FOUND` | 未加载底层脚本，或当前浏览器不支持 |
| `SDK_METHOD_MISSING` | 当前底层资源版本缺少目标方法 |
| `SDK_CALL_FAILED` | 底层调用失败，可能带 `status/responseXml` |
| `SCRIPT_LOAD_FAILED` | `loadWebVideoCtrl()` 加载失败或超时 |
| `NOT_INITIALIZED` | 尚未调用 `init()` |
| `ALREADY_INITIALIZED` | 重复调用 `init()` |
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
pnpm install      # 安装依赖
pnpm lint         # ESLint 检查
pnpm lint:fix     # 自动修复 lint 问题
pnpm typecheck    # 仅运行类型检查
pnpm build        # 类型 + Vite 构建产物
pnpm release      # bumpp + pnpm publish 发版
```

## 致谢

感谢海康威视提供 [无插件 Web 开发包](https://open.hikvision.com/download/5cda567cf47ae80dd41a54b3?type=20&id=6343bb4b03df46c39032d2ef825eb70d)。本项目仅作为其上层 TypeScript 封装，与海康官方无附属关系。

## License

[MIT](./LICENSE) © [joygqz](https://github.com/joygqz)
