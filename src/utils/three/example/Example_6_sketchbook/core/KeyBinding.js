/*
 * @Author: 412285349@qq.com 412285349@qq.com
 * @Date: 2024-09-22 10:51:10
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-09-22 10:51:16
 * @FilePath: /www/vue_study/src/utils/three/example/Example_6_sketchbook/core/KeyBinding.js
 * @Description: 键盘按下
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */

export class KeyBinding{
    constructor(code=[]){
        this.eventCodes = code;
        this.isPressed = false;
        this.justPressed = false;
        this.justReleased=false;
    }

    
}