# Motrix-SPK API 对接记录

本文依据 `QiWorksLab/Motrix-SPK/docs/API.md`（MDXP 0.10.0，wire protocol 1.0）整理。它是实现清单，不是另行定义的接口。

## 调用顺序

1. 从 Motrix-SPK 配对流程取得连接端点和认证材料；实现 MBP1/PAKE 配对、重连与撤销处理。不得用手填 DSM 密码/RPC Secret、猜测端口或未认证 WebSocket 代替配对。
2. 用 `@motrix/mdxp@0.10.0` 的 browser transport、方法常量和 Zod schema 建立会话。每个会话先调用 `motrix/initialize`，验证 `server.runtime === 'server'` 后发送 `motrix/initialized`。
3. 连接测试调用 `system/ping`。只有传输、认证、初始化及 ping 全通过才显示绿色连接状态。
4. 仅当服务端声明 `downloadDirectories` 时调用 `download/directories`，目录只能从服务端返回值选择。
5. 用户明确勾选并发送时调用 `download/submit`。每个逻辑任务有稳定的幂等键；批量使用最多 4 个并发的独立请求，不使用 JSON-RPC batch。
6. 通过 `task/list`、`task/get` 和 `$/task/*` 通知恢复并显示 NAS 端任务状态。重连后先从持久任务读取状态。

## 媒体映射

| 发现结果 | `selection` | 输出要求 |
| --- | --- | --- |
| MP4/WebM/FLV/MOV/MKV 等单资源 | `direct`，`primary` 为媒体资源 | 最终固定 MP4；NAS 判断直存、封装或转码 |
| HLS/M3U8 | `hls`，`primary` 为播放清单 | `container: 'mp4'`，NAS 下载分片并输出 MP4 |
| DASH/MPD | `dash`，`primary` 为 MPD | `container: 'mp4'`，NAS 选轨、合并并输出 MP4 |
| 已确认的分离音视频轨 | `mux`，分别传 `video` 与 `audio` | `container: 'mp4'`，NAS 合并并输出 MP4 |

只把实测或协议明确提供的文件大小、清晰度等数据填入 `meta`；未知值省略。页面标题可作为建议文件名，但不得伪造媒体属性。`Resource.headers` 仅携带站点所需、服务端允许的请求头；Cookie 按站点作用域传递，禁止跨源重定向转发凭据。扩展不得记录凭据。

## 当前实现边界

- 本地版本已有浏览器侧媒体发现、分片隐藏、URL 去重、页面标签隔离及手动重扫。
- 本地请求头收集现已限制在有时效和容量上限的 service worker 内存中，不进入标签页媒体存储或 popup 数据。
- MBP1 配对、MDXP transport/schema 校验、实际任务提交和状态订阅尚未接入。因此当前不能报告已连接、不能发送任务，也不能称作可下载的 1.0.0。
- 群晖最终 MP4 的编码选择、校验和临时文件清理属于 Motrix-SPK；Extension 只提交规范化的视频来源和 MP4 容器要求。
