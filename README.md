# HikVideoCtrl [![NPM Version](https://img.shields.io/npm/v/hikvideoctrl)](https://www.npmjs.com/package/hikvideoctrl) [![NPM Downloads](https://img.shields.io/npm/dm/hikvideoctrl)](https://www.npmjs.com/package/hikvideoctrl)

海康威视无插件视频播放 SDK 封装库，支持 TypeScript/ESM，提供设备管理、视频播放、PTZ 控制、录像管理等完整功能。

## ✨ 特性

- 🎯 **开箱即用** - 几行代码即可开始预览
- 📦 **TypeScript 支持** - 完整的类型定义和智能提示
- 🚀 **现代化 API** - Promise 风格，符合直觉
- 🎨 **ESM/CJS 双支持** - 适配各种构建工具
- 🔐 **完整功能** - 设备管理、预览、回放、PTZ、录像等全覆盖
- 📝 **事件系统** - 统一的事件监听机制

## 📦 安装

```bash
# 使用 npm
npm install hikvideoctrl

# 使用 pnpm
pnpm add hikvideoctrl

# 使用 yarn
yarn add hikvideoctrl
```

## 🚀 快速开始

### 1. 配置海康 WEB 无插件开发包

1. 访问官网下载最新 WEB 无插件开发包，详情见[下载页面](https://open.hikvision.com/download/5cda567cf47ae80dd41a54b3?type=10&id=6343bb4b03df46c39032d2ef825eb70d)。

2. （以 Vite 项目为例）将官方包中的 `codebase` 目录及所有文件复制到项目的 `public` 目录，并在 `index.html` 中引入：

```html
<script src="/codebase/webVideoCtrl.js"></script>
```

3. 按照官方包文档的说明配置 Nginx 代理，确保海康服务能正确访问。

### 2. 三步开始预览

```typescript
import { createHikVideoClient } from 'hikvideoctrl'

// 1️⃣ 创建客户端
const client = createHikVideoClient()

// 2️⃣ 初始化插件
await client.initialize({
  container: 'video-container', // 容器元素的 ID（字符串请勿携带 #）
  width: 1000,
  height: 600,
  layout: 4, // 4 窗口布局
})

// 3️⃣ 连接设备并预览
const device = await client.connectDevice({
  host: '192.168.1.64',
  username: 'admin',
  password: 'admin123',
})

await client.startPreview(device.id, {
  channel: 1, // 通道号
  windowIndex: 0, // 窗口索引
})
```

## 📚 完整 API 文档

### 🔑 核心客户端

#### `createHikVideoClient()`

创建海康视频客户端实例。

```typescript
import { createHikVideoClient } from 'hikvideoctrl'

const client = createHikVideoClient()
```

### 🔧 初始化与配置

#### `initialize(options)`

初始化视频插件（必须首先调用）。

```typescript
await client.initialize({
  container: 'video-container', // 容器元素 ID 或 DOM 元素
  width: 1000, // 宽度（像素或百分比字符串，默认 '100%')
  height: 600, // 高度（默认 '100%')
  layout: 4, // 窗口布局：1/4/9/16
  noPlugin: true, // 使用无插件模式（默认 true）
  debugMode: false, // 调试模式
  enableDoubleClickFullScreen: true, // 双击全屏

  // 可选回调
  onWindowSelect: (index) => {
    console.log('选中窗口', index)
  },
  onWindowDoubleClick: (index, isFullScreen) => {
    console.log('双击窗口', index, isFullScreen)
  },
  onInitComplete: () => {
    console.log('初始化完成')
  },
})
```

**参数说明：**

| 参数                          | 类型                    | 必填 | 说明                                               |
| ----------------------------- | ----------------------- | ---- | -------------------------------------------------- |
| `container`                   | `string \| HTMLElement` | ✅   | 视频容器 ID 或 DOM 元素（字符串请传 ID，勿含 `#`） |
| `width`                       | `string \| number`      | ❌   | 宽度，默认 `'100%'`                                |
| `height`                      | `string \| number`      | ❌   | 高度，默认 `'100%'`                                |
| `layout`                      | `number`                | ❌   | 窗口布局：1/4/9/16，默认 1                         |
| `noPlugin`                    | `boolean`               | ❌   | 是否使用无插件模式，默认 true                      |
| `debugMode`                   | `boolean`               | ❌   | 是否开启调试模式                                   |
| `enableDoubleClickFullScreen` | `boolean`               | ❌   | 是否启用双击全屏                                   |
| `onWindowSelect`              | `function`              | ❌   | 窗口选中回调                                       |
| `onWindowDoubleClick`         | `function`              | ❌   | 窗口双击回调                                       |
| `onInitComplete`              | `function`              | ❌   | 初始化完成回调                                     |

### 📡 设备管理

#### `connectDevice(credentials)`

连接海康设备。

```typescript
const device = await client.connectDevice({
  host: '192.168.1.64', // 设备 IP
  port: 80, // 端口，默认 80
  username: 'admin', // 用户名
  password: 'admin123', // 密码
  protocol: 'http', // 协议：'http' | 'https'
})

console.log('设备ID:', device.id)
console.log('设备地址:', device.host)
```

**返回值：** `DeviceSession`

```typescript
interface DeviceSession {
  id: string // 设备唯一标识
  host: string // 设备地址
  port: number // 端口
  username: string // 用户名
  protocol: 'http' | 'https' // 协议
}
```

#### `disconnectDevice(deviceId)`

断开设备连接。

```typescript
await client.disconnectDevice(device.id)
```

#### `listDevices()`

获取所有已连接设备列表。

```typescript
const devices = client.listDevices()
devices.forEach((dev) => {
  console.log(`设备: ${dev.host}:${dev.port}`)
})
```

#### `getDevice(deviceId)`

获取指定设备信息。

```typescript
const device = client.getDevice(deviceId)
if (device) {
  console.log('设备已连接:', device.host)
}
```

#### `getDeviceInfo(deviceId)`

获取设备详细信息（XML 格式）。

```typescript
const xmlDoc = await client.getDeviceInfo(device.id)
const deviceName = xmlDoc.querySelector('deviceName')?.textContent
const model = xmlDoc.querySelector('model')?.textContent
console.log('设备名称:', deviceName)
console.log('设备型号:', model)
```

#### `getDevicePort(deviceId)`

获取设备端口信息。

```typescript
const portInfo = client.getDevicePort(device.id)
console.log('设备端口:', portInfo.iDevicePort)
console.log('RTSP 端口:', portInfo.iRtspPort)
```

**返回值：**

```typescript
interface DevicePort {
  iDevicePort: number // 设备端口
  iRtspPort: number // RTSP 端口
}
```

#### `getChannels(deviceId)`

获取设备所有通道信息。

```typescript
const channels = await client.getChannels(device.id)
channels.forEach((ch) => {
  console.log(`通道 ${ch.id}: ${ch.name} [${ch.type}] ${ch.online ? '在线' : '离线'}`)
})
```

**返回值：** `ChannelInfo[]`

```typescript
interface ChannelInfo {
  id: string // 通道 ID
  name: string // 通道名称
  type: 'analog' | 'digital' | 'zero' // 通道类型
  isZero: boolean // 是否为零通道
  online: boolean // 是否在线
}
```

#### `getAudioInfo(deviceId)`

获取音频信息。

```typescript
const audioDoc = await client.getAudioInfo(device.id)
```

#### `restartDevice(deviceId)`

重启设备。

```typescript
await client.restartDevice(device.id)
```

#### `reconnectDevice(deviceId)`

重新连接设备。

```typescript
await client.reconnectDevice(device.id)
```

#### `exportDeviceConfig(deviceId, password)`

导出设备配置。

```typescript
await client.exportDeviceConfig(device.id, 'config_password')
```

#### `importDeviceConfig(deviceId, fileName, password, file)`

导入设备配置。

```typescript
const file = document.querySelector('input[type="file"]').files[0]
await client.importDeviceConfig(device.id, 'config.bin', 'config_password', file)
```

#### `restoreDeviceDefault(deviceId, mode)`

恢复设备出厂设置。

```typescript
// 基本恢复
await client.restoreDeviceDefault(device.id, 'basic')

// 完全恢复
await client.restoreDeviceDefault(device.id, 'full')
```

#### `startUpgrade(deviceId, fileName, file)`

设备固件升级。

```typescript
const file = document.querySelector('input[type="file"]').files[0]
await client.startUpgrade(device.id, 'firmware.bin', file)
```

#### `getUpgradeProgress(deviceId)`

获取升级进度。

```typescript
const progress = await client.getUpgradeProgress(device.id)
console.log('升级进度:', `${progress.percent}%`)
console.log('升级中:', progress.upgrading)
```

### 📹 视频预览

#### `startPreview(deviceId, options)`

开始实时预览。

```typescript
await client.startPreview(device.id, {
  channel: 1, // 通道号
  windowIndex: 0, // 窗口索引（0-15）
  streamType: 1, // 码流类型：1-主码流，2-子码流
  zeroChannel: false, // 是否为零通道

  // 可选回调
  onSuccess: () => {
    console.log('预览成功')
  },
  onError: (status, xmlDoc, error) => {
    console.error('预览失败', error)
  },
})
```

**参数说明：**

| 参数          | 类型       | 必填 | 说明                       |
| ------------- | ---------- | ---- | -------------------------- |
| `channel`     | `number`   | ✅   | 通道号                     |
| `windowIndex` | `number`   | ❌   | 窗口索引，默认当前选中窗口 |
| `streamType`  | `1 \| 2`   | ❌   | 1-主码流，2-子码流，默认 1 |
| `zeroChannel` | `boolean`  | ❌   | 是否为零通道，默认 false   |
| `useProxy`    | `boolean`  | ❌   | 是否使用代理               |
| `rtspPort`    | `number`   | ❌   | RTSP 端口                  |
| `onSuccess`   | `function` | ❌   | 成功回调                   |
| `onError`     | `function` | ❌   | 失败回调                   |

#### `stopPreview(windowIndex?)`

停止预览。

```typescript
// 停止指定窗口
await client.stopPreview(0)

// 停止当前窗口
await client.stopPreview()
```

#### `stopAllPreview()`

停止所有预览。

```typescript
await client.stopAllPreview()
```

### ⏯️ 视频回放

#### `startPlayback(deviceId, options)`

开始录像回放。

```typescript
await client.startPlayback(device.id, {
  channel: 1,
  windowIndex: 0,
  start: '2024-01-01 00:00:00', // 开始时间
  end: '2024-01-01 23:59:59', // 结束时间
  streamType: 1,

  // 可选转码参数
  transcode: {
    frameRate: '25', // 帧率
    resolution: '1', // 分辨率
    bitrate: '2048', // 码率
  },
})
```

#### `stopPlayback(windowIndex?)`

停止回放。

```typescript
await client.stopPlayback(0)
```

#### `pausePlayback(windowIndex?)`

暂停回放。

```typescript
await client.pausePlayback()
```

#### `resumePlayback(windowIndex?)`

恢复回放。

```typescript
await client.resumePlayback()
```

#### `playFast(windowIndex?)`

快进播放。

```typescript
await client.playFast()
```

#### `playSlow(windowIndex?)`

慢放播放。

```typescript
await client.playSlow()
```

### 🔊 音频控制

#### `openSound(windowIndex?)`

打开声音。

```typescript
await client.openSound(0)
```

#### `closeSound(windowIndex?)`

关闭声音。

```typescript
await client.closeSound(0)
```

#### `setVolume(volume, windowIndex?)`

设置音量。

```typescript
// 音量范围：0-100
await client.setVolume(50, 0)
```

### 🎮 PTZ 云台控制

#### `ptzControl(options, stop?)`

PTZ 云台控制。

```typescript
import { PTZControlType } from 'hikvideoctrl'

// 开始上移
await client.ptzControl({
  action: PTZControlType.Up, // 控制动作
  speed: 5, // 速度：1-7
  windowIndex: 0,
})

// 停止上移
await client.ptzControl({
  action: PTZControlType.Up,
}, true)
```

**PTZ 控制类型：**

```typescript
PTZControlType.Up // 上
PTZControlType.Down // 下
PTZControlType.Left // 左
PTZControlType.Right // 右
PTZControlType.UpLeft // 左上
PTZControlType.UpRight // 右上
PTZControlType.DownLeft // 左下
PTZControlType.DownRight // 右下
PTZControlType.Auto // 自动
PTZControlType.ZoomIn // 放大
PTZControlType.ZoomOut // 缩小
PTZControlType.FocusIn // 聚焦+
PTZControlType.FocusOut // 聚焦-
PTZControlType.IrisIn // 光圈+
PTZControlType.IrisOut // 光圈-
```

#### `ptzStart(options)`

开始 PTZ 控制。

```typescript
await client.ptzStart({
  action: PTZControlType.Right,
  speed: 5,
})
```

#### `ptzStop(action, windowIndex?)`

停止 PTZ 控制。

```typescript
await client.ptzStop(PTZControlType.Right, 0)
```

#### `setPreset(preset, windowIndex?)`

设置预置点。

```typescript
// 设置预置点 1
await client.setPreset(1, 0)
```

#### `goPreset(preset, windowIndex?)`

调用预置点。

```typescript
// 转到预置点 1
await client.goPreset(1, 0)
```

### 📼 录像与抓拍

#### `searchRecords(deviceId, options)`

搜索录像文件。

```typescript
const result = await client.searchRecords(device.id, {
  channel: 1,
  start: '2024-01-01 00:00:00',
  end: '2024-01-01 23:59:59',
  streamType: 1,
  page: 1, // 页码，每页 40 条
})

// 解析录像列表
const files = result.querySelectorAll('searchMatchItem')
files.forEach((file) => {
  const playbackUri = file.querySelector('playbackURI')?.textContent
  const startTime = file.querySelector('startTime')?.textContent
  const endTime = file.querySelector('endTime')?.textContent
  console.log('录像片段:', startTime, '-', endTime)
})
```

#### `startRecording(options)`

开始本地录像。

```typescript
const fileName = await client.startRecording({
  windowIndex: 0,
  fileName: 'record_001', // 可选，不填自动生成
  directoryByDate: true, // 按日期分目录
})

console.log('录像文件:', fileName)
```

#### `stopRecording(windowIndex?)`

停止录像。

```typescript
await client.stopRecording(0)
```

#### `capture(options?)`

抓拍截图。

```typescript
const fileName = await client.capture({
  windowIndex: 0,
  fileName: 'capture_001', // 可选
  format: 'jpg', // 格式：jpg/jpeg/png/bmp

  // 可选：获取原始数据
  onData: (data) => {
    console.log('图片数据:', data)
  },
})

console.log('截图文件:', fileName)
```

#### `downloadRecord(deviceId, playbackUri, fileName, options?)`

下载录像文件。

```typescript
const handleId = await client.downloadRecord(
  device.id,
  'playbackURI', // 从搜索结果中获取
  'download_001',
  {
    directoryByDate: true, // 按日期分目录
  }
)

console.log('下载句柄:', handleId)
```

#### `downloadRecordByTime(deviceId, playbackUri, options)`

按时间段下载录像。

```typescript
const handleId = await client.downloadRecordByTime(
  device.id,
  'playbackURI',
  {
    fileName: 'download_001',
    start: '2024-01-01 10:00:00',
    end: '2024-01-01 11:00:00',
    directoryByDate: true,
  }
)
```

### 🖼️ 画面控制

#### `toggleFullScreen(enable?)`

切换全屏模式。

```typescript
// 进入全屏
client.toggleFullScreen(true)

// 退出全屏
client.toggleFullScreen(false)
```

#### `changeWindowLayout(layout)`

切换窗口布局。

```typescript
import { WindowType } from 'hikvideoctrl'

// 切换到 4 窗口
client.changeWindowLayout(WindowType.Four)

// 可选值：
// WindowType.Single (1)     - 单窗口
// WindowType.Four (4)       - 四窗口
// WindowType.Nine (9)       - 九窗口
// WindowType.Sixteen (16)   - 十六窗口
```

#### `enableEZoom(windowIndex?)`

启用电子放大。

```typescript
await client.enableEZoom(0)
```

#### `disableEZoom(windowIndex?)`

禁用电子放大。

```typescript
await client.disableEZoom(0)
```

#### `enable3DZoom(windowIndex?, callback?)`

启用 3D 定位。

```typescript
await client.enable3DZoom(0, (info) => {
  console.log('3D 定位信息:', info)
})
```

#### `disable3DZoom(windowIndex?)`

禁用 3D 定位。

```typescript
client.disable3DZoom(0)
```

#### `getWindowStatus(windowIndex?)`

获取窗口状态。

```typescript
const status = client.getWindowStatus(0)
console.log('窗口状态:', status)
```

#### `getWindowSet()`

获取所有窗口信息。

```typescript
const windows = client.getWindowSet()
windows.forEach((wnd) => {
  console.log(`窗口 ${wnd.iIndex}:`, wnd)
})
```

### ⚙️ 高级配置

#### `setSecretKey(secretKey, windowIndex?)`

设置视频加密密钥。

```typescript
await client.setSecretKey('your-secret-key', 0)
```

#### `getOSDTime(windowIndex?)`

获取视频 OSD 时间。

```typescript
const osdTime = await client.getOSDTime(0)
console.log('OSD 时间:', osdTime)
```

#### `getLocalConfig()`

获取本地配置。

```typescript
const config = client.getLocalConfig()
console.log('本地配置:', config)
```

#### `setLocalConfig(config)`

设置本地配置。

```typescript
const success = client.setLocalConfig('config_string')
console.log('配置设置:', success ? '成功' : '失败')
```

#### `openFileDialog(type)`

打开文件选择对话框。

```typescript
// 选择文件
const { szFileName, file } = await client.openFileDialog(1)

// 选择文件夹
const { szFileName } = await client.openFileDialog(0)
```

#### `sendHTTPRequest(deviceId, url, options?)`

发送 HTTP 请求到设备。

```typescript
const response = await client.sendHTTPRequest(
  device.id,
  '/ISAPI/System/deviceInfo',
  {
    type: 'GET',
    timeout: 5000,
  }
)
```

#### `getTextOverlay(deviceId, url, options?)`

获取文字叠加信息。

```typescript
const overlay = await client.getTextOverlay(
  device.id,
  '/ISAPI/System/Video/inputs/channels/1/overlays',
)
```

### 📡 事件系统

#### `on(event, handler)`

监听事件。

```typescript
// 监听设备连接
const unsubscribe = client.on('device:connected', (device) => {
  console.log('设备已连接:', device.host)
})

// 取消监听
unsubscribe()
```

#### `off(event, handler?)`

取消监听。

```typescript
const handler = device => console.log(device)
client.on('device:connected', handler)

// 取消特定处理器
client.off('device:connected', handler)

// 取消所有处理器
client.off('device:connected')
```

**所有事件类型：**

| 事件名称                  | 参数                                              | 说明           |
| ------------------------- | ------------------------------------------------- | -------------- |
| `plugin:initialized`      | `void`                                            | 插件初始化完成 |
| `plugin:error`            | `{ windowIndex, errorCode, error }`               | 插件错误       |
| `plugin:performance-lack` | `void`                                            | 性能不足       |
| `plugin:secret-key-error` | `{ windowIndex }`                                 | 密钥错误       |
| `plugin:event`            | `{ eventType, param1, param2 }`                   | 通用事件       |
| `window:selected`         | `{ index }`                                       | 窗口被选中     |
| `window:dblclick`         | `{ index, isFullScreen }`                         | 窗口双击       |
| `device:connected`        | `DeviceSession`                                   | 设备连接成功   |
| `device:disconnected`     | `{ deviceId }`                                    | 设备断开连接   |
| `preview:started`         | `{ deviceId, channel, windowIndex, zeroChannel }` | 预览开始       |
| `preview:stopped`         | `{ deviceId, windowIndex }`                       | 预览停止       |
| `preview:stopped-all`     | `void`                                            | 所有预览停止   |
| `playback:started`        | `{ deviceId, channel, windowIndex, start, end }`  | 回放开始       |
| `playback:stopped`        | `{ deviceId, windowIndex }`                       | 回放停止       |
| `recording:started`       | `{ fileName, windowIndex }`                       | 录像开始       |
| `recording:stopped`       | `{ windowIndex }`                                 | 录像停止       |
| `capture:completed`       | `{ fileName, windowIndex, format }`               | 截图完成       |

### 🔍 工具函数

库还导出了一些实用工具函数：

```typescript
import {
  delay,
  formatDate,
  generateUniqueFileName,
  getCurrentTimeString,
  getTodayTimeRange,
  isValidIP,
  isValidPort,
  isValidTimeRange,
} from 'hikvideoctrl'

// 时间格式化
const timeStr = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')

// 获取当前时间
const now = getCurrentTimeString()

// 获取今天的时间范围
const { start, end } = getTodayTimeRange()

// 生成唯一文件名
const fileName = generateUniqueFileName('record', 'mp4')

// IP 验证
const valid = isValidIP('192.168.1.1')

// 端口验证
const portValid = isValidPort(8080)

// 时间范围验证
const rangeValid = isValidTimeRange('2024-01-01 00:00:00', '2024-01-01 23:59:59')

// 延迟
await delay(1000)
```

### 📊 常量定义

```typescript
import {
  DefaultPorts,
  ErrorCodes,
  FileFormat,
  PTZControlType,
  StreamType,
  WindowType,
} from 'hikvideoctrl'

// 码流类型
StreamType.MainStream // 1 - 主码流
StreamType.SubStream // 2 - 子码流

// 窗口布局
WindowType.Single // 1
WindowType.Four // 4
WindowType.Nine // 9
WindowType.Sixteen // 16

// 文件格式
FileFormat.JPG // 'jpg'
FileFormat.JPEG // 'jpeg'
FileFormat.PNG // 'png'
FileFormat.BMP // 'bmp'

// 默认端口
DefaultPorts.HTTP // 80
DefaultPorts.HTTPS // 443
DefaultPorts.RTSP // 554

// 错误码映射
ErrorCodes[1001] // '码流传输过程异常'
```

### 🎯 实用属性

```typescript
// 是否已初始化
if (client.isInitialized) {
  console.log('插件已初始化')
}

// 当前活动窗口索引
const activeIndex = client.activeWindow

// 检查是否支持无插件模式
if (client.supportsNoPlugin()) {
  console.log('支持无插件模式')
}
```

## 💡 实战示例

### 完整的监控页面

```typescript
import { createHikVideoClient, PTZControlType, WindowType } from 'hikvideoctrl'

class VideoMonitor {
  private client = createHikVideoClient()
  private deviceId?: string

  async init() {
    // 初始化
    await this.client.initialize({
      container: 'video-container',
      width: 1200,
      height: 800,
      layout: WindowType.Four,
      onWindowSelect: (index) => {
        console.log('选中窗口', index)
      },
    })

    // 连接设备
    const device = await this.client.connectDevice({
      host: '192.168.1.64',
      username: 'admin',
      password: 'admin123',
    })
    this.deviceId = device.id

    // 监听事件
    this.setupEventListeners()
  }

  setupEventListeners() {
    this.client.on('preview:started', ({ channel, windowIndex }) => {
      console.log(`通道 ${channel} 在窗口 ${windowIndex} 开始预览`)
    })

    this.client.on('plugin:error', ({ windowIndex, errorCode, error }) => {
      console.error(`窗口 ${windowIndex} 错误 ${errorCode}:`, error)
    })
  }

  // 开始预览
  async startPreview(channel: number, windowIndex: number) {
    if (!this.deviceId)
      return

    await this.client.startPreview(this.deviceId, {
      channel,
      windowIndex,
      streamType: 2, // 使用子码流
    })
  }

  // PTZ 控制
  async moveCamera(direction: 'up' | 'down' | 'left' | 'right') {
    const actionMap = {
      up: PTZControlType.Up,
      down: PTZControlType.Down,
      left: PTZControlType.Left,
      right: PTZControlType.Right,
    }

    await this.client.ptzStart({
      action: actionMap[direction],
      speed: 5,
    })

    // 2 秒后停止
    setTimeout(async () => {
      await this.client.ptzStop(actionMap[direction])
    }, 2000)
  }

  // 抓拍
  async captureImage() {
    const fileName = await this.client.capture({
      format: 'jpg',
      onData: (data) => {
        console.log('截图数据大小:', data.length)
      },
    })
    console.log('截图已保存:', fileName)
  }

  // 切换布局
  changeLayout(layout: 1 | 4 | 9 | 16) {
    this.client.changeWindowLayout(layout)
  }

  // 全屏
  toggleFullScreen() {
    this.client.toggleFullScreen()
  }

  // 清理
  async cleanup() {
    if (this.deviceId) {
      await this.client.disconnectDevice(this.deviceId)
    }
  }
}

// 使用
const monitor = new VideoMonitor()
await monitor.init()
```

### 录像回放与下载

```typescript
import { createHikVideoClient, getTodayTimeRange } from 'hikvideoctrl'

async function playbackAndDownload() {
  const client = createHikVideoClient()

  // 初始化
  await client.initialize({
    container: 'video-container',
    width: 800,
    height: 600,
  })

  // 连接设备
  const device = await client.connectDevice({
    host: '192.168.1.64',
    username: 'admin',
    password: 'admin123',
  })

  // 搜索今天的录像
  const { start, end } = getTodayTimeRange()
  const result = await client.searchRecords(device.id, {
    channel: 1,
    start,
    end,
  })

  // 解析录像列表
  const files = result.querySelectorAll('searchMatchItem')
  const firstFile = files[0]

  if (firstFile) {
    const playbackUri = firstFile.querySelector('playbackURI')?.textContent
    const startTime = firstFile.querySelector('startTime')?.textContent
    const endTime = firstFile.querySelector('endTime')?.textContent

    // 回放录像
    await client.startPlayback(device.id, {
      channel: 1,
      start: startTime!,
      end: endTime!,
    })

    // 下载录像
    const handleId = await client.downloadRecord(
      device.id,
      playbackUri!,
      'my-recording',
    )
    console.log('下载任务已创建:', handleId)
  }
}
```

### Vue 3 集成

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createHikVideoClient, type DeviceSession } from 'hikvideoctrl'

