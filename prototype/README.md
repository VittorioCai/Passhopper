# 可点击原型

- `prototype.html`：原型源文件（发布为 Claude Artifact 时使用，没有 `<html>` 外壳）
- `index.html`：由 `prototype.html` 加上 HTML 外壳生成，可直接用浏览器打开

原型中的车次、价格、规则都是示例数据。旅行日和回本的计算由简化版规则引擎实时完成（对应 `docs/DEVELOPMENT.md` §3）。
