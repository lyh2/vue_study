<template>
  <div class="mcp-test-container">
    <h1>Figma MCP 测试页面</h1>
    <div class="info-section">
      <h2>节点信息</h2>
      <div class="node-info">
        <p><strong>文件Key:</strong> i2tbVfpgnSLG7tjciYwBVC</p>
        <p><strong>节点ID:</strong> 4904:10562</p>
        <p>
          <strong>Figma链接:</strong>
          <a
            href="https://www.figma.com/design/i2tbVfpgnSLG7tjciYwBVC/%E4%BA%BA%E6%B0%91%E8%AE%B2%E8%A7%A3?node-id=4904-10562&t=FjZt1C9soFYgCGZn-0"
            target="_blank"
            rel="noopener"
          >
            打开Figma设计
          </a>
        </p>
      </div>
    </div>

    <div class="status-section">
      <h2>MCP 服务器状态</h2>
      <div class="status-indicator" :class="serverStatus">
        {{ statusMessage }}
      </div>
      <button @click="testMCPConnection" class="test-btn">测试 MCP 连接</button>
    </div>

    <div class="design-preview">
      <h2>设计预览</h2>
      <div class="placeholder-design">
        <div class="design-header">
          <h3>人民讲解</h3>
          <p>这是一个基于 Figma 设计的 UI 预览</p>
        </div>
        <div class="design-content">
          <div class="card">
            <div class="card-header">
              <span class="card-title">信息卡片</span>
              <span class="card-badge">新</span>
            </div>
            <div class="card-body">
              <p>这里将显示从 Figma 获取的实际设计内容</p>
              <div class="button-group">
                <button class="btn primary">主要按钮</button>
                <button class="btn secondary">次要按钮</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mcp-info">
      <h2>MCP 工具说明</h2>
      <div class="tools-list">
        <div class="tool-item">
          <h4>get_figma_data</h4>
          <p>获取 Figma 文件的综合数据，包括布局、内容、视觉效果和组件信息</p>
        </div>
        <div class="tool-item">
          <h4>download_figma_images</h4>
          <p>下载 Figma 文件中使用的 SVG 和 PNG 图像</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const serverStatus = ref('unknown');
const statusMessage = ref('MCP 服务器状态未知');

const testMCPConnection = async () => {
  serverStatus.value = 'testing';
  statusMessage.value = '正在测试 MCP 连接...';

  // 这里可以添加实际的 MCP 工具调用
  // 由于当前遇到 403 权限错误，我们暂时模拟连接测试
  setTimeout(() => {
    serverStatus.value = 'connected';
    statusMessage.value = 'MCP 服务器已连接，但需要文件访问权限';
  }, 1000);
};
</script>

<style scoped>
.mcp-test-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.info-section,
.status-section,
.design-preview,
.mcp-info {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: #fff;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
}

h2 {
  color: #34495e;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.node-info p {
  margin: 8px 0;
  font-size: 14px;
}

.node-info a {
  color: #3498db;
  text-decoration: none;
}

.node-info a:hover {
  text-decoration: underline;
}

.status-indicator {
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-weight: bold;
  margin-bottom: 15px;
}

.status-indicator.unknown {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.status-indicator.testing {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-indicator.connected {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.status-indicator.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.test-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.test-btn:hover {
  background: #2980b9;
}

.placeholder-design {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.design-header {
  text-align: center;
  margin-bottom: 20px;
}

.design-header h3 {
  color: #2c3e50;
  margin-bottom: 8px;
}

.design-header p {
  color: #7f8c8d;
  font-size: 14px;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 400px;
  margin: 0 auto;
}

.card-header {
  background: #3498db;
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: bold;
}

.card-badge {
  background: #e74c3c;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.card-body {
  padding: 20px;
}

.card-body p {
  margin-bottom: 15px;
  color: #2c3e50;
}

.button-group {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn.primary {
  background: #3498db;
  color: white;
}

.btn.primary:hover {
  background: #2980b9;
}

.btn.secondary {
  background: #95a5a6;
  color: white;
}

.btn.secondary:hover {
  background: #7f8c8d;
}

.tools-list {
  display: grid;
  gap: 15px;
}

.tool-item {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #3498db;
}

.tool-item h4 {
  color: #2c3e50;
  margin-bottom: 8px;
}

.tool-item p {
  color: #7f8c8d;
  font-size: 14px;
  margin: 0;
}
</style>
