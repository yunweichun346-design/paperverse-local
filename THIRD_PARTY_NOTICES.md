# 第三方软件与素材声明

核对日期：2026-10-26。自有原创代码采用根目录 LICENSE 的 MIT 许可。MIT 仅适用于项目方有权授权的原创代码，不改变第三方库、字体、图标、模板、图片、商标或用户文献的权利与许可。

## 随包PDF引擎与字体

- Mozilla PDF.js 5.6.205：Apache-2.0。原文在 [许可证.txt](网页应用/public/阅读引擎/许可证.txt)。核心/worker使用中文文件名，保留上游版权头；public和dist保留同一许可文件。Apache-2.0要求保留适用声明，若上游提供NOTICE也须保留适用内容；不能简单用本项目MIT替换。
- Foxit标准字体：随PDF.js分发的PDFium声明，BSD三条款形式。见 [LICENSE_FOXIT](网页应用/public/阅读引擎/standard_fonts/LICENSE_FOXIT)。不将其他Foxit产品概括为相同许可。
- Liberation：SIL Open Font License 1.1，保留字体名限制与原始版权。见 [LICENSE_LIBERATION](网页应用/public/阅读引擎/standard_fonts/LICENSE_LIBERATION)。不对字体重授MIT。
- CMaps：[原始许可](网页应用/public/阅读引擎/cmaps/LICENSE)。WASM及其依赖：保留[wasm目录](网页应用/public/阅读引擎/wasm)全部LICENSE文件，包括JBIG2、OpenJPEG、QCMS及PDF.js包装层各自声明。

## 本轮新增离线依据（2026-10-26）

- [GSAP当前官方条款与版本适用限制](第三方许可/GSAP/留档说明.md)：已保存产品条款全文、第9节完整正文与服务条款原始网页文本；不能据此虚构3.15.0发布时历史授权已核实。
- [react-remove-scroll-bar 2.3.8许可原文](第三方许可/前端/react-remove-scroll-bar/LICENSE_原文.txt)：来自上游插件按该版本命名的许可附件，已与当前官方仓库原文比对。
- [模板与图标授权来源记录](第三方许可/模板与图标授权来源记录.md)：原71个同源SVG已全部替换为Lucide；剩余21个派生代码/样式文件的公开再分发授权仍待核实。

## Lucide静态图标 1.61.0

