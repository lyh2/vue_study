<template>
  <div class="pixel-container">
    <div class="header">
      <h1>图片像素化工具</h1>
      <p>使用 pixelit.js 实现图片像素化效果</p>
    </div>

    <!-- 选择图片按钮 -->
    <div class="select-image-section">
      <button class="big-select-btn" @click="triggerFileInput">
        <span class="btn-icon">📁</span>
        选择图片
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleImageUpload"
        class="file-input"
        style="display: flex"
      />
      <div v-if="currentImage" class="image-info">当前图片: {{ currentImage.name }}</div>
    </div>

    <div class="controls">
      <div class="settings">
        <div class="setting-group">
          <label for="scale">像素化程度:</label>
          <input
            id="scale"
            type="range"
            min="1"
            max="20"
            v-model="scale"
            @input="updatePixelArt"
            class="slider"
          />
          <span>{{ scale }}</span>
        </div>

        <div class="setting-group">
          <label for="grayscale">灰度模式:</label>
          <input
            id="grayscale"
            type="checkbox"
            v-model="grayscale"
            @change="updatePixelArt"
            class="checkbox"
          />
        </div>

        <div class="setting-group">
          <label for="palette">使用调色板:</label>
          <input
            id="palette"
            type="checkbox"
            v-model="usePalette"
            @change="updatePixelArt"
            class="checkbox"
          />
        </div>

        <button @click="resetImage" class="reset-btn">重置图片</button>
        <button @click="downloadImage" class="download-btn" :disabled="!currentImage">
          下载像素化图片
        </button>
      </div>
    </div>

    <!-- 图片对比区域 -->
    <div class="preview-section">
      <div class="preview-container">
        <div class="preview-item">
          <h3>原始图片</h3>
          <div class="image-wrapper">
            <img
              v-if="imageUrl"
              :src="imageUrl"
              alt="原始图片"
              ref="sourceImage"
              class="preview-image"
              @load="initPixelit"
            />
            <div v-else class="placeholder">
              <p>请选择一张图片</p>
            </div>
          </div>
        </div>

        <div class="preview-item">
          <h3>像素化效果</h3>
          <div class="image-wrapper">
            <canvas
              ref="pixelCanvas"
              class="preview-canvas"
              :style="{ display: currentImage ? 'block' : 'none' }"
            ></canvas>
            <div v-if="!currentImage" class="placeholder">
              <p>像素化效果将显示在这里</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h3>关于 pixelit.js</h3>
      <p>
        pixelit.js 是一个轻量级的 JavaScript 库，可以将图片转换为像素艺术风格。
        支持自定义调色板、灰度转换和像素化程度调整。
      </p>
    </div>
  </div>
</template>

<script setup lang="js">
import { ref, onUnmounted } from 'vue';
import pixelit from '@/utils/pixelit.js/pixelit.js';

// 响应式数据
const imageUrl = ref('');
const currentImage = ref(null);
const scale = ref(8);
const grayscale = ref(false);
const usePalette = ref(true);

// DOM 引用
const sourceImage = ref(null);
const pixelCanvas = ref(null);
const fileInput = ref(null);

// pixelit 实例
let pixelitInstance = null;

// 触发文件选择
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// 初始化 pixelit
const initPixelit = () => {
  if (!sourceImage.value || !pixelCanvas.value) return;

  pixelitInstance = new pixelit({
    from: sourceImage.value,
    to: pixelCanvas.value,
    scale: scale.value,
    palette: [
      [140, 143, 174],
      [88, 69, 99],
      [62, 33, 55],
      [154, 99, 72],
      [215, 155, 125],
      [245, 237, 186],
      [192, 199, 65],
      [100, 125, 52],
      [228, 148, 58],
      [157, 48, 59],
      [210, 100, 113],
      [112, 55, 127],
      [126, 196, 193],
      [52, 133, 157],
      [23, 67, 75],
      [31, 14, 28],
    ],
  });

  updatePixelArt();
};

// 处理图片上传
const handleImageUpload = event => {
  const target = event.target;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  currentImage.value = file;

  // 创建临时 URL
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  imageUrl.value = URL.createObjectURL(file);
};

// 更新像素化效果
const updatePixelArt = () => {
  if (!pixelitInstance) return;

  pixelitInstance.setScale(scale.value).pixelate();

  if (grayscale.value) {
    pixelitInstance.convertGrayscale();
  }

  if (usePalette.value) {
    pixelitInstance.convertPalette();
  }
};

// 重置图片
const resetImage = () => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  imageUrl.value = '';
  currentImage.value = null;
  scale.value = 8;
  grayscale.value = false;
  usePalette.value = true;
};

// 下载图片
const downloadImage = () => {
  if (!pixelitInstance || !currentImage.value) return;

  pixelitInstance.saveImage();
};

// 组件卸载时清理
onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
});
</script>

<style scoped>
.pixel-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #7f8c8d;
  font-size: 16px;
}

.controls {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  align-items: flex-start;
}

.select-image-section {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.big-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #3498db;
  color: white;
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.big-select-btn:hover {
  background: #2980b9;
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.big-select-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-icon {
  font-size: 24px;
}

.image-info {
  margin-top: 15px;
  font-size: 16px;
  color: #7f8c8d;
  font-weight: 500;
}

.file-input {
  display: none;
}

.image-info {
  margin-top: 10px;
  font-size: 14px;
  color: #7f8c8d;
}

.settings {
  flex: 2;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-group label {
  font-weight: 500;
  color: #2c3e50;
  min-width: 100px;
}

.slider {
  flex: 1;
  max-width: 150px;
}

.checkbox {
  width: 18px;
  height: 18px;
}

.reset-btn,
.download-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.reset-btn {
  background: #e74c3c;
  color: white;
}

.reset-btn:hover {
  background: #c0392b;
}

.download-btn {
  background: #27ae60;
  color: white;
}

.download-btn:hover:not(:disabled) {
  background: #229954;
}

.download-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.preview-section {
  margin-bottom: 30px;
}

.preview-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.preview-item h3 {
  color: #2c3e50;
  margin-bottom: 15px;
  text-align: center;
}

.image-wrapper {
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 20px;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecf0f1;
}

.preview-image,
.preview-canvas {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.placeholder {
  text-align: center;
  color: #7f8c8d;
}

.placeholder p {
  margin: 0;
  font-size: 16px;
}

.info-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.info-section h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.info-section p {
  color: #7f8c8d;
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .preview-container {
    grid-template-columns: 1fr;
  }

  .settings {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-direction: column;
  }
}
</style>
