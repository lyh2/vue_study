/*
 * @Author: 412285349@qq.com 412285349@qq.com
 * @Date: 2024-09-28 21:42:38
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-10-02 20:13:10
 * @FilePath: /www/vue_study/src/utils/three/example/Example_6_sketchbook/world/World.js
 * @Description: 
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Swal from 'sweetalert2';

import {CameraOperator} from "../core/CameraOperator";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import {Stats} from "../utils/Stats";
import * as GUI from "three/examples/jsm/libs/lil-gui.module.min";
import { CannonDebugRenderer } from '../lib/CannonDebugRenderer';
import * as _ from "lodash";

import {InputManager} from "../core/InputManager";
import * as Utils from "../core/FunctionLibrary";
import {LoadingManager} from "../core/LoadingManager";
