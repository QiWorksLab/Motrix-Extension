# 架构与边界

## 组件

1. `webRequest` 在各标签页网络请求中识别视频媒体类型、manifest 和文件元信息。
2. content script 检查 `<video>` 和 `<source>`，读取当前页面播放器可见的标题、分辨率、时长和缩略图。
3. background service worker 按 tabId 保存临时结果、按完整请求地址去重，并更新扩展图标徽标。
4. popup 展示当前标签页结果并提供手动重新嗅探、播放器定位、批量选择。
5. options 保存服务地址、服务端提供的通信端口、自动嗅探和主题；身份验证材料由 Motrix-SPK 的 MBP1 配对流程管理。
6. 下载 API adapter 按 Motrix-SPK `docs/API.md` 使用 MBP1 配对和 MDXP 0.10.0 schema。未认证前不调用任务接口。

## 检测规则

- 扩展名与响应 Content-Type 联合判定；HLS 与 DASH manifest 作为一个资源，TS/M4S 等请求仅作分片活动线索，不作为独立列表项。
- 同一标签页中相同规范化 URL 只显示一次。URL 查询串必须保留，因为签名和授权参数可能在查询串中。
- Blob URL 不是网络下载地址；尝试把它与同一 tab 捕获的媒体请求关联，不把推断当作准确映射。
- 原始分辨率、大小、缩略图等拿不到时显示未知。未经 manifest 解析和真实变体检查，不展示伪造的清晰度选择。

## MP4 输出

扩展不处理媒体字节。服务端应：直接保存确认兼容的 MP4；其他可封装资源优先 `ffmpeg -c copy`；仅在容器或编码不兼容时转码到 H.264/AAC；最后使用 ffprobe/完整解码检查后才标记完成和清理中间文件。具体任务字段和服务端状态以 Motrix-SPK API 文档为准。
