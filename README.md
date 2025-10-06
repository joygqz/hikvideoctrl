# HikVideoCtrl

[![NPM Version](https://img.shields.io/npm/v/hikvideoctrl?style=flat-square)](https://www.npmjs.com/package/hikvideoctrl)
[![NPM Downloads](https://img.shields.io/npm/dm/hikvideoctrl?style=flat-square)](https://www.npmjs.com/package/hikvideoctrl)

🎥 海康威视无插件视频播放 SDK 封装，支持 ESM 模块化，提供完整的 TypeScript API 和现代化开发体验。

## ✨ 特性

- 🚀 **无插件播放** - 基于 WebSocket 和 Canvas 技术，无需安装插件
- 📦 **ES Module** - 支持现代模块化导入
- 🔒 **TypeScript** - 完整的类型定义，提供智能提示和类型检查
- 🎯 **现代 API** - 提供基于 Promise 的异步 API，支持 async/await
- 📱 **多浏览器支持** - 支持 Chrome 90+ 和 Firefox 90+
- 🔧 **功能完整** - 支持实时预览、录像回放、PTZ控制、音频对讲等全部功能

## 🚧 功能支持

### 核心功能

- ✅ 设备登录/登出
- ✅ 实时视频预览
- ✅ 录像搜索和回放
- ✅ 录像下载（支持按时间段下载）
- ✅ 本地录像和抓图
- ✅ 音频播放/控制

### 高级功能

- ✅ PTZ 云台控制（方向、变焦、聚焦、光圈）
- ✅ 预置点管理
- ✅ 电子放大和3D定位
- ✅ 全屏显示和多窗口切换
- ✅ 事件监听和错误处理

### 设备管理

- ✅ 设备配置导入/导出
- ✅ 设备重启和重连
- ✅ 恢复出厂设置
- ✅ 设备升级和进度监控
- ✅ 文件对话框和HTTP请求
- ✅ 文字叠加（OSD）管理

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

### 导入基本库

访问官网下载最新 WEB 无插件开发包，[下载页面](https://open.hikvision.com/download/5cda567cf47ae80dd41a54b3?type=10&id=6343bb4b03df46c39032d2ef825eb70d)

使用示例：如使用 vite 开发，将 `codebase` 目录及所有文件拷贝至 `public` 目录下，并在 `index.html` 中引入：

```html
<script src="/codebase/webVideoCtrl.js"></script>
```

### 检查浏览器支持

```typescript
import { HikVideoController } from 'hikvideoctrl'

// 检查是否支持无插件模式
if (!HikVideoController.isSupportNoPlugin()) {
  console.error('浏览器不支持无插件模式')
}
```

### 基本使用

```typescript
// 使用默认导入
import HikVideoController from 'hikvideoctrl'
// 或者使用命名导入
// import { HikVideoController } from 'hikvideoctrl'

// 创建控制器实例
const controller = new HikVideoController()

async function initAndPlay() {
  try {
    // 1. 初始化插件
    await controller.initPlugin({
      containerId: 'video-container', // 视频容器 ID
      width: '100%',
      height: '100%',
      windowType: 1, // 单窗口
      onError: (windowIndex, errorCode, error) => {
        console.error('播放错误:', errorCode, error)
      }
    })

    // 2. 登录设备
    await controller.login({
      ip: '192.168.1.101',
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
  ip: '192.168.1.100', // 设备 IP 地址
  port: 8000, // HTTP 端口，默认 80
  username: 'admin', // 用户名
  password: 'password123', // 密码
  protocol: 1 // 协议版本，默认 1
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
await controller.pausePlayback()

// 恢复回放
await controller.resumePlayback()

// 快进
await controller.playFast()

// 慢放
await controller.playSlow()
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
await controller.startDownloadRecord(
  deviceId,
  playbackURI,
  'recording.mp4',
  { bDateDir: true }
)

// 按时间段下载
await controller.startDownloadRecordByTime(
  deviceId,
  playbackURI,
  'recording_part.mp4',
  '2024-01-01 10:00:00',
  '2024-01-01 11:00:00',
  { bDateDir: true }
)
```

#### 本地录像

```typescript
// 开始录像
await controller.startRecord({
  fileName: 'local_record',
  useDateDir: true
})

// 停止录像
await controller.stopRecord()
```

### PTZ 控制

#### 方向控制

```typescript
import { PTZControlType } from 'hikvideoctrl'

// 向上移动
await controller.ptzControl({
  ptzIndex: PTZControlType.Up,
  speed: 4
})

// 停止移动
await controller.ptzControl({
  ptzIndex: PTZControlType.Up,
  speed: 4
}, true) // 第二个参数为 true 表示停止
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
await controller.setPreset(1) // 预置点 1

// 调用预置点
await controller.goPreset(1)
```

### 图像功能

#### 抓图

```typescript
await controller.capturePicture({
  windowIndex: 0,
  fileName: 'snapshot',
  format: 'jpg', // jpg, jpeg, png, bmp
  callback: (imageData: Uint8Array) => {
    console.log('抓图数据:', imageData)
  }
})
```

#### 电子放大

```typescript
// 启用电子放大
await controller.enableEZoom()

// 禁用电子放大
await controller.disableEZoom()
```

#### 3D定位

```typescript
// 启用 3D 定位
await controller.enable3DZoom(0, (zoomInfo) => {
  console.log('3D 定位信息:', zoomInfo)
})

// 禁用 3D 定位
controller.disable3DZoom()
```

### 音频控制

#### 打开/关闭音频

```typescript
// 打开音频
await controller.openSound()

// 关闭音频
await controller.closeSound()

// 设置音量 (0-100)
await controller.setVolume(50)
```

### 窗口管理

#### 切换窗口数量

```typescript
import { WindowType } from 'hikvideoctrl'

// 切换为 4 窗口
await controller.changeWindowCount(WindowType.Four)

// 切换为 9 窗口
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

### 设备配置管理

#### 导出/导入设备配置

```typescript
// 导出设备配置
await controller.exportDeviceConfig(deviceId, 'admin123')

// 导入设备配置
const file = new File(['config data'], 'device_config.xml')
await controller.importDeviceConfig(deviceId, 'config.xml', 'admin123', file)
```

#### 设备重启和重连

```typescript
// 重启设备
await controller.restart(deviceId, {
  timeout: 30000,
  success: () => console.log('重启成功'),
  error: status => console.error('重启失败:', status)
})

// 重新连接设备
await controller.reconnect(deviceId)
```

#### 恢复出厂设置

```typescript
// 基础恢复
await controller.restoreDefault(deviceId, 'basic')

// 完全恢复
await controller.restoreDefault(deviceId, 'full', { timeout: 60000 })
```

#### 设备升级

```typescript
// 开始升级
const upgradeFile = new File(['firmware data'], 'firmware.dav')
await controller.startUpgrade(deviceId, 'firmware.dav', upgradeFile)

// 获取升级进度
const progress = await controller.getUpgradeProgress(deviceId)
console.log(`升级进度: ${progress.percent}%`)
```

### 文件和HTTP操作

#### 文件选择对话框

```typescript
// 选择文件
const { szFileName, file } = await controller.openFileDlg(1)

// 选择文件夹
const folderInfo = await controller.openFileDlg(0)
```

#### HTTP请求

```typescript
// 发送 HTTP 请求
const response = await controller.sendHTTPRequest(deviceId, '/ISAPI/System/deviceInfo', {
  type: 'GET',
  async: true
})
```

#### 文字叠加（OSD）

```typescript
// 获取 OSD 配置
const overlay = await controller.getTextOverlay(
  'ISAPI/System/Video/inputs/channels/1/overlays',
  deviceId
)
```

### 本地配置管理

```typescript
// 获取本地配置
const config = controller.getLocalConfig()

// 设置本地配置
const xmlConfig = `
<LocalConfigInfo>
  <PackgeSize>1024</PackgeSize>
  <PlayWndType>1</PlayWndType>
  <BuffNumberType>4</BuffNumberType>
</LocalConfigInfo>`
controller.setLocalConfig(xmlConfig)
```

### 窗口管理

```typescript
// 获取所有窗口状态
const windowSet = controller.getWndSet()
console.log('窗口信息:', windowSet)

// 获取指定窗口状态
const windowStatus = controller.getWindowStatus(0)
console.log('窗口状态:', windowStatus)
```

### 工具函数

```typescript
import {
  createResponseHandler,
  delay,
  encodeString,
  formatDate,
  generateDeviceIdentify,
  generateUniqueFileName,
  getCurrentTimeString,
  getTodayTimeRange,
  getWindowSize,
  isValidIP,
  isValidPort,
  isValidTimeRange,
  loadXML,
  parseDeviceIdentify,
  promisify,
  toXMLString,
  uint8ArrayToBase64
} from 'hikvideoctrl'

// 格式化时间
const timeStr = formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss')

// 获取当前时间字符串
const now = getCurrentTimeString()

// 获取今天的时间范围
const { startTime, endTime } = getTodayTimeRange()

// 生成设备标识
const deviceId = generateDeviceIdentify('192.168.1.100', 8000)

// 解析设备标识
const { ip, port } = parseDeviceIdentify('192.168.1.100_8000')

// IP 和端口验证
const isValidIPAddress = isValidIP('192.168.1.100')
const isValidPortNumber = isValidPort(8000)

// 生成唯一文件名
const fileName = generateUniqueFileName('capture', 'jpg')

// 验证时间范围
const isValidRange = isValidTimeRange('2024-01-01 00:00:00', '2024-01-01 23:59:59')

// 延迟执行
await delay(1000)

// 获取窗口尺寸
const { width, height } = getWindowSize()

// 将 Uint8Array 转换为 Base64
const base64 = await uint8ArrayToBase64(imageData)

// 加载 XML
const xmlDoc = loadXML(xmlString)

// 转换为 XML 字符串
const xmlStr = toXMLString(xmlDoc)

// HTML 实体编码
const encoded = encodeString('<div>content</div>')

// Promise 化函数
const result = await promisify(someFunction, arg1, arg2)

// 创建响应处理器
const handler = createResponseHandler(
  data => console.log('成功', data),
  (status, xmlDoc, error) => console.error('失败', status, error)
)
```

## 🔧 配置选项

### InitOptions

```typescript
interface InitOptions {
  containerId: string // 容器元素 ID
  width?: string // 宽度，默认 '100%'
  height?: string // 高度，默认 '100%'
  windowType?: number // 窗口类型，默认 1 (单窗口)
  packageType?: number // 包类型，默认 2
  noPlugin?: boolean // 是否无插件模式，默认 true
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
  ip: string // 设备 IP 地址
  port: number // 设备端口
  username: string // 用户名
  password: string // 密码
  protocol?: number // 协议版本，默认 1
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

## 💡 最佳实践

### 设备连接管理

```typescript
// 1. 初始化控制器
const controller = new HikVideoController()

// 2. 监听关键事件
controller.on(EVENTS.LOGIN_SUCCESS, () => {
  console.log('设备连接成功')
})

controller.on(EVENTS.LOGIN_FAILED, (error) => {
  console.error('设备连接失败:', error)
})

// 3. 登录前检查网络
if (isValidIP(ip) && isValidPort(port)) {
  await controller.login(deviceId, credentials)
}

// 4. 使用完毕后清理资源
window.addEventListener('beforeunload', () => {
  controller.logout(deviceId)
})
```

### 视频播放优化

```typescript
// 1. 预览前设置窗口
const windowId = 0
controller.getWindowStatus(windowId)

// 2. 设置合适的协议和码流
await controller.startPreview(deviceId, {
  wndId: windowId,
  streamType: STREAM_TYPE.MAIN, // 主码流高清晰
  protocol: PROTOCOL_TYPE.TCP, // TCP稳定性好
  playback: 0
})

// 3. 监听播放状态
controller.on(EVENTS.PLAY_SUCCESS, (wndInfo) => {
  console.log('播放成功:', wndInfo)
})
```

### 错误处理

```typescript
try {
  await controller.login(deviceId, {
    username: 'admin',
    password: 'password123'
  })
}
catch (error) {
  console.error('登录失败:', error.message)
  // 处理具体错误
  if (error.message.includes('password')) {
    console.log('密码错误，请检查')
  }
}
```

## 🔍 开发调试

```typescript
// 查看内部状态
console.log(controller.getWindowStatus(0))
console.log(controller.getLocalConfig())
```

## 📝 开发指南

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/joygqz/hikvideoctrl.git
cd hikvideoctrl

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行示例
# 在 example 目录中启动本地服务器
npx serve example
```

### 贡献代码

欢迎提交 Pull Request 或 Issue！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

[MIT License](LICENSE) © 2024 joygqz
