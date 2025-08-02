import eslint from '@eslint/js';
import vuePlugin from 'eslint-plugin-vue';
import prettierConfig from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  ...vuePlugin.configs['flat/recommended'],
  prettierConfig,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },
  {
    files: ['src/**/*.vue'],
    rules: {
      'vue/component-tags-order': [
        'error',
        {
          order: ['template', 'script', 'style']
        }
      ]
    }
  },
  // 添加忽略规则
  {
    ignores: [
      '**/third-party/*.js',      // 忽略第三方库
      'src/utils/alva/*',         // 忽略alva工具目录
      //'src/utils/cesium/*',       // 忽略cesium工具目录
      //'src/utils/three/example/**' // 忽略three.js示例目录
      'src/utils/three/example/Fun/**',
      'src/utils/three/example/Hall/**',
      'src/utils/three/example/3DWorld/**',
      'src/utils/three/example/backjack/**',
      'src/utils/three/example/City/**',
      'src/utils/three/example/Wall/**',
      'src/utils/three/example/tictactoe/**',
      'src/utils/three/example/hideAndSeek/**',
      'src/utils/SimplexNoise.js',

    ]
  }
];
