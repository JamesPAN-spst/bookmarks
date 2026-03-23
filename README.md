# Cyberspace Bookmarks

## 部署步骤（只需做一次）

### 1. 创建 GitHub 仓库
在 GitHub 上新建一个仓库，比如叫 `bookmarks`

### 2. 修改 base path
打开 `vite.config.js`，把 `base` 改成你的仓库名：
```js
base: '/bookmarks/',  // ← 你的仓库名
```

### 3. 推送代码
```bash
cd bookmarks-app
npm install
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/bookmarks.git
git push -u origin main
```

### 4. 开启 GitHub Pages
进入仓库 → Settings → Pages → Source 选择 **GitHub Actions**

### 5. 完成
等 1-2 分钟，GitHub Actions 会自动构建并部署。
访问 `https://你的用户名.github.io/bookmarks/`

---

之后每次修改代码，只需 `git push`，GitHub 会自动重新构建部署。