const client = createHikVideoClient()
const device = ref<DeviceSession>()
const channels = ref<any[]>([])

onMounted(async () => {
  // 初始化
  await client.initialize({
    container: 'video-container',
    width: '100%',
    height: 600,
    layout: 4,
  })

  // 连接设备
  device.value = await client.connectDevice({
    host: '192.168.1.64',
    username: 'admin',
    password: 'admin123',
  })

  // 获取通道列表
  channels.value = await client.getChannels(device.value.id)
})

onUnmounted(async () => {
  if (device.value) {
    await client.disconnectDevice(device.value.id)
  }
})

const startPreview = async (channelId: number, windowIndex: number) => {
  if (!device.value) return

  await client.startPreview(device.value.id, {
    channel: channelId,
    windowIndex,
  })
}
</script>

<template>
  <div>
    <div id="video-container"></div>
    <div class="controls">
      <button
        v-for="(ch, idx) in channels"
        :key="ch.id"
        @click="startPreview(Number(ch.id), idx)"
      >
        预览 {{ ch.name }}
      </button>
    </div>
  </div>
</template>
```

### React 集成

```tsx
import type { DeviceSession } from 'hikvideoctrl'
import { createHikVideoClient } from 'hikvideoctrl'
import { useEffect, useRef, useState } from 'react'

function VideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef(createHikVideoClient())
  const [device, setDevice] = useState<DeviceSession>()
  const [channels, setChannels] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const client = clientRef.current

      await client.initialize({
        container: containerRef.current!,
        width: 1000,
        height: 600,
        layout: 4,
      })

      const dev = await client.connectDevice({
        host: '192.168.1.64',
        username: 'admin',
        password: 'admin123',
      })
      setDevice(dev)

      const chs = await client.getChannels(dev.id)
      setChannels(chs)
    }

    init()

    return () => {
      if (device) {
        clientRef.current.disconnectDevice(device.id)
      }
    }
  }, [])

  const startPreview = async (channelId: number, windowIndex: number) => {
    if (!device)
      return

    await clientRef.current.startPreview(device.id, {
      channel: channelId,
      windowIndex,
    })
  }

  return (
    <div>
      <div ref={containerRef}></div>
      <div className="controls">
        {channels.map((ch, idx) => (
          <button key={ch.id} onClick={() => startPreview(Number(ch.id), idx)}>
            预览
            {' '}
            {ch.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

## 🐛 错误处理

所有异步方法都可能抛出 `HikSDKError`，建议使用 try-catch：

```typescript
import { HikSDKError } from 'hikvideoctrl'

try {
  await client.connectDevice({
    host: '192.168.1.64',
    username: 'admin',
    password: 'wrong_password',
  })
}
catch (error) {
  if (error instanceof HikSDKError) {
    console.error('错误代码:', error.code)
    console.error('错误信息:', error.message)
    console.error('详细信息:', error.details)
  }
}
```

**错误代码类型：**

- `sdk-not-found` - SDK 未找到
- `sdk-method-missing` - SDK 方法不存在
- `sdk-call-failed` - SDK 调用失败
- `sdk-initialization` - 初始化失败
- `validation` - 参数验证失败
- `not-initialized` - 未初始化
- `device-not-found` - 设备未连接
- `window-state` - 窗口状态错误
- `operation-failed` - 操作失败

## 📖 TypeScript 支持

库完全使用 TypeScript 编写，提供完整的类型定义：

```typescript
import type {
  ChannelInfo,
  DeviceCredentials,
  DeviceSession,
  HikVideoClient,
  HikVideoEventMap,
  PlaybackOptions,
  PreviewOptions,
  PTZCommandOptions,
} from 'hikvideoctrl'

// 所有类型都有完整的智能提示
```
