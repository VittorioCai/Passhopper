# 可点击原型

界面默认英文，右上角的"中文"按钮或设置里的"Language"可以切换到简体中文。选择会记在浏览器里。

- `prototype.html`：原型源文件（发布为 Claude Artifact 时使用，没有 `<html>` 外壳）
- `index.html`：由 `prototype.html` 加上 HTML 外壳生成，可直接用浏览器打开

原型中的车次、价格、规则都是示例数据。旅行日和回本的计算由简化版规则引擎实时完成（对应 `docs/DEVELOPMENT.md` §3）。

## 第三方图标

原型里用于对比的两套图标：

- [Phosphor Icons](https://phosphoricons.com)（MIT 许可证）
- [Remix Icon](https://remixicon.com)（Remix Icon License v1.0：可在应用中免费使用，不能把图标单独打包出售，也不能用作产品标志）

正式版只保留选定的一套。
