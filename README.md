# Motrix-Extension

简体中文跨浏览器视频资源嗅探扩展，面向 Chrome、Edge、Firefox。电脑浏览器负责识别当前标签页的视频资源；下载、合并和 MP4 转码目标由 Synology Motrix-SPK 在 NAS 上执行。

> 当前阶段：开发版具备基础嗅探、标签页隔离、去重、设置界面及 Chrome/Edge/Firefox 构建。服务端规范现已发布，按 [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md) 对接；MBP1 配对、MDXP 通信及群晖真实下载验收尚未完成。本版本不是 1.0.0，也不具备远程下载能力。

## 支持范围

- 被动观察网页媒体请求以及 `<video>` / `<source>` 元素。
- 识别普通视频、HLS/M3U8、DASH/MPD；隐藏 TS、M4S 等分片请求，不将其单独列为视频。
- Blob URL 仅作为页面内播放器的线索。扩展不声称可从 Blob URL 反推出原始媒体；需要结合该标签页的网络请求记录。
- 请求头只保存在有时效和大小上限的后台内存中，不进入标签页媒体存储或 popup；Cookie 等凭据不写入日志或发送到第三方。
- 不破解 DRM，不绕过网站访问控制，不尝试解密受保护流。
- 最终输出固定为 MP4；服务端需检查源文件、优先无损封装，并在必要时转为 H.264/AAC，校验可播放后清理临时文件。

## 构建

需要 Node.js 20+ 和 `zip`。无需安装 npm 依赖：

```sh
npm test
npm run build
# 可选：生成并运行本地 HTTP 测试媒体（需要 ffmpeg）
npm run fixtures
npm run fixture:serve
```

输出目录：`dist/chrome/`、`dist/edge/`、`dist/firefox/`，并生成对应 zip 安装包。

## 本地加载

- Chrome / Edge：打开 `chrome://extensions` 或 `edge://extensions`，启用开发者模式并加载 `dist/chrome/` 或 `dist/edge/`。
- Firefox：打开 `about:debugging#/runtime/this-firefox`，加载 `dist/firefox/manifest.json`（临时扩展在退出浏览器后会被移除）。

开发者模式加载仅用于本地测试；不代表 Chrome Web Store、Edge Add-ons 或 Firefox AMO 已审核或签名。

## 验收状态

| 项目 | 状态 |
| --- | --- |
| Chromium / Edge / Firefox 构建包 | 0.1.0-dev 已构建，非正式包 |
| 普通 MP4 / HLS / DASH | 需真实浏览器与测试流验收 |
| Blob 与分片关联 | 不承诺反推；需验证网络请求聚合表现 |
| MBP1 配对与 MDXP 0.10.0 | 未接入 |
| 群晖任务发送与 MP4 验收 | 未接入；需目标 NAS 实测 |
| Chrome、Edge、Firefox 商店签名 | 尚未提交审核 |

## 许可证

本仓库独立代码采用 MIT License，详见 [LICENSE](LICENSE)。项目尚未复制第三方实现代码。设计研究参考包括 [erivgout/sluice](https://github.com/erivgout/sluice)（GPL-3.0-or-later）：其网络发现、清晰度枚举及 DRM 拒绝思路可作参考；其本机 FFmpeg Companion 架构不适合本项目“NAS 执行下载和转码”的目标，因此没有复用其代码。另已研究 Motrix 官方扩展的 MBP1/MDXP 接入实现，后续如复用代码会保留 MIT 许可证和原版权声明。
