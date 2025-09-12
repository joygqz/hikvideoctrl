# HikVideoCtrl

[![npm version](https://badge.fury.io/js/hikvideoctrl.svg)](https://badge.fury.io/js/hikvideoctrl)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🎥 海康威视无插件视频播放 SDK 封包，支持 ESM 模块化，提供现代化的 TypeScript API。

## ✨ 特性

- 🚀 **无插件播放** - 基于 WebSocket 和 Canvas 技术，无需安装插件
- 📦 **ES Module** - 支持现代模块化导入
- 🔒 **TypeScript** - 完整的类型定义，提供智能提示和类型检查
- 🎯 **现代 API** - 提供基于 Promise 的异步 API，支持 async/await
- 📱 **多浏览器支持** - 支持 Chrome 90+ 和 Firefox 90+
- 🔧 **功能完整** - 支持实时预览、录像回放、PTZ控制、音频对讲等全部功能

## 🚧 功能支持

- ✅ 设备登录/登出
- ✅ 实时视频预览
- ✅ 录像搜索和回放
- ✅ PTZ 云台控制
- ✅ 预置点管理
- ✅ 录像下载
- ✅ 图片抓取
- ✅ 本地录像
- ✅ 音频播放/控制
- ✅ 电子放大
- ✅ 3D 定位
- ✅ 全屏显示
- ✅ 多窗口切换
- ✅ 事件监听

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

### 检查浏览器支持

```typescript
import { Controller } from 'hikvideoctrl'

// 检查是否支持无插件模式
if (!Controller.isSupportNoPlugin()) {
  console.error('浏览器不支持无插件模式')
}
```

### 基本使用

```typescript
import { Controller } from 'hikvideoctrl'

// 创建控制器实例
const controller = new Controller()

async function initAndPlay() {
  try {
    // 1. 初始化插件
    await controller.initPlugin({
      containerId: 'video-container', // 视频容器ID
      width: '100%',
      height: '100%',
      windowType: 1, // 单窗口
      onError: (windowIndex, errorCode, error) => {
        console.error('播放错误:', errorCode, error)
      }
    })

    // 2. 登录设备
    await controller.login({
      ip: '192.168.1.100',
      port: 8000,
      username: 'admin',
      password: 'password123'
    })

    // 3. 开始预览
    await controller.startPreview({
      deviceId: '192.168.1.100_8000',
      channelId: 1,
      streamType: 1 // 主码流
    })

    console.log('视频播放成功')
  }
  catch (error) {
    console.error('操作失败:', error)
  }
}

initAndPlay()
```

### HTML 容器

```html
<div id="video-container" style="width: 800px; height: 600px"></div>
```

## 📖 详细使用说明

### 设备管理

#### 登录设备

```typescript
await controller.login({
  ip: '192.168.1.100', // 设备IP地址
  port: 8000, // HTTP端口，默认80
  username: 'admin', // 用户名
  password: 'password123', // 密码
  protocol: 1 // 协议版本，默认1
})
```

#### 获取设备信息

```typescript
const deviceId = '192.168.1.100_8000'
const deviceInfo = await controller.getDeviceInfo(deviceId)
console.log('设备信息:', deviceInfo)
```

#### 获取通道列表

```typescript
const channels = await controller.getChannels(deviceId)
console.log('通道列表:', channels)
```

#### 登出设备

```typescript
await controller.logout(deviceId)
```

### 视频播放

#### 实时预览

```typescript
await controller.startPreview({
  deviceId: '192.168.1.100_8000',
  channelId: 1,
  streamType: 1, // 1-主码流, 2-子码流
  windowIndex: 0, // 窗口索引
  isZeroChannel: false, // 是否零通道
  useProxy: false // 是否使用代理
})
```

#### 停止预览

```typescript
// 停止指定窗口
await controller.stopPreview(0)

// 停止所有预览
await controller.stopAllPreview()
```

#### 录像回放

```typescript
await controller.startPlayback({
  deviceId: '192.168.1.100_8000',
  channelId: 1,
  startTime: '2024-01-01 00:00:00',
  endTime: '2024-01-01 23:59:59',
  streamType: 1,
  windowIndex: 0
})
```

#### 回放控制

```typescript
// 暂停回放
await controller.pausePlayback(0)

// 恢复回放
await controller.resumePlayback(0)

// 快进
await controller.playFast(0)

// 慢放
await controller.playSlow(0)
```

### 录像管理

#### 搜索录像

```typescript
const records = await controller.searchRecord({
  deviceId: '192.168.1.100_8000',
  channelId: 1,
  startTime: '2024-01-01 00:00:00',
  endTime: '2024-01-01 23:59:59',
  streamType: 1
})

console.log('录像文件:', records)
```

#### 下载录像

```typescript
// 下载整个录像文件
await controller.downloadRecord(
  deviceId,
  playbackURI,
  'recording.mp4'
)

// 按时间段下载
await controller.downloadRecordByTime(
  deviceId,
  playbackURI,
  '2024-01-01 10:00:00',
  '2024-01-01 11:00:00',
  'recording_part.mp4'
)
```

#### 本地录像

```typescript
// 开始录像
await controller.startRecord({
  windowIndex: 0,
  fileName: 'local_record',
  useDateDir: true
})

// 停止录像
await controller.stopRecord(0)
```

### PTZ 控制

#### 方向控制

```typescript
import { PTZControlType } from 'hikvideoctrl'

// 向上移动
await controller.ptzControl({
  windowIndex: 0,
  ptzIndex: PTZControlType.Up,
  speed: 4
})

// 停止移动
await controller.ptzControl({
  windowIndex: 0,
  ptzIndex: PTZControlType.Up,
  speed: 4
}, true) // 第二个参数为true表示停止
```

#### 变焦控制

```typescript
// 放大
await controller.ptzControl({
  ptzIndex: PTZControlType.ZoomIn,
  speed: 4
})

// 缩小
await controller.ptzControl({
  ptzIndex: PTZControlType.ZoomOut,
  speed: 4
})
```

#### 预置点管理

```typescript
// 设置预置点
await controller.setPreset(1, 0) // 预置点1，窗口0

// 调用预置点
await controller.goPreset(1, 0)
```

### 图像功能

#### 抓图

```typescript
await controller.capturePicture({
  windowIndex: 0,
  fileName: 'snapshot',
  format: 'jpg', // jpg, jpeg, bmp
  callback: (imageData) => {
    console.log('抓图数据:', imageData)
  }
})
```

#### 电子放大

```typescript
// 启用电子放大
await controller.enableEZoom(0)

// 禁用电子放大
await controller.disableEZoom(0)
```

#### 3D定位

```typescript
// 启用3D定位
await controller.enable3DZoom(0, (zoomInfo) => {
  console.log('3D定位信息:', zoomInfo)
})

// 禁用3D定位
controller.disable3DZoom(0)
```

### 音频控制

#### 打开/关闭音频

```typescript
// 打开音频
await controller.openSound(0)

// 关闭音频
await controller.closeSound(0)

// 设置音量 (0-100)
await controller.setVolume(50, 0)
```

### 窗口管理

#### 切换窗口数量

```typescript
import { WindowType } from 'hikvideoctrl'

// 切换为4窗口
await controller.changeWindowCount(WindowType.Four)

// 切换为9窗口
await controller.changeWindowCount(WindowType.Nine)
```

#### 全屏显示

```typescript
controller.fullScreen()
```

### 事件监听

```typescript
// 监听窗口选择事件
controller.on('windowSelect', (windowIndex) => {
  console.log('选择窗口:', windowIndex)
})

// 监听播放错误事件
controller.on('error', (data) => {
  console.error('播放错误:', data.errorCode, data.message)
})

// 监听预览开始事件
controller.on('previewStart', (data) => {
  console.log('预览开始:', data)
})

// 监听回放结束事件
controller.on('playbackEnd', (windowIndex) => {
  console.log('回放结束:', windowIndex)
})

// 监听登录成功事件
controller.on('loginSuccess', (data) => {
  console.log('设备登录成功:', data.deviceId)
})

// 移除事件监听
controller.off('windowSelect')
```

### 工具函数

```typescript
// 格式化时间
const timeStr = HikVideoController.formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss')

// 获取当前时间字符串
const now = HikVideoController.getCurrentTimeString()

// 获取今天的时间范围
const { startTime, endTime } = HikVideoController.getTodayTimeRange()
```

## 🔧 配置选项

### InitOptions

```typescript
interface InitOptions {
  containerId: string // 容器元素ID
  width?: string // 宽度，默认'100%'
  height?: string // 高度，默认'100%'
  windowType?: number // 窗口类型，默认1(单窗口)
  packageType?: number // 包类型，默认2
  noPlugin?: boolean // 是否无插件模式，默认true
  onWindowSelect?: (windowIndex: number) => void
  onWindowDoubleClick?: (windowIndex: number, isFullScreen: boolean) => void
  onEvent?: (eventType: number, param1: number, param2: number) => void
  onError?: (windowIndex: number, errorCode: number, error: any) => void
  onPerformanceLack?: () => void
  onSecretKeyError?: (windowIndex: number) => void
}
```

### DeviceInfo

```typescript
interface DeviceInfo {
  ip: string // 设备IP地址
  port: number // 设备端口
  username: string // 用户名
  password: string // 密码
  protocol?: number // 协议版本，默认1
}
```

## 📋 错误码参考

| 错误码 | 说明                      |
| ------ | ------------------------- |
| 1001   | 码流传输过程异常          |
| 1002   | 回放结束                  |
| 1003   | 取流失败，连接被动断开    |
| 1006   | 视频编码格式不支持        |
| 1007   | 网络异常导致websocket断开 |
| 1012   | 播放资源不足              |
| 1017   | 密码错误                  |

完整错误码列表请参考源码中的 `ErrorCodes` 常量。
