/*
 * @Author: 412285349@qq.com 412285349@qq.com
 * @Date: 2024-09-22 10:50:12
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-09-22 11:08:03
 * @FilePath: /www/vue_study/src/utils/three/example/Example_6_sketchbook/interfaces/IUpdatable.js
 * @Description: 
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */

export class IUpdatable{
    constructor(){
        this.updateOrder = 0;
    }
    update(timeStep,unscaledTimeStep){
        console.log("父类 IUpdatable:update()方法...执行");
    }
}