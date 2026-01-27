<template>
  <div class="contact-form-container">
    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-content">
        <div class="time">9:41</div>
        <div class="status-icons">
          <div class="cellular-icon"></div>
          <div class="wifi-icon"></div>
          <div class="battery-icon"></div>
        </div>
      </div>
    </div>

    <!-- 标题栏 -->
    <div class="header">
      <div class="back-button" @click="goBack">
        <svg width="7" height="14" viewBox="0 0 7 14" fill="none">
          <path d="M6 1L1 7L6 13" stroke="#333333" stroke-width="2" />
        </svg>
      </div>
      <div class="title">添加联系人</div>
      <div class="header-actions">
        <div class="close-btn"></div>
        <div class="more-btn"></div>
      </div>
    </div>

    <!-- 表单区域 -->
    <div class="form-container">
      <div class="form-card">
        <!-- 姓名字段 -->
        <div class="form-field">
          <div class="field-label">
            <span class="required">姓名*</span>
          </div>
          <input
            v-model="form.name"
            type="text"
            class="field-input"
            placeholder="请填写联系人姓名"
          />
          <div class="field-divider"></div>
        </div>

        <!-- 证件类型字段 -->
        <div class="form-field">
          <div class="field-label">
            <span class="required">证件类型*</span>
          </div>
          <div class="id-type-selector">
            <div
              class="id-type-option"
              :class="{ active: form.idType === 'idCard' }"
              @click="form.idType = 'idCard'"
            >
              <span>身份证</span>
              <svg width="4" height="8" viewBox="0 0 4 8" fill="none">
                <path d="M1 1L3 4L1 7" stroke="#535464" stroke-width="1" />
              </svg>
            </div>
            <div
              class="id-type-option"
              :class="{ active: form.idType === 'passport' }"
              @click="form.idType = 'passport'"
            >
              <span>护照</span>
            </div>
          </div>
          <div class="field-divider"></div>
        </div>

        <!-- 证件号码字段 -->
        <div class="form-field">
          <div class="field-label">
            <span class="required">证件号码*</span>
          </div>
          <input
            v-model="form.idNumber"
            type="text"
            class="field-input"
            :placeholder="form.idType === 'idCard' ? '请填写联系人身份证号' : '请填写联系人护照号'"
          />
          <div class="field-divider"></div>
        </div>

        <!-- 手机号字段 -->
        <div class="form-field">
          <div class="field-label">
            <span class="required">手机号*</span>
          </div>
          <input
            v-model="form.phone"
            type="tel"
            class="field-input"
            placeholder="请填写联系人手机号"
          />
          <div class="field-divider"></div>
        </div>
      </div>

      <!-- 协议同意 -->
      <div class="agreement-section">
        <div class="agreement-checkbox" @click="form.agreed = !form.agreed">
          <div class="checkbox" :class="{ checked: form.agreed }">
            <svg v-if="form.agreed" width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L4 7L9 1" stroke="white" stroke-width="2" />
            </svg>
          </div>
          <span class="agreement-text">我已阅读并同意《用户须知》</span>
        </div>
      </div>

      <!-- 默认观演人设置 -->
      <div class="default-performer">
        <div class="performer-checkbox" @click="form.isDefault = !form.isDefault">
          <div class="checkbox" :class="{ checked: form.isDefault }">
            <svg v-if="form.isDefault" width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L4 7L9 1" stroke="white" stroke-width="2" />
            </svg>
          </div>
          <span class="performer-text">默认观演人</span>
        </div>
      </div>

      <!-- 保存按钮 -->
      <button
        class="save-btn"
        :class="{ disabled: !isFormValid }"
        @click="saveContact"
        :disabled="!isFormValid"
      >
        保存
      </button>
    </div>

    <!-- 底部导航 -->
    <div class="bottom-nav">
      <div class="nav-home"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 表单数据
const form = ref({
  name: '',
  idType: 'idCard',
  idNumber: '',
  phone: '',
  agreed: false,
  isDefault: false,
});

// 表单验证
const isFormValid = computed(() => {
  return form.value.name && form.value.idNumber && form.value.phone && form.value.agreed;
});

// 返回按钮
const goBack = () => {
  console.log('返回上一页');
  // 实际项目中这里应该是路由返回
};

// 保存联系人
const saveContact = () => {
  if (!isFormValid.value) return;

  console.log('保存联系人:', form.value);
  // 实际项目中这里应该是API调用
  alert('联系人保存成功！');
};
</script>

<style scoped>
.contact-form-container {
  width: 375px;
  height: 837px;
  background: #f6f7f8;
  margin: 0 auto;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

/* 状态栏 */
.status-bar {
  height: 48px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-content {
  width: 339px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cellular-icon,
.wifi-icon,
.battery-icon {
  width: 17px;
  height: 11px;
  background: #000000;
  border-radius: 1px;
}

/* 标题栏 */
.header {
  height: 54px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  position: relative;
}

.back-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: 500;
  color: #333333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.close-btn,
.more-btn {
  width: 18px;
  height: 18px;
  background: #1a1a19;
  border-radius: 50%;
}

/* 表单容器 */
.form-container {
  padding: 16px;
}

.form-card {
  background: white;
  border-radius: 8px;
  padding: 16px 0;
  margin-bottom: 16px;
}

.form-field {
  padding: 0 16px;
  margin-bottom: 16px;
}

.field-label {
  margin-bottom: 8px;
}

.required {
  font-size: 14px;
  font-weight: 500;
  color: #ff4242;
}

.field-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 400;
  color: #7b8190;
  background: transparent;
}

.field-input::placeholder {
  color: #7b8190;
}

.field-divider {
  height: 1px;
  background: rgba(123, 129, 144, 0.07);
  margin-top: 16px;
}

/* 证件类型选择器 */
.id-type-selector {
  display: flex;
  gap: 16px;
}

.id-type-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.id-type-option.active {
  background: rgba(255, 66, 66, 0.1);
}

.id-type-option span {
  font-size: 12px;
  font-weight: 500;
  color: #283248;
}

/* 协议同意 */
.agreement-section {
  padding: 0 16px;
  margin-bottom: 16px;
}

.agreement-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.checkbox {
  width: 14px;
  height: 14px;
  border: 1px solid #7b8190;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.checkbox.checked {
  background: #ff4242;
  border-color: #ff4242;
}

.agreement-text {
  font-size: 12px;
  font-weight: 500;
  color: #000000;
}

/* 默认观演人 */
.default-performer {
  padding: 0 16px;
  margin-bottom: 32px;
}

.performer-checkbox {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.performer-checkbox .checkbox {
  width: 16px;
  height: 16px;
}

.performer-text {
  font-size: 12px;
  font-weight: 400;
  color: #283248;
}

/* 保存按钮 */
.save-btn {
  width: 211px;
  height: 42px;
  background: #ff4242;
  border: none;
  border-radius: 110px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: block;
  margin: 0 auto;
  transition: all 0.3s;
}

.save-btn:hover {
  background: #e63939;
}

.save-btn.disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.save-btn.disabled:hover {
  background: #cccccc;
}

/* 底部导航 */
.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 35px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-home {
  width: 24px;
  height: 24px;
  background: #333333;
  border-radius: 2px;
}
</style>
