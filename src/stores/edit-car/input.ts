/**
 * edit-car 游戏中的输入控制模块
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useInputStore = defineStore('input-state', () => {
  const tool = ref<string>('road');

  function setTool(newTool: string) {
    tool.value = newTool;
  }

  function getTool(): string {
    return tool.value;
  }
  return { tool, setTool, getTool };
});