71个SVG直接取自lucide-static@1.61.0固定版本，保留原文件名与组件调用；未增加运行时依赖。许可为ISC，完整声明另含Feather衍生部分的MIT条款，均保存在[完整许可](第三方许可/Lucide/LICENSE_原文.txt)。参见[版本与完整性记录](第三方许可/Lucide/来源与版本.json)、[替换映射表](图标替换映射表.csv)及[官方许可](https://lucide.dev/license)。品牌命名文件使用通用功能图形，不表示Lucide提供对应品牌商标。

## GSAP 3.15.0

不是MIT。安装包package.json标注Standard “no charge” license，版权归GreenSock/Webflow；本项目只使用其动画能力，没有提供无代码动画编辑器。

- [包内原始声明](第三方许可/GSAP_上游声明.txt)
- [包声明指向的许可地址](https://gsap.com/standard-license)
- [Webflow当前条款第9节](https://webflow.com/legal/product-terms)

本次访问GSAP标准许可地址被转到论坛暂时离线页，未将该页面当许可正文。已核对Webflow官方第9节；它允许在限定用途下使用，并限制竞争性无代码动画构建工具及移除权利声明。免费不等于MIT，当前在线条款也不应冒充特定旧版本随包的完整历史许可。正式发布前应保留适用于所用版本的完整许可依据。

## 区域影像

NASA Earth Observatory image by Michala Garrison, using Landsat data from the U.S. Geological Survey.

出处、处理方式、原图与展示图说明见[影像来源](网页应用/public/影像/影像来源.md)。不对NASA/USGS素材重授MIT，不使用其标志表示背书；素材的使用依据与软件许可分开判断。

## 前端和Python依赖逐项记录

以下基于实际锁定版本与已安装包元数据，附可取得的原始LICENSE/NOTICE。Python仅安装时引入，不将本机虚拟环境入包。构建工具Vite等不作为运行库分发，其安装包仍应保留各自声明。依赖名称、版本及完整元数据另见[机器可读清单](第三方许可/依赖许可清单.json)。许可表达式缺失不能推断为MIT。

| 依赖 | 版本 | 包内许可声明 | 保留原文 |
|---|---|---|---|
| @floating-ui/core | 1.8.0 | MIT | [LICENSE_原文.txt](第三方许可/前端/floating-ui_core/LICENSE_原文.txt) |
| @floating-ui/dom | 1.8.0 | MIT | [LICENSE_原文.txt](第三方许可/前端/floating-ui_dom/LICENSE_原文.txt) |
| @floating-ui/react-dom | 2.1.9 | MIT | [LICENSE_原文.txt](第三方许可/前端/floating-ui_react-dom/LICENSE_原文.txt) |
| @floating-ui/utils | 0.2.12 | MIT | [LICENSE_原文.txt](第三方许可/前端/floating-ui_utils/LICENSE_原文.txt) |
| @radix-ui/primitive | 1.1.7 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_primitive/LICENSE_原文.txt) |
| @radix-ui/react-arrow | 1.1.14 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-arrow/LICENSE_原文.txt) |
| @radix-ui/react-collection | 1.1.14 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-collection/LICENSE_原文.txt) |
| @radix-ui/react-compose-refs | 1.1.4 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-compose-refs/LICENSE_原文.txt) |
| @radix-ui/react-context | 1.2.1 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-context/LICENSE_原文.txt) |
| @radix-ui/react-dialog | 1.1.22 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-dialog/LICENSE_原文.txt) |
| @radix-ui/react-direction | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-direction/LICENSE_原文.txt) |
| @radix-ui/react-dismissable-layer | 1.1.18 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-dismissable-layer/LICENSE_原文.txt) |
| @radix-ui/react-dropdown-menu | 2.1.23 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-dropdown-menu/LICENSE_原文.txt) |
| @radix-ui/react-focus-guards | 1.1.5 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-focus-guards/LICENSE_原文.txt) |
| @radix-ui/react-focus-scope | 1.1.15 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-focus-scope/LICENSE_原文.txt) |
| @radix-ui/react-id | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-id/LICENSE_原文.txt) |
| @radix-ui/react-menu | 2.1.23 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-menu/LICENSE_原文.txt) |
| @radix-ui/react-popper | 1.3.6 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-popper/LICENSE_原文.txt) |
| @radix-ui/react-portal | 1.1.16 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-portal/LICENSE_原文.txt) |
| @radix-ui/react-presence | 1.1.9 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-presence/LICENSE_原文.txt) |
| @radix-ui/react-primitive | 2.1.9 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-primitive/LICENSE_原文.txt) |
| @radix-ui/react-roving-focus | 1.1.18 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-roving-focus/LICENSE_原文.txt) |
| @radix-ui/react-slot | 1.3.2 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-slot/LICENSE_原文.txt) |
| @radix-ui/react-use-callback-ref | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-use-callback-ref/LICENSE_原文.txt) |
| @radix-ui/react-use-controllable-state | 1.2.5 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-use-controllable-state/LICENSE_原文.txt) |
| @radix-ui/react-use-effect-event | 0.0.4 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-use-effect-event/LICENSE_原文.txt) |
| @radix-ui/react-use-is-hydrated | 0.1.2 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-use-is-hydrated/LICENSE_原文.txt) |
| @radix-ui/react-use-layout-effect | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-use-layout-effect/LICENSE_原文.txt) |
| @radix-ui/react-use-rect | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-use-rect/LICENSE_原文.txt) |
| @radix-ui/react-use-size | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_react-use-size/LICENSE_原文.txt) |
| @radix-ui/rect | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/radix-ui_rect/LICENSE_原文.txt) |
| aria-hidden | 1.2.6 | MIT | [LICENSE_原文.txt](第三方许可/前端/aria-hidden/LICENSE_原文.txt) |
| detect-node-es | 1.1.0 | MIT | [LICENSE_原文.txt](第三方许可/前端/detect-node-es/LICENSE_原文.txt) |
| get-nonce | 1.0.1 | MIT | [LICENSE_原文.txt](第三方许可/前端/get-nonce/LICENSE_原文.txt) |
| gsap | 3.15.0 | Standard 'no charge' license: https://gsap.com/standard-license. | [GSAP_上游声明.txt](第三方许可/GSAP_上游声明.txt) |
| lenis | 1.3.27 | MIT | [LICENSE_原文.txt](第三方许可/前端/lenis/LICENSE_原文.txt) |
| react | 19.2.8 | MIT | [LICENSE_原文.txt](第三方许可/前端/react/LICENSE_原文.txt) |
| react-dom | 19.2.8 | MIT | [LICENSE_原文.txt](第三方许可/前端/react-dom/LICENSE_原文.txt) |
| react-remove-scroll | 2.7.2 | MIT | [LICENSE_原文.txt](第三方许可/前端/react-remove-scroll/LICENSE_原文.txt) |
| react-remove-scroll-bar | 2.3.8 | MIT | [LICENSE原文](第三方许可/前端/react-remove-scroll-bar/LICENSE_原文.txt) |
| react-style-singleton | 2.2.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/react-style-singleton/LICENSE_原文.txt) |
| scheduler | 0.27.0 | MIT | [LICENSE_原文.txt](第三方许可/前端/scheduler/LICENSE_原文.txt) |
| tslib | 2.8.1 | 0BSD | [LICENSE.txt_原文.txt](第三方许可/前端/tslib/LICENSE.txt_原文.txt) |
| use-callback-ref | 1.3.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/use-callback-ref/LICENSE_原文.txt) |
| use-sidecar | 1.1.3 | MIT | [LICENSE_原文.txt](第三方许可/前端/use-sidecar/LICENSE_原文.txt) |
| annotated-types | 0.8.0 | MIT | [LICENSE_原文.txt](第三方许可/Python/annotated-types/LICENSE_原文.txt) |
| anyio | 4.15.1 | MIT | [LICENSE_原文.txt](第三方许可/Python/anyio/LICENSE_原文.txt) |
| attrs | 26.1.0 | MIT | [LICENSE_原文.txt](第三方许可/Python/attrs/LICENSE_原文.txt) |
| cffi | 2.1.1 | MIT-0 | [LICENSE_原文.txt](第三方许可/Python/cffi/LICENSE_原文.txt) |
| click | 8.5.0 | BSD-3-Clause | [LICENSE.txt_原文.txt](第三方许可/Python/click/LICENSE.txt_原文.txt) |
| cryptography | 50.0.2 | Apache-2.0 OR BSD-3-Clause | [LICENSE_原文.txt](第三方许可/Python/cryptography/LICENSE_原文.txt); [LICENSE.APACHE_原文.txt](第三方许可/Python/cryptography/LICENSE.APACHE_原文.txt); [LICENSE.BSD_原文.txt](第三方许可/Python/cryptography/LICENSE.BSD_原文.txt) |
| h11 | 0.16.0 | MIT | [LICENSE.txt_原文.txt](第三方许可/Python/h11/LICENSE.txt_原文.txt) |
| httpcore2 | 2.16.0 | BSD-3-Clause | [LICENSE.md_原文.txt](第三方许可/Python/httpcore2/LICENSE.md_原文.txt) |
| httpx2 | 2.16.0 | BSD-3-Clause | [LICENSE.md_原文.txt](第三方许可/Python/httpx2/LICENSE.md_原文.txt) |
| idna | 3.20 | BSD-3-Clause | [LICENSE.md_原文.txt](第三方许可/Python/idna/LICENSE.md_原文.txt) |
| jsonschema | 4.26.0 | MIT | [COPYING_原文.txt](第三方许可/Python/jsonschema/COPYING_原文.txt) |
| jsonschema-specifications | 2025.9.1 | MIT | [COPYING_原文.txt](第三方许可/Python/jsonschema-specifications/COPYING_原文.txt) |
| mcp | 2.3.0 | MIT | [LICENSE_原文.txt](第三方许可/Python/mcp/LICENSE_原文.txt) |
| mcp-types | 2.3.0 | MIT | [LICENSE_原文.txt](第三方许可/Python/mcp-types/LICENSE_原文.txt) |
| opentelemetry-api | 1.45.1 | Apache-2.0 | [LICENSE_原文.txt](第三方许可/Python/opentelemetry-api/LICENSE_原文.txt) |
| pycparser | 3.12 | BSD-3-Clause | [LICENSE_原文.txt](第三方许可/Python/pycparser/LICENSE_原文.txt) |
| pydantic | 2.14.1 | MIT | [LICENSE_原文.txt](第三方许可/Python/pydantic/LICENSE_原文.txt) |
| pydantic_core | 2.50.1 | MIT | [LICENSE_原文.txt](第三方许可/Python/pydantic_core/LICENSE_原文.txt) |
| PyJWT | 2.15.1 | MIT | [LICENSE_原文.txt](第三方许可/Python/PyJWT/LICENSE_原文.txt) |
| pypdf | 6.21.2 | BSD-3-Clause | [LICENSE_原文.txt](第三方许可/Python/pypdf/LICENSE_原文.txt) |
| python-multipart | 0.0.32 | Apache-2.0 | [LICENSE.txt_原文.txt](第三方许可/Python/python-multipart/LICENSE.txt_原文.txt) |
| pywin32 | 312 | PSF | [license.txt_原文.txt](第三方许可/Python/pywin32/license.txt_原文.txt); [License.txt_原文.txt](第三方许可/Python/pywin32/License.txt_原文.txt); [LICENSE_原文.txt](第三方许可/Python/pywin32/LICENSE_原文.txt); [License.txt_原文.txt](第三方许可/Python/pywin32/License.txt_原文.txt); [License.txt_原文.txt](第三方许可/Python/pywin32/License.txt_原文.txt); [LICENSE.txt_原文.txt](第三方许可/Python/pywin32/LICENSE.txt_原文.txt); [License.txt_原文.txt](第三方许可/Python/pywin32/License.txt_原文.txt) |
| referencing | 0.37.0 | MIT | [COPYING_原文.txt](第三方许可/Python/referencing/COPYING_原文.txt) |
| rpds-py | 2026.9.1 | MIT | [LICENSE_原文.txt](第三方许可/Python/rpds-py/LICENSE_原文.txt) |
| sse-starlette | 3.5.1 | BSD-3-Clause | [LICENSE_原文.txt](第三方许可/Python/sse-starlette/LICENSE_原文.txt) |
| starlette | 1.10.0 | BSD-3-Clause | [LICENSE.md_原文.txt](第三方许可/Python/starlette/LICENSE.md_原文.txt) |
| truststore | 0.10.5 | MIT | [LICENSE_原文.txt](第三方许可/Python/truststore/LICENSE_原文.txt) |
| typing-inspection | 0.4.4 | MIT | [LICENSE_原文.txt](第三方许可/Python/typing-inspection/LICENSE_原文.txt) |
| typing_extensions | 4.16.0 | PSF-2.0 | [LICENSE_原文.txt](第三方许可/Python/typing_extensions/LICENSE_原文.txt) |
| uvicorn | 0.54.0 | BSD-3-Clause | [LICENSE.md_原文.txt](第三方许可/Python/uvicorn/LICENSE.md_原文.txt) |

## 发布前保留事项

本清单是代码与本地包的技术核对，不是对全部来源的法律确权。既有界面模板代码的上游授权记录尚需核实；71个旧模板图标已移除；不能因为复制进本项目而自动成为MIT。保留已有标识与版权，未明来源不要擅自改署名。PRIVACY.md已按项目方提供的v1.0及其确认的事实校订纳入包；尚未上传GitHub。

参考：[MIT标准文本](https://opensource.org/license/mit)、[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)、[GNU FAQ](https://www.gnu.org/licenses/gpl-faq.html)。AGPL允许商业使用，但修改版本的网络交互可能触发源码提供义务；不是“禁止商业使用”许可证。
