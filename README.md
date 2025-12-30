# 2026 新年烟花 - 实时同步版本

一个迎接 2026 年的烟花应用，支持多用户实时同步烟花文字，数据持久化存储。

## 功能特点

- 🎆 背景自动播放彩色烟花
- 📊 实时倒计时到 2026 年
- 💬 输入文字发射烟花，绽放出文字（最多 10 个字）
- 🌐 多用户实时同步：A 用户输入的文字，B 用户也能看到
- 💾 数据持久化：烟花数据保存到数据库，服务器重启后仍然保留
- 🔄 历史回放：连接时自动播放最近 50 条烟花记录
- 📱 完美适配手机端和桌面端
- ✨ 精美的视觉效果和动画

## 本地运行

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173

### 生产部署

```bash
# 1. 构建前端项目
npm run build

# 2. 将 dist 目录上传到服务器
# 使用 scp 或其他方式上传

# 3. 在服务器上启动后端服务
pm2 start server.js --name fireworks-backend
```

## 服务器部署指南（前后端分离）

### 架构说明

本项目采用前后端分离架构：

- **前端**：Vue3 打包成静态文件，由 Nginx 托管
- **后端**：Node.js + Socket.io，提供 API 和 WebSocket 服务
- **数据库**：SQLite，存储烟花数据

### 前置要求

- 一台 Linux 服务器（推荐 Ubuntu 20.04+ 或 CentOS 7+）
- Node.js 16+ 版本
- Nginx Web 服务器
- npm 或 yarn 包管理器
- 服务器 root 权限或 sudo 权限

### 部署步骤

#### 1. 在服务器上安装 Node.js

**Ubuntu/Debian:**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL:**

```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

验证安装：

```bash
node -v
npm -v
```

#### 2. 安装 Nginx

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install nginx -y
```

**CentOS/RHEL:**

```bash
sudo yum install nginx -y
```

#### 3. 克隆项目代码

```bash
cd /var/www
git clone <你的项目仓库地址> fireworks-2026
cd fireworks-2026
```

如果没有 Git 仓库，可以直接上传项目文件：

```bash
mkdir -p /var/www/fireworks-2026
cd /var/www/fireworks-2026
# 使用 scp 或 ftp 上传项目文件
```

#### 4. 安装项目依赖

```bash
npm install
```

#### 5. 构建前端项目

```bash
npm run build
```

构建完成后，`dist` 目录包含所有前端静态文件。

#### 6. 配置 Nginx

复制项目中的 Nginx 配置文件：

```bash
sudo cp nginx.conf /etc/nginx/sites-available/fireworks-2026
```

编辑配置文件，修改域名和路径：

```bash
sudo nano /etc/nginx/sites-available/fireworks-2026
```

修改以下内容：

- `server_name` 改为你的域名
- 确认 `root` 路径正确（`/var/www/fireworks-2026/dist`）

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/fireworks-2026 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. 启动后端服务

使用 PM2 保持服务运行：

```bash
# 全局安装 PM2
npm install -g pm2

# 启动后端服务
pm2 start server.js --name fireworks-backend

# 查看应用状态
pm2 status

# 查看日志
pm2 logs fireworks-backend

# 设置开机自启
pm2 startup
pm2 save
```

#### 8. 配置防火墙

开放 HTTP 和 HTTPS 端口：

**Ubuntu/Debian (UFW):**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

**CentOS/RHEL (firewalld):**

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**云服务器安全组:**
如果你使用的是阿里云、腾讯云、AWS 等云服务器，需要在控制台的安全组中开放 80 和 443 端口。

### 配置 HTTPS（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书并自动配置 Nginx
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 更新部署

当需要更新代码时：

```bash
cd /var/www/fireworks-2026
git pull  # 或上传新文件
npm install
npm run build
pm2 restart fireworks-backend
```

### 方法二：使用 Docker 部署

#### 1. 创建后端 Dockerfile

在项目根目录创建 `Dockerfile.backend`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 2. 构建和运行后端容器

```bash
# 构建后端镜像
docker build -f Dockerfile.backend -t fireworks-backend .

# 运行后端容器
docker run -d -p 3000:3000 --name fireworks-backend fireworks-backend

# 查看日志
docker logs fireworks-backend
```

#### 3. 配置 Nginx

前端使用 Nginx 托管，后端使用 Docker 容器，Nginx 配置与上述相同。

## 使用说明

1. 打开浏览器访问应用地址
2. 在底部输入框输入文字（最多 10 个字）
3. 按回车键发射烟花
4. 烟花升空后会绽放出你输入的文字
5. 所有连接的用户都能看到彼此发送的烟花文字
6. 连接时会自动播放历史烟花记录
7. 每隔 10-30 秒会随机播放一条历史烟花

## 技术栈

- Vue 3
- Vite
- Socket.io (WebSocket 实时通信)
- Express (后端服务器)
- SQLite (数据持久化)
- Canvas API (烟花动画)

## 端口配置

- **前端**：由 Nginx 托管，默认使用 80（HTTP）和 443（HTTPS）端口
- **后端**：Node.js 服务器，默认使用 3000 端口（仅内部通信）

后端端口可以通过环境变量修改：

```bash
PORT=8080 npm run server
```

或在 PM2 配置中使用：

```bash
pm2 start server.js --name fireworks-backend -- --port 8080
```

注意：如果修改了后端端口，需要同步更新 Nginx 配置中的 `proxy_pass` 地址。

## 数据存储

烟花数据存储在 `fireworks.db` SQLite 数据库文件中，包含：

- 文字内容
- 烟花位置
- 颜色
- 创建时间

数据库文件位于项目根目录，请定期备份。

## 注意事项

- 前端静态文件由 Nginx 托管，确保 Nginx 配置正确
- 后端 Node.js 服务器运行在 3000 端口（仅内部通信）
- 确保服务器防火墙允许 80 和 443 端口的访问
- 如果使用云服务器，需要在安全组中开放 80 和 443 端口
- 建议使用 PM2 等进程管理工具保持后端服务稳定运行
- 定期备份数据库文件 `fireworks.db`
- 建议配置 HTTPS 以保证数据传输安全
- 注意监控服务器资源使用情况
- WebSocket 连接通过 Nginx 代理，确保配置正确

## 故障排查

### 前端无法访问

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 检查配置文件语法
sudo nginx -t
```

### 后端无法启动

```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 查看 PM2 日志
pm2 logs fireworks-backend --err

# 重启后端服务
pm2 restart fireworks-backend
```

### WebSocket 连接失败

- 检查 Nginx 配置中的 `/socket.io/` 路径是否正确
- 确认后端服务正常运行（`pm2 status`）
- 检查浏览器控制台错误信息
- 确认防火墙设置正确

### 数据库问题

- 确保 `fireworks.db` 文件有读写权限
- 检查数据库文件是否损坏
- 查看后端日志获取详细错误信息

## 性能优化建议

- 使用 CDN 加速静态资源
- 启用 Nginx gzip 压缩
- 定期清理旧的数据库记录
- 监控服务器资源使用情况
