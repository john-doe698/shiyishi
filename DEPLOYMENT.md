# 教学管理系统 - 24小时运行指南

## 问题分析

当前系统无法24小时稳定访问，主要原因如下：

### 1. 开发环境不稳定性
- 使用 `pnpm dev` 开发模式，依赖热更新和 Turbopack
- Turbopack 缓存数据库容易损坏
- 长时间运行会导致内存泄漏和性能下降

### 2. 缺少进程监控
- 服务崩溃后无法自动重启
- 需要手动检查和恢复

### 3. 沙箱环境限制
- 当前运行在开发沙箱中，不适合生产环境
- 网络连接和资源有限

## 解决方案

### 方案一：部署到 Vercel（推荐）✅

**优势**：
- ✅ 自动扩缩容，支持24小时高可用
- ✅ 全球 CDN 加速
- ✅ 自动故障恢复
- ✅ 免费版足够小型系统使用
- ✅ 持续部署，代码更新自动发布

**步骤**：

1. **访问 Vercel 并部署**
   ```
   https://vercel.com
   → New Project
   → Import Git Repository: john-doe698/shiyishi
   → Configure
   ```

2. **配置环境变量**
   ```
   COZE_SUPABASE_URL=https://br-handy-tern-8a6570b9.supabase2.aidap-global.cn-beijing.volces.com
   COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **部署**
   - 点击 Deploy
   - 等待2-3分钟
   - 获得 `xxx.vercel.app` 域名

**Vercel 免费版限制**：
- 带宽：100GB/月
- 构建时间：6000分钟/月
- Serverless Function：100GB-Hrs/月
- 适合小型教学管理系统使用

### 方案二：使用 PM2 管理进程（本地/服务器）

如果需要在本地服务器运行，使用 PM2 进程管理器：

```bash
# 安装 PM2
pnpm add -g pm2

# 创建 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'jiaoxue-system',
    script: 'pnpm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs

# 监控状态
pm2 monit
```

### 方案三：使用 Docker 容器化部署

**Dockerfile**：
```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 5000

CMD ["pnpm", "start"]
```

**docker-compose.yml**：
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - COZE_SUPABASE_URL=${COZE_SUPABASE_URL}
      - COZE_SUPABASE_ANON_KEY=${COZE_SUPABASE_ANON_KEY}
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**启动**：
```bash
docker-compose up -d
```

### 方案四：使用 systemd（Linux 服务器）

创建服务文件 `/etc/systemd/system/jiaoxue-system.service`：

```ini
[Unit]
Description=Teaching Management System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/project
Environment="NODE_ENV=production"
Environment="PORT=5000"
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable jiaoxue-system
sudo systemctl start jiaoxue-system
sudo systemctl status jiaoxue-system
```

## 临时修复方案（当前环境）

如果继续使用沙箱环境，需要定期重启服务：

### 自动监控脚本
```bash
# 启动监控
nohup bash /workspace/projects/scripts/monitor.sh > /app/work/logs/bypass/monitor.log 2>&1 &
```

### 定时清理缓存（每天凌晨3点）
```bash
# 添加 crontab
crontab -e
0 3 * * * cd /workspace/projects && rm -rf .next/.turbo && coze dev > /app/work/logs/bypass/dev.log 2>&1 &
```

## 推荐方案对比

| 方案 | 稳定性 | 成本 | 难度 | 推荐指数 |
|------|--------|------|------|----------|
| Vercel | ⭐⭐⭐⭐⭐ | 免费 | 低 | ⭐⭐⭐⭐⭐ |
| PM2 | ⭐⭐⭐⭐ | 免费 | 中 | ⭐⭐⭐⭐ |
| Docker | ⭐⭐⭐⭐⭐ | 服务器成本 | 高 | ⭐⭐⭐ |
| systemd | ⭐⭐⭐⭐ | 免费 | 中 | ⭐⭐⭐⭐ |
| 当前沙箱 | ⭐⭐ | 免费 | 低 | ⭐⭐ |

## 注意事项

1. **数据库连接**：确保 Supabase 项目已启用持续连接
2. **环境变量**：生产环境必须配置所有必要的环境变量
3. **日志监控**：设置日志收集和告警
4. **备份策略**：定期备份数据库
5. **HTTPS**：生产环境必须使用 HTTPS

## 下一步行动

1. ✅ 部署到 Vercel（推荐）
2. 配置自定义域名
3. 设置监控告警
4. 定期检查运行状态
