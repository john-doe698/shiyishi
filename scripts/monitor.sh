#!/bin/bash
# 服务监控脚本 - 自动重启崩溃的服务

LOG_FILE="/app/work/logs/bypass/monitor.log"
SERVICE_NAME="next-dev"
PORT=5000

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service() {
    if curl -sf http://localhost:$PORT > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

restart_service() {
    log "服务未响应，准备重启..."
    cd ${COZE_WORKSPACE_PATH}
    
    # 杀死旧进程
    pkill -f "$SERVICE_NAME"
    sleep 2
    
    # 清理缓存（可选）
    rm -rf .next/.turbo
    
    # 重启服务
    log "启动服务..."
    nohup coze dev > /app/work/logs/bypass/dev.log 2>&1 &
    
    sleep 10
    
    if check_service; then
        log "服务重启成功"
    else
        log "服务重启失败"
    fi
}

# 主循环
while true; do
    if ! check_service; then
        log "检测到服务异常"
        restart_service
    fi
    sleep 60
done
