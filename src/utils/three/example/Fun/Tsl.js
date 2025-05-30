 
import * as THREEGPU from 'three/webgpu'
import {
  color,
  cos,
  float,
  mix,
  range,
  sin,
  time,
  uniform,
  uv,
  vec2,
  hue,
  PI,
  vec3,
  vec4,
  PI2,
  output,
  Fn,
  If,
  pow,
  abs,
  max,min,
  rotate,
  normalWorld,
  screenCoordinate,
  screenSize,
  varyingProperty,
  attribute,
  sampler,
  positionGeometry,
  fract,
  floor,
  clamp,
  wgslFn,
  tslFn,
  texture,
  sign,
  varying,
  transformNormalToView,
  Loop,
  positionLocal,
  cross,
  mx_noise_float,
  step,
  dot,
  mul,
  mx_fractal_noise_vec3,
  spherizeUV,
  billboarding,
  luminance,
  oneMinus,
  storage,
  deltaTime,
  instanceIndex,
  pcurve,
  atan,
  pass,
  radians
} from 'three/tsl'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import WebGPU from 'three/addons/capabilities/WebGPU.js' // 检查是否支持WebGPU
import { RGBELoader } from 'three/examples/jsm/Addons.js'
import { hash, mx_fractal_noise_float } from 'three/src/nodes/TSL.js'
import {bloom} from "three/addons/tsl/display/BloomNode.js"

export class ClassGalaxy {
  constructor(_options = {}) {
    this._options = _options

    this._init()
  }

  _init() {
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this._perspectiveCamera.position.set(4, 2, 5)

    this._scene = new THREE.Scene()
    this._scene.background = new THREE.Color(0x201919)

    // 创建材质 星系;银河;银河系;人才荟萃;群英;
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: true, // 关闭深度写入
      blending: THREE.AdditiveBlending, //THREE.MultiplyBlending,//THREE.SubtractiveBlending,//,THREE.NormalBlending,//THREE.NoBlending,
    })

    const size = uniform(0.08)
    material.scaleNode = range(0, 1).mul(size)

    const radiusRatio = range(0, 10)
    const radius = radiusRatio.pow(1.5).mul(5).toVar() // 得到半径值
    const branches = 3 // 分支
    const branchAngle = range(0, branches).floor().mul(PI2.div(branches))
    const angle = branchAngle.add(time.mul(radiusRatio.oneMinus()))
    const position = vec3(cos(angle), 0, sin(angle)).mul(radius)

    const randomOffset = range(vec3(-1), vec3(1))
      .pow(3)
      .mul(radiusRatio)
      .add(0.2)

    material.positionNode = position.add(randomOffset)

    // 创建内外两个颜色
    const colorInside = uniform(color('#ffa575'))
    const colorOutside = uniform(color('#311599'))
    const colorFinal = mix(
      colorInside,
      colorOutside,
      radiusRatio.oneMinus().pow(2).oneMinus()
    )
    const alpha = float(0.1).div(uv().sub(0.5).length()) // 求透明度 0.1 / ([-0.5,0.5]).length 距离
    material.colorNode = vec4(colorFinal, alpha)

    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      material,
      20000
    )
    this._scene.add(mesh)

    // 开启调试
    const gui = new GUI()
    gui.add(size, 'value', 0, 1, 0.1)

    gui
      .addColor(
        { color: colorInside.value.getHex(THREE.SRGBColorSpace) },
        'color'
      )
      .name('colorInside')
      .onChange(value => {
        colorInside.value.set(value)
      })

    gui
      .addColor(
        { color: colorOutside.value.getHex(THREE.SRGBColorSpace) },
        'color'
      )
      .name('colorOutside')
      .onChange(value => {
        colorOutside.value.set(value)
      })

    // 创建渲染器
    this._renderer = new THREE.WebGPURenderer({
      antialiase: true,
    })
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setAnimationLoop(this._animate.bind(this))
    this._options.dom.appendChild(this._renderer.domElement)

    // 添加控制器
    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    )
    this._orbitControls.enableDamping = true
    this._orbitControls.minDistance = 0.1
    this._orbitControls.maxDistance = 10000
  }

  _animate() {
    this._orbitControls.update()
    this._renderer.render(this._scene, this._perspectiveCamera)
  }
  _windowResizeFun(params = {}) {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight
    this._perspectiveCamera.updateProjectionMatrix()

    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

export class HalftoneClass {
  constructor(_options = {}) {
    this._options = _options

    this._init()
  }

  _init() {
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this._perspectiveCamera.position.set(6, 3, 10)

    this._scene = new THREE.Scene()
    this._clock = new THREE.Clock()

    this._gui = new GUI()

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 3)
    this._scene.add(ambientLight)

    // 添加平行光
    const directionalLight = new THREE.DirectionalLight(0xcc66ff, 8)
    directionalLight.position.set(4, 3, 1)
    this._scene.add(directionalLight)

    const lightsFolder = this._gui.addFolder('lights')
    lightsFolder
      .add(ambientLight, 'intensity', 0, 10, 0.001)
      .name('ambientIntensity')
    lightsFolder
      .add(directionalLight, 'intensity', 0, 20, 0.01)
      .name('directionalIntensity')

    // halftone settings
    this._halftoneSettings = [
      {
        // 紫色shade
        count: 140,
        color: '#fb00ff',
        direction: new THREE.Vector3(-0.4, -1, 0.5),
        start: 1,
        end: 0,
        mixLow: 0,
        mixHigh: 0.5,
        radius: 0.8,
      },
      {
        //cyan highlight
        count: 180,
        color: '#94ffd1',
        direction: new THREE.Vector3(0.5, 0.5, -0.2),
        start: 0.55,
        end: 0.2,
        mixLow: 0.5,
        mixHigh: 1,
        radius: 0.8,
      },
    ]

    for (const index in this._halftoneSettings) {
      const settings = this._halftoneSettings[index]

      // uniforms
      const uniforms = {}
      uniforms.count = uniform(settings.count)
      uniforms.color = uniform(color(settings.color))
      uniforms.direction = uniform(settings.direction)
      uniforms.start = uniform(settings.start)
      uniforms.end = uniform(settings.end)
      uniforms.mixLow = uniform(settings.mixLow)
      uniforms.mixHigh = uniform(settings.mixHigh)
      uniforms.radius = uniform(settings.radius)

      settings.uniforms = uniforms
      //console.log('uniforms:',uniforms);
      // debug
      const folder = this._gui.addFolder(`⚪️ halftone ${index}`)
      folder
        .addColor(
          { color: uniforms.color.value.getHexString(THREE.SRGBColorSpace) },
          'color'
        )
        .onChange(value => {
          uniforms.color.value.set(value)
        })
      folder.add(uniforms.count, 'value', 1, 2000, 1).name('count')
      folder.add(uniforms.direction.value, 'x', -1, 1, 0.01).listen()
      folder.add(uniforms.direction.value, 'y', -1, 1, 0.01).listen()
      folder.add(uniforms.direction.value, 'z', -1, 1, 0.01).listen()
      folder.add(uniforms.start, 'value', -1, 1, 0.01).name('start')
      folder.add(uniforms.end, 'value', -1, 1, 0.01).name('end')
      folder.add(uniforms.mixLow, 'value', 0, 1, 0.01).name('mixLow')
      folder.add(uniforms.mixHigh, 'value', 0, 1, 0.01).name('mixHigh')
      folder.add(uniforms.radius, 'value', 0, 1, 0.01).name('radius')
    }
    //console.log('screenCoordinate=',screenCoordinate.xy,'screenSize=',screenSize.xy)
    const halftone = Fn(params => {
      const { count, color, direction, start, end, radius, mixLow, mixHigh } =
        params
      //console.log(count,color,direction,start,end,radius,mixLow,mixHigh)

      // grid pattern
      let gridUv = screenCoordinate.xy.div(screenSize.yy).mul(count)
      gridUv = rotate(gridUv, Math.PI * 0.25).mod(1)

      // orientation strength
      const orientationStrength = normalWorld
        .dot(direction.normalize())
        .remapClamp(end, start, 0, 1)

      // mask
      const mask = gridUv
        .sub(0.5)
        .length()
        .step(orientationStrength.mul(radius).mul(0.5))
        .mul(mix(mixLow, mixHigh, orientationStrength))

      return vec4(color, mask)
    })

    const halftones = Fn(([input]) => {
      const halftonesOutput = input
      //console.log(halftonesOutput)
      for (const settings of this._halftoneSettings) {
        const halfToneOutput = halftone(settings.uniforms)
        //console.log('halfToneOutput:',halfToneOutput);
        halftonesOutput.rgb.assign(
          mix(halftonesOutput.rgb, halfToneOutput.rgb, halfToneOutput.a)
        )
      }

      return halftonesOutput
    })

    // default material
    const defaultMaterial = new THREE.MeshStandardNodeMaterial({
      color: 0xff622e,
    })
    defaultMaterial.outputNode = halftones(output)
    const folder = this._gui.addFolder('🎨 default material')
    folder
      .addColor(
        { color: defaultMaterial.color.getHexString(THREE.SRGBColorSpace) },
        'color'
      )
      .onChange(value => defaultMaterial.color.set(value))
    // object
    const torusKnot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
      defaultMaterial
    )
    torusKnot.position.x = 3
    this._scene.add(torusKnot)

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      defaultMaterial
    )
    sphere.position.x = -3
    this._scene.add(sphere)

    const gltfLoader = new GLTFLoader()
    gltfLoader.load('./gltf/Michelle.glb', gltf => {
      const model = gltf.scene
      model.position.y = -2
      model.scale.setScalar(2.5, 2.5, 2.5)
      model.traverse(child => {
        if (child.isMesh) {
          child.material.outputNode = halftones(output)
        }
      })

      this._scene.add(model)
    })

    // renderer
    this._renderer = new THREE.WebGPURenderer({ antialias: true })
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setAnimationLoop(this._animate.bind(this))
    this._renderer.setClearColor(0x000000)
    this._options.dom.appendChild(this._renderer.domElement)

    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    )
    this._orbitControls.enableDamping = true
    this._orbitControls.minDistance = 0.1
    this._orbitControls.maxDistance = 1000
    //console.log(this._halftoneSettings);
  }
  async _animate() {
    this._renderer.render(this._scene, this._perspectiveCamera)
    this._orbitControls.update()

    const time = this._clock.getElapsedTime()
    this._halftoneSettings[1].uniforms.direction.value.x = Math.cos(time)
    this._halftoneSettings[1].uniforms.direction.value.y = Math.sin(time)
  }
  _windowResizeFun(params = {}) {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight
    this._perspectiveCamera.updateProjectionMatrix()

    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

export class InteroperabilityClass {
  constructor(_options = {}) {
    this._options = _options
    this._crtWidthUniform = uniform(1608)
    this._crtHeightUniform = uniform(1608)

    this._init()
  }

  _init() {
    if (WebGPU.isAvailable() === false) {
      throw new Error('No WebGPU support')
    }
    // 定义类似GLSL 中的varying 声明
    const vUv = varyingProperty('vec2', 'vUv')
    // 在WGSL 中从varying结构体中访问varying 属性
    const wgslVertexShader = wgslFn(
      `
			fn crtVertex(position:vec3f,uv:vec2f)-> vec3<f32> {varyings.vUv = uv;return position;}
			`,
      [vUv]
    )

    const wgslFragmentShader = wgslFn(`
			fn crtFragment(vUv:vec2f,tex:texture_2d<f32>,texSampler:sampler,crtWidth:f32,crtHeight:f32,cellOffset:f32,cellSize:f32,borderMask:f32,time:f32,speed:f32,pulseIntensity:f32,pulseWidth:f32,pulseRate:f32)-> vec3<f32>{
				// 把uv转换到纹理的像素
				var pixel = (vUv * 0.5 + 0.5) * vec2<f32>(crtWidth,crtHeight);
				let coord = pixel / cellSize;
				let subcoord = coord * vec2f(3.,1.);
				let offset = vec2<f32>(0.,fract(floor(coord.x) * cellOffset));
				let maskCoord = floor(coord + offset) * cellSize;

				var samplePoint = maskCoord / vec2<f32>(crtWidth,crtHeight);
				samplePoint.x += fract(time * speed /20);

				var color = textureSample(tex,texSampler,samplePoint).xyz;
				let ind = floor(subcoord.x) % 3;

				var maskColor = vec3<f32>(f32(ind == 0.0),f32(ind == 1.0),f32(ind == 2.0)) * 3.0;

				let cellUV = fract(subcoord + offset) * 2.0 - 1.0;
				var border:vec2<f32> = 1.0 - cellUV * cellUV * borderMask;
				maskColor *= vec3f(clamp(border.x,0.,1.0) * clamp(border.y,0.,1.0));
				color *= maskColor;
				color.r *= 1.0 + pulseIntensity * sin(pixel.y / pulseWidth + time * pulseRate);
				color.b *= 1.0 + pulseIntensity * sin(pixel.y / pulseWidth + time * pulseRate);
				color.g *= 1.0 + pulseIntensity * sin(pixel.y / pulseWidth + time * pulseRate);
				 return color;
			}
			`)

    const textureLoader = new THREE.TextureLoader()
    const planetTexture = textureLoader.load('./planets/earth_lights_2048.png')
    planetTexture.wrapS = THREE.RepeatWrapping
    planetTexture.wrapT = THREE.RepeatWrapping

    //
    const cellOffsetUniform = uniform(0.5)
    const cellSizeUniform = uniform(6)
    const borderMaskUniform = uniform(1)
    const pulseIntensityUniform = uniform(0.06)
    const pulseWidthUniform = uniform(60)
    const pulseRateUniform = uniform(20)
    const wgslShaderSpeedUniform = uniform(1.0)
    const tslShaderSpeedUniform = uniform(1.0)

    // 创建材质
    const wgslShaderMaterial = new THREE.MeshBasicNodeMaterial()
    wgslShaderMaterial.positionNode = wgslVertexShader({
      position: attribute('position'),
      uv: attribute('uv'),
    })

    wgslShaderMaterial.fragmentNode = wgslFragmentShader({
      vUv: vUv,
      tex: texture(planetTexture),
      texSampler: sampler(planetTexture),
      crtWidth: this._crtWidthUniform,
      crtHeight: this._crtHeightUniform,
      cellOffset: cellOffsetUniform,
      cellSize: cellSizeUniform,
      borderMask: borderMaskUniform,
      time: time,
      speed: wgslShaderSpeedUniform,
      pulseIntensity: pulseIntensityUniform,
      pulseWidth: pulseWidthUniform,
      pulseRate: pulseRateUniform,
    })

    const tslVertexShader = Fn(() => {
      vUv.assign(uv())
      return positionGeometry
    })

    const tslFragmentShader = Fn(() => {
      const dimensions = vec2(this._crtWidthUniform, this._crtHeightUniform)
      const translatedUV = vUv.mul(0.5).add(0.5)
      const pixel = translatedUV.mul(dimensions)

      const coord = pixel.div(cellSizeUniform)
      const subCoord = coord.mul(vec2(3.0, 1.0))
      const cellOffset = vec2(0, fract(floor(coord.x).mul(cellOffsetUniform)))
      const maskCoord = floor(coord.add(cellOffset)).mul(cellSizeUniform)
      const samplePoint = maskCoord.div(dimensions)
      const scaledTime = time.mul(tslShaderSpeedUniform)
      samplePoint.x = samplePoint.x.add(fract(scaledTime.div(20)))
      samplePoint.y = samplePoint.y.sub(1.5)

      let color = texture(planetTexture, samplePoint)
      const index = floor(subCoord.x).mod(3)
      let maskColor = vec3(
        index.equal(0.0),
        index.equal(1.0),
        index.equal(2.0)
      ).mul(3.0)
      const subCoordOffset = fract(subCoord.add(cellOffset))
      let cellUV = subCoordOffset.mul(2.0)
      cellUV = cellUV.sub(1.0)
      const border = float(1.0).sub(cellUV.mul(cellUV).mul(borderMaskUniform))
      const clampX = clamp(border.x, 0, 1)
      const clampY = clamp(border.y, 0, 1.0)
      const borderClamp = clampX.mul(clampY)
      maskColor = maskColor.mul(borderClamp)

      color = color.mul(maskColor)

      const pixelDampen = pixel.y.div(pulseWidthUniform)
      let pulse = sin(pixelDampen.add(time.mul(pulseRateUniform)))
      pulse = pulse.mul(pulseIntensityUniform)
      color = color.mul(float(1.0).add(pulse))
      return color
    })

    const tslShaderMaterial = new THREE.MeshBasicNodeMaterial()
    tslShaderMaterial.positionNode = tslVertexShader()
    tslShaderMaterial.colorNode = tslFragmentShader()

    this._orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this._scene = new THREE.Scene()

    const geometry = new THREE.PlaneGeometry(2, 1)
    const wgslQuad = new THREE.Mesh(geometry, wgslShaderMaterial)
    wgslQuad.position.y += 0.5
    this._scene.add(wgslQuad)

    const tslQuad = new THREE.Mesh(geometry, tslShaderMaterial)
    tslQuad.position.y -= 0.5
    this._scene.add(tslQuad)

    this._renderer = new THREE.WebGPURenderer({ antialias: true })
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setAnimationLoop(this._animate.bind(this))
    this._renderer.outputColorSpace = THREE.LinearSRGBColorSpace

    this._options.dom.appendChild(this._renderer.domElement)

    const gui = new GUI()
    gui.add(cellSizeUniform, 'value', 6, 50).name('Cell Size')
    gui.add(cellOffsetUniform, 'value', 0, 1, 0.1).name('Cell Offset')
    gui.add(borderMaskUniform, 'value', 0, 5, 0.1).name('Border Mask')
    gui
      .add(pulseIntensityUniform, 'value', 0, 0.5, 0.01)
      .name('Pulse Intensity')
    gui.add(pulseWidthUniform, 'value', 10, 100, 1).name('Pulse Width')
    gui.add(wgslShaderSpeedUniform, 'value', 1, 10, 1).name('WGSL Shader Speed')
    gui.add(tslShaderSpeedUniform, 'value', 1, 10, 1).name('TSL Shader Speed')
  }

  _animate() {
    this._renderer.render(this._scene, this._orthographicCamera)
  }

  _windowResizeFun(params = {}) {
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

export class ProceduralTerrainClass {
  constructor(_options = {}) {
    this._options = _options

    this._init()
  }

  _init() {
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this._perspectiveCamera.position.set(-10, 8, -2.2)

    this._scene = new THREE.Scene()
    this._scene.background = new THREE.Color(0x201919)
    const gui = new GUI()

    // 设置背景及环境
    const rgbeLoader = new RGBELoader()
    rgbeLoader.load(
      './equirectangular/pedestrian_overpass_1k.hdr',
      environmentMap => {
        environmentMap.mapping = THREE.EquirectangularReflectionMapping

        this._scene.background = environmentMap
        this._scene.backgroundBlurriness = 1 //
        this._scene.environment = environmentMap
      }
    )

    // 添加灯光
    const directionalLight = new THREE.DirectionalLight(0xffedef, 2)
    directionalLight.position.set(6.25, 3, 4)
    directionalLight.castShadow = true // 产生音频，设置产生阴影的相机
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 30
    directionalLight.shadow.camera.top = 8
    directionalLight.shadow.camera.right = 8
    directionalLight.shadow.camera.bottom = -8
    directionalLight.shadow.camera.left = -8
    directionalLight.shadow.normalBias = 0.05
    directionalLight.shadow.bias = 0
    this._scene.add(directionalLight)

    // 创建一个标准的节点材质
    const material = new THREE.MeshStandardNodeMaterial({
      metalness: 0,
      roughness: 0.5,
      color: 0x85d534,
    })
    // 创建uniform 变量
    const noiseIterations = uniform(10)
    const positionFrequency = uniform(0.175)
    const wrapFrequency = uniform(6)
    const wrapStrength = uniform(1)
    const strength = uniform(10)
    const offset = uniform(vec2(0, 0))
    const normalLookUpShift = uniform(0.01)
    const colorSand = uniform(color(0xffe894))
    const colorGrass = uniform(color(0x85d534))
    const colorSnow = uniform(color(0xffffff))
    const colorRock = uniform(color(0xbfbd8d))
    const vNormal = varying(vec3())
    const vPosition = varying(vec3())
    const vTestFloatNoiseFunc = varying(float());

    const terrainElevation = Fn(([position]) => {
      const wrapedPosition = position.add(offset).toVar() //
      // console.log(wrapedPosition,11);
      wrapedPosition.addAssign(
        mx_noise_float(
          wrapedPosition.mul(positionFrequency).mul(wrapFrequency),
          1,
          0
        ).mul(wrapStrength)
      )

      const elevation = float(0).toVar()
      Loop(
        {
          type: 'float',
          start: float(1),
          end: noiseIterations.toFloat(),
          condition: '<=',
        },
        ({ i }) => {
          const noiseInput = wrapedPosition
            .mul(positionFrequency)
            .mul(i.mul(2))
            .add(i.mul(987))
          const noise = mx_noise_float(noiseInput, 1, 0).div(i.add(1).mul(2))
          elevation.addAssign(noise)
        }
      )

      const elevationSign = sign(elevation)
      elevation.assign(elevation.abs().pow(2).mul(elevationSign).mul(strength))
      return elevation
    })
    const noise_Func =  Fn(([p_immutable]) => {
			const p = vec3(p_immutable).toVar();
			const t = float(-0.5).toVar();
		
			Loop(
			  { start: 1.0, end: 10.0, name: "f", type: "float", condition: "<=" },
			  ({ f }) => {
				const power = float(pow(2.0, f)).toVar();
				t.addAssign(
				  abs(mx_noise_float(vec3(power.mul(p)), vec3(1.0)).div(power))
				);
			  }
			);
		
			return t;
		  }).setLayout({
			name: "noise_Func",
			type: "float",
			inputs: [{ name: "p", type: "vec3" }],
            outputs:[{name:'t',type:'float'}]
		  });
    material.positionNode = Fn(() => {
      // 相邻位置
      const neighbourA = positionLocal.xyz
        .add(vec3(normalLookUpShift, 0, 0))
        .toVar()
      const neighbourB = positionLocal.xyz
        .add(vec3(0, 0, normalLookUpShift.negate()))
        .toVar()

      const position = positionLocal.xyz.toVar()
      const elevation = terrainElevation(positionLocal.xz)
      const tHight = noise_Func(positionLocal);
      position.y.addAssign(elevation)
      //position.y.addAssign(tHight)// 调用没有问题
      //vTestFloatNoiseFunc.assign(tHight);// 测试这样赋值

      neighbourA.y.addAssign(terrainElevation(neighbourA.xz)) // 相邻位置的高度值
      neighbourB.y.addAssign(terrainElevation(neighbourB.xz))

      const toA = neighbourA.sub(position).normalize()
      const toB = neighbourB.sub(position).normalize()
      vNormal.assign(cross(toA, toB))

      vPosition.assign(position.add(vec3(offset.x, 0, offset.y))) // 坐标值进行移动

      return position
    })()

    material.normalNode = transformNormalToView(vNormal)
    material.colorNode = Fn(() => {
      const finalColor = colorSand.toVar()
      const grassMix = step(-0.06, vPosition.y)
      finalColor.assign(grassMix.mix(finalColor, colorGrass))

      const rockMix = step(0.5, dot(vNormal, vec3(0, 1, 0)))
        .oneMinus()
        .mul(step(-0.06, vPosition.y))
      finalColor.assign(rockMix.mix(finalColor, colorRock))

      const snowThreshold = mx_noise_float(vPosition.xz.mul(25), 1, 0)
        .mul(0.1)
        .add(0.45)
      const snowMix = step(snowThreshold, vPosition.y)
      finalColor.assign(snowMix.mix(finalColor, colorSnow))
      return finalColor
    })()

    const geometry = new THREE.PlaneGeometry(10, 10, 500, 500)
    geometry.deleteAttribute('uv')
    geometry.deleteAttribute('normal')
    geometry.rotateX(-Math.PI * 0.5)

    const terrain = new THREE.Mesh(geometry, material)
    terrain.receiveShadow = true
    terrain.castShadow = true

    this._scene.add(terrain)

    // debug
    const terrainGui = gui.addFolder('🏔️ terrain')
    terrainGui.add(noiseIterations, 'value', 0, 10, 1).name('noiseIterations')
    terrainGui
      .add(positionFrequency, 'value', 0, 1, 0.001)
      .name('positionFrequency')
    terrainGui.add(strength, 'value', 0, 20, 0.001).name('Strength')
    terrainGui.add(wrapFrequency, 'value', 0, 20, 0.001).name('wrapFrequency')
    terrainGui.add(wrapStrength, 'value', 0, 20, 0.01).name('wrapStrength')

    terrainGui
      .addColor(
        { color: colorSand.value.getHexString(THREE.SRGBColorSpace) },
        'color'
      )
      .name('colorSand')
      .onChange(value => colorSand.value.set(value))
    terrainGui
      .addColor(
        { color: colorGrass.value.getHexString(THREE.SRGBColorSpace) },
        'color'
      )
      .name('colorGrass')
      .onChange(value => colorGrass.value.set(value))
    terrainGui
      .addColor(
        { color: colorSnow.value.getHexString(THREE.SRGBColorSpace) },
        'color'
      )
      .name('colorSnow')
      .onChange(value => colorSnow.value.set(value))
    terrainGui
      .addColor(
        { color: colorRock.value.getHexString(THREE.SRGBColorSpace) },
        'color'
      )
      .name('ColorRock')
      .onChange(value => colorRock.value.set(value))

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10, 1, 1),
      new THREE.MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.5,
        ior: 1.333,
        color: 0x4db2ff,
      })
    )

    water.rotation.x = -Math.PI * 0.5
    water.position.y = -0.1
    this._scene.add(water)

    const waterGui = gui.addFolder('💧 water')
    waterGui.add(water.material, 'roughness', 0, 1, 0.01)
    waterGui.add(water.material, 'ior').min(1).max(20).step(0.01)
    waterGui
      .addColor(
        { color: water.material.color.getHexString(THREE.SRGBColorSpace) },
        'color'
      )
      .name('color')
      .onChange(value => water.material.color.set(value))

    this._renderer = new THREE.WebGPURenderer({ antialias: true })
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping
    this._renderer.shadowMap.enabled = true
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setAnimationLoop(this._animate.bind(this))
    this._options.dom.appendChild(this._renderer.domElement)

    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    )
    this._orbitControls.maxPolarAngle = Math.PI * 0.45
    this._orbitControls.target.y = -0.5
    this._orbitControls.enableDamping = true
    this._orbitControls.minDistance = 0.1
    this._orbitControls.maxDistance = 500

    this._drag = {}
    this._drag.screenCoords = new THREE.Vector2() // 屏幕坐标值
    this._drag.prevWorldCoords = new THREE.Vector3()
    this._drag.worldCoords = new THREE.Vector3()
    this._drag.raycaster = new THREE.Raycaster()
    this._drag.down = false
    this._drag.hover = false

    this._drag.object = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10, 1, 1),
      new THREE.MeshBasicMaterial()
    )
    this._drag.object.rotation.x = -Math.PI * 0.5
    this._drag.object.visible = false
    this._scene.add(this._drag.object)

    this._drag.getIntersect = () => {
      this._drag.raycaster.setFromCamera(
        this._drag.screenCoords,
        this._perspectiveCamera
      )
      const intersects = this._drag.raycaster.intersectObject(this._drag.object)
      if (intersects.length) {
        return intersects[0]
      }
      return null
    }

    this._drag.update = () => {
      const intersect = this._drag.getIntersect()
      if (intersect) {
        this._drag.hover = true
        if (!this._drag.down) this._renderer.domElement.style.cursor = 'grab'
      } else {
        this._drag.hover = false
        this._renderer.domElement.style.cursor = 'default'
      }

      if (this._drag.hover && this._drag.down) {
        this._drag.worldCoords.copy(intersect.point) // 得到相交点的坐标值
        const delta = this._drag.prevWorldCoords.sub(this._drag.worldCoords)

        offset.value.x += delta.x
        offset.value.y += delta.z
      }
      this._drag.prevWorldCoords.copy(this._drag.worldCoords)
    }

    window.addEventListener('pointermove', event => {
      this._drag.screenCoords.x = (event.clientX / window.innerWidth - 0.5) * 2
      this._drag.screenCoords.y =
        -(event.clientY / window.innerHeight - 0.5) * 2
    })

    window.addEventListener('pointerdown', () => {
      if (this._drag.hover) {
        this._renderer.domElement.style.cursor = 'grabbing'
        this._orbitControls.enabled = false
        this._drag.down = true
        this._drag.object.scale.setScalar(10)

        const intersect = this._drag.getIntersect()
        this._drag.prevWorldCoords.copy(intersect.point)
        this._drag.worldCoords.copy(intersect.point)
      }
    })

    window.addEventListener('pointerup', () => {
      this._drag.down = false
      this._orbitControls.enabled = true
      this._drag.object.scale.setScalar(1)
    })
  }

  _animate() {
    this._orbitControls.update()
    this._drag.update()
    this._renderer.render(this._scene, this._perspectiveCamera)
  }

  _windowResizeFun(params = {}) {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight
    this._perspectiveCamera.updateProjectionMatrix()
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

export class RagingSeaClass {
  constructor(_options = {}) {
    this._options = _options

    this._init()
  }

  _init() {
    // 创建相机
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this._perspectiveCamera.position.set(0, 10, 10)

    this._scene = new THREE.Scene()

    // 创建平行光
    const directionalLight = new THREE.DirectionalLight(0xffdeff, 3)
    directionalLight.position.set(-4, 2, 0)
    this._scene.add(directionalLight)

    // 创建材质
    const material = new THREE.MeshStandardNodeMaterial({
      color: 0x271442,
      roughness: 0.5,
    })
    // 创建uniform 变量
    const emissiveColor = uniform(color(0xff0a81))
    const emissiveLow = uniform(-0.25)
    const emissiveHigh = uniform(0.2)
    const emissivePower = uniform(7)
    const largeWavesFrequency = uniform(vec2(3, 1))
    const largeWavesSpeed = uniform(1.25)
    const largeWavesMultiplier = uniform(0.15)
    const smallWavesIterations = uniform(3)
    const smallWavesFrequency = uniform(2)
    const smallWavesSpeed = uniform(0.3)
    const smallWavesMultiplier = uniform(0.18)
    const normalComputeShift = uniform(0.01)
    // 波浪海拔
    const wavesElevation = Fn(([position]) => {
      const elevation = mul(
        sin(
          position.x.mul(largeWavesFrequency.x).add(time.mul(largeWavesSpeed))
        ),
        sin(
          position.z.mul(largeWavesFrequency.y).add(time.mul(largeWavesSpeed))
        ),
        largeWavesMultiplier
      ).toVar()

      Loop({ start: float(1), end: smallWavesIterations.add(1) }, ({ i }) => {
        const noiseInput = vec3(
          position.xz.add(2).mul(smallWavesFrequency).mul(i),
          time.mul(smallWavesSpeed)
        )

        const wave = mx_noise_float(noiseInput, 10, sin(time))
          .mul(smallWavesMultiplier)
          .div(i)
          .abs()
        elevation.subAssign(wave)
      })
      return elevation
    })

    // 得到海拔数据
    const elevation = wavesElevation(positionLocal)
    const position = positionLocal.add(vec3(0, elevation, 0))

    material.positionNode = position

    // normals
    let positionA = positionLocal.add(vec3(normalComputeShift, 0, 0)) // X 轴增加
    let positionB = positionLocal.add(vec3(0, 0, normalComputeShift.negate()))

    positionA = positionA.add(vec3(0, wavesElevation(positionA), 0))
    positionB = positionB.add(vec3(0, wavesElevation(positionB), 0))

    const toA = positionA.sub(position).normalize()
    const toB = positionB.sub(position).normalize()
    const normal = toA.cross(toB)

    material.normalNode = transformNormalToView(normal) // Transformed normal in view space

    const emissive = elevation
      .remap(emissiveHigh, emissiveLow)
      .pow(emissivePower)
    material.emissiveNode = emissiveColor.mul(emissive)

    // mesh
    const geometry = new THREE.PlaneGeometry(20, 20, 256, 256)
    geometry.rotateX(-Math.PI * 0.5)
    const mesh = new THREE.Mesh(geometry, material)
    this._scene.add(mesh)

    // gui
    const gui = new GUI()
    gui
      .addColor({ color: material.color.getHex(THREE.SRGBColorSpace) }, 'color')
      .name('Color')
      .onChange(value => material.color.set(value))
    gui.add(material, 'roughness', 0, 1, 0.001)

    const colorGui = gui.addFolder('emissive')
    colorGui
      .addColor(
        { color: emissiveColor.value.getHex(THREE.SRGBColorSpace) },
        'color'
      )
      .name('color')
      .onChange(value => emissiveColor.value.set(value))
    colorGui.add(emissiveLow, 'value', -1, 0, 0.001).name('low')
    colorGui.add(emissiveHigh, 'value', 0, 1, 0.001).name('high')
    colorGui.add(emissivePower, 'value', 1, 10, 1).name('power')

    const wavesGui = gui.addFolder('waves')
    wavesGui.add(largeWavesSpeed, 'value', 0, 5).name('largeSpeed')
    wavesGui.add(largeWavesMultiplier, 'value', 0, 1).name('largeMultiplier')
    wavesGui.add(largeWavesFrequency.value, 'x', 0, 10).name('largeFrequencyX')
    wavesGui.add(largeWavesFrequency.value, 'y', 0, 10).name('largeFrequencyY')
    wavesGui.add(smallWavesIterations, 'value', 0, 5, 1).name('smallIterations')
    wavesGui.add(smallWavesFrequency, 'value', 0, 10, 1).name('smallFrequency')
    wavesGui.add(smallWavesSpeed, 'value', 0, 1, 0.1).name('smallSpeed')
    wavesGui
      .add(smallWavesMultiplier, 'value', 0, 1, 0.1)
      .name('smallMultiplier')
    wavesGui
      .add(normalComputeShift, 'value', 0, 1, 0.001)
      .name('normalComputeShift')

    this._renderer = new THREE.WebGPURenderer({ antialias: true })
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setAnimationLoop(this._animate.bind(this))
    this._options.dom.appendChild(this._renderer.domElement)

    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    )
  }

  _animate() {
    this._orbitControls.update()

    this._renderer.render(this._scene, this._perspectiveCamera)
  }

  _windowResizeFun(params = {}) {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight
    this._perspectiveCamera.updateProjectionMatrix()
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

export class VfxFlamesClass {
  constructor(_options = {}) {
    this._options = _options

    this._init()
  }

  _init() {
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this._perspectiveCamera.position.set(1, 1, 3)

    // 创建场景
    this._scene = new THREE.Scene()
    this._scene.background = new THREE.Color(0x201919)
    // 加载纹理
    const textureLoader = new THREE.TextureLoader()

    const cellularTexture = textureLoader.load(
      './noises/voronoi/grayscale-256x256.png'
    )
    const perlinTexture = textureLoader.load('./noises/perlin/rgb-256x256.png')

    // gradient canvas
    this.gradient = {}
    this.gradient.element = document.createElement('canvas')
    this.gradient.element.width = 128
    this.gradient.element.height = 1
    this.gradient.context = this.gradient.element.getContext('2d')
    this.gradient.colors = [
      '#090033',
      '#5f1f93',
      '#e02e96',
      '#ffbd80',
      '#fff0db',
    ]

    this.gradient.texture = new THREE.CanvasTexture(this.gradient.element)
    this.gradient.update = () => {
      const fillGradient = this.gradient.context.createLinearGradient(
        0,
        0,
        this.gradient.element.width,
        0
      )
      for (let i = 0; i < this.gradient.colors.length; i++) {
        const progress = i / (this.gradient.colors.length - 1) // 取值0到1
        const color = this.gradient.colors[i]
        fillGradient.addColorStop(progress, color)
      }
      this.gradient.context.fillStyle = fillGradient
      this.gradient.context.fillRect(
        0,
        0,
        this.gradient.element.width,
        this.gradient.element.height
      )
      this.gradient.texture.needsUpdate = true
    }

    this.gradient.update()

    // flame 1 material
    const flame_1_material = new THREE.SpriteNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    })
    flame_1_material.colorNode = Fn(() => {
      // main uv
      const mainUV = uv().toVar()
      mainUV.assign(spherizeUV(mainUV, 10).mul(0.6).add(0.2))
      mainUV.assign(mainUV.pow(vec2(1, 2)))
      mainUV.assign(mainUV.mul(2, 1).sub(vec2(0.5, 0)))

      const gradient_1 = sin(time.mul(10).sub(mainUV.y.mul(PI2).mul(2))).toVar()
      const gradient_2 = mainUV.y.smoothstep(0, 1).toVar()
      mainUV.x.addAssign(gradient_1.mul(gradient_2).mul(0.2))

      const cellularUv = mainUV
        .mul(0.5)
        .add(vec2(0, time.negate().mul(0.5)))
        .mod(1)
      const cellularNoise = texture(cellularTexture, cellularUv, 0)
        .r.oneMinus()
        .smoothstep(0, 0.5)
        .oneMinus()
      cellularNoise.mulAssign(gradient_2)

      // shape
      const shape = mainUV.sub(0.5).mul(vec2(3, 2)).length().oneMinus().toVar()
      shape.assign(shape.sub(cellularNoise))

      // gradient color
      const gradientColor = texture(
        this.gradient.texture,
        vec2(shape.remap(0, 1, 0, 1), 0)
      )

      // output
      const color = mix(gradientColor, vec3(1), shape.step(0.8).oneMinus())
      const alpha = shape.smoothstep(0, 0.3)
      return vec4(color.rgb, 1)
    })()

    // flame 2 material
    const flame_2_material = new THREE.SpriteNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    })
    flame_2_material.colorNode = Fn(() => {
      const mainUV = uv().toVar()
      mainUV.assign(spherizeUV(mainUV, 10).mul(0.6).add(0.2))
      mainUV.assign(mainUV.pow(vec2(1, 3)))
      mainUV.assign(mainUV.mul(2, 1).sub(vec2(0.5, 0)))

      const perlinUv = mainUV.add(vec2(0, time.negate().mul(1))).mod(1)
      const perlinNoise = texture(perlinTexture, perlinUv, 0).sub(0.5).mul(1)
      mainUV.x.addAssign(perlinNoise.x.mul(0.5))

      const gradient_1 = sin(time.mul(10).sub(mainUV.y.mul(PI2).mul(2)))
      const gradient_2 = mainUV.y.smoothstep(0, 1)
      const gradient_3 = oneMinus(mainUV.y).smoothstep(0, 0.3)
      mainUV.x.addAssign(gradient_1.mul(gradient_2).mul(0.2))

      // displaced perlin noise
      const displacementPerlinUV = mainUV
        .mul(0.5)
        .add(vec2(0, time.negate().mul(0.25)))
        .mod(1)
      const displacementPerlinNoise = texture(
        perlinTexture,
        displacementPerlinUV,
        0
      )
        .sub(0.5)
        .mul(1)
      const displacedPerlinUV = mainUV
        .add(vec2(0, time.negate().mul(0.5)))
        .add(displacementPerlinNoise)
        .mod(1)
      const displacedPerlinNoise = texture(perlinTexture, displacedPerlinUV, 0)
        .sub(0.5)
        .mul(1)
      mainUV.x.addAssign(displacedPerlinNoise.mul(0.5))

      // 格子噪声
      const cellularUV = mainUV.add(vec2(0, time.negate().mul(1.5))).mod(1)
      const cellularNoise = texture(cellularTexture, cellularUV, 0)
        .r.oneMinus()
        .smoothstep(0.25, 1)

      // shape
      const shape = mainUV.sub(0.5).mul(vec2(6, 1)).length().step(0.5)
      shape.assign(shape.mul(cellularNoise))
      shape.mulAssign(gradient_3)
      shape.assign(step(0.01, shape))

      return vec4(vec3(1), shape)
    })()

    flame_1_material.vertexNode = billboarding()
    flame_2_material.vertexNode = billboarding()

    const flame_1 = new THREE.Sprite(flame_1_material)
    flame_1.center.set(0.5, 0)
    flame_1.scale.x = 0.5
    flame_1.position.x = -0.5
    this._scene.add(flame_1)

    const flame_2 = new THREE.Sprite(flame_2_material)
    flame_2.center.set(0.5, 0)
    flame_2.position.x = 0.5
    this._scene.add(flame_2)

    this._renderer = new THREE.WebGPURenderer({ antialias: true })
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.setAnimationLoop(this._animate.bind(this))

    this._options.dom.appendChild(this._renderer.domElement)

    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    )
  }

  _animate() {
    this._orbitControls.update()
    this._renderer.render(this._scene, this._perspectiveCamera)
  }
  _windowResizeFun(params = {}) {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight
    this._perspectiveCamera.updateProjectionMatrix()
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

export class TslVfxLinkedParticles {
  constructor(_options = {}) {
    this._options = _options;

    this._init()
  }

  _init() {
    this._updateParticles = null
    this._spawnParticles = null // TSL compute nodes
    this._getInstanceColor = null // TSL function

    this._screenPointer = new THREE.Vector2()
    this._scenePointer = new THREE.Vector3()
    this._raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this._raycaster = new THREE.Raycaster()
    this._nbParticles = Math.pow(2, 13)
    this._timeScale = uniform(1.0)
    this._particleLifetime = uniform(0.5)
    this._particleSize = uniform(1.0)
    this._linksWidth = uniform(0.005)

    this._colorOffset = uniform(0.0)
    this._colorVariance = uniform(2.0)
    this._colorRotationSpeed = uniform(1.0)

    this._spawnIndex = uniform(0)
    this._nbToSpawn = uniform(5)
    this._spawnPosition = uniform(vec3(0.0))
    this._previousSpawnPosition = uniform(vec3(0.0))

    this._turbFrequency = uniform(0.5)
    this._turbAmplitude = uniform(0.5)
    this._turbOctaves = uniform(2)
    this._turbLacunarity = uniform(2.0)
    this._turbGain = uniform(0.5)
    this._turbFriction = uniform(0.01)

    // 检测是否支持WEBGPU
    if (WebGPU.isAvailable() === false) {
      document.body.appendChild(WebGPU.getErrorMessage())
      throw new Error('No WebGPU Support')
    }

    // 创建你相机
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      200
    )
    this._perspectiveCamera.position.set(0, 0, 20)

    this._scene = new THREE.Scene()
    this._clock = new THREE.Clock()

    this._renderer = new THREE.WebGPURenderer({ antialias: true })
    this._renderer.setClearColor(0x14171a)
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._options.dom.appendChild(this._renderer.domElement)

    // 得到实例的颜色，通过索引值
    this._getInstanceColor = Fn(([i]) => {
      return hue(
        color(0x0000ff),
        this._colorOffset.add(
          mx_fractal_noise_float(
            i.toFloat().mul(0.1),
            2,
            2,
            0.5,
            this._colorVariance
          )
        )
      )
    })

    // 粒子
    /**
     * 用于定义 GPU 缓冲区的存储类型，并将其绑定到自定义着色器变量。这种方法通常在 WebGPU 和 NodeMaterial 系统中使用，可以用来管理大量的实例化数据或粒子数据
     *
     */
    const particlePositions = storage(
      new THREE.StorageInstancedBufferAttribute(this._nbParticles, 4),
      'vec4',
      this._nbParticles
    )
    const particleVelocities = storage(
      new THREE.StorageInstancedBufferAttribute(this._nbParticles, 4),
      'vec4',
      this._nbParticles
    )
    // 初始化粒子缓冲区
    this._renderer.computeAsync(
      Fn(() => {
        particlePositions.element(instanceIndex).xyz.assign(vec3(10000.0)) // 实现了将某个粒子（由 instanceIndex 索引决定）的位置信息重置为 (10000.0, 10000.0, 10000.0)
        particlePositions.element(instanceIndex).w.assign(vec3(-1.0)) //life is stored in w component; x<0 means dead
      })().compute(this._nbParticles)
    )

    // 粒子输出
    const particleQuadSize = 0.05
    const particleGeometry = new THREE.PlaneGeometry(
      particleQuadSize,
      particleQuadSize
    )
    const particleMaterial = new THREE.SpriteNodeMaterial()
    particleMaterial.transparent = true
    particleMaterial.blending = THREE.AdditiveBlending
    particleMaterial.depthWrite = false
    particleMaterial.positionNode = particlePositions.toAttribute()
    particleMaterial.scaleNode = vec2(this._particleSize)

    /**
     * .toAttribute()的作用：用于将 storage 定义的 GPU 存储缓冲区（如 StorageInstancedBufferAttribute）转换为 InstancedBufferAttribute，以便在实例化渲染中直接使用。
     */
    particleMaterial.rotationNode = atan(
      particleVelocities.toAttribute().y,
      particleVelocities.toAttribute().x
    )
    particleMaterial.colorNode = Fn(() => {
      const life = particlePositions.toAttribute().w
      const modLife = pcurve(life.oneMinus(), 8.0, 1.0)
      const pulse = pcurve(
        sin(hash(instanceIndex).mul(PI2).add(time.mul(0.5).mul(PI2)))
          .mul(0.5)
          .add(0.5),
        0.25,
        0.25
      )
        .mul(10.0)
        .add(1.0)

      return this._getInstanceColor(instanceIndex).mul(pulse.mul(modLife))
    })()

    particleMaterial.opacityNode = Fn(() => {
      const circle = uv().xy.sub(0.5).length().step(0.5)
      const life = particlePositions.toAttribute().w

      return circle.mul(life)
    })()

    const particleMesh = new THREE.InstancedMesh(
      particleGeometry,
      particleMaterial,
      this._nbParticles
    )
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    particleMesh.frustumCulled = false

    this._scene.add(particleMesh)

    // 连接两个粒子
    // first, we define the indices for the links, 2 quads per particle, the indexation is fixed
    const linksIndices = []
    for (let i = 0; i < this._nbParticles; i++) {
      const baseIndex = i * 8
      for (let j = 0; j < 2; j++) {
        const offset = baseIndex + j * 4
        linksIndices.push(
          offset,
          offset + 1,
          offset + 2,
          offset,
          offset + 2,
          offset + 3
        )
      }
    }
    //storage buffers attributes for the links
    const nbVertices = this._nbParticles * 8
    const linksVerticesSBA = new THREE.StorageBufferAttribute(nbVertices, 4)
    const linksColorSBA = new THREE.StorageBufferAttribute(nbVertices, 4)
    // links output
    const linksGeometry = new THREE.BufferGeometry()
    linksGeometry.setAttribute('position', linksVerticesSBA)
    linksGeometry.setAttribute('color', linksColorSBA)
    linksGeometry.setIndex(linksIndices)

    const linksMaterial = new THREE.MeshBasicNodeMaterial()
    linksMaterial.vertexColors = true
    linksMaterial.side = THREE.DoubleSide
    linksMaterial.transparent = true
    linksMaterial.depthWrite = true // 开启深度写入
    linksMaterial.depthTest = true
    linksMaterial.blending = THREE.AdditiveBlending
    linksMaterial.opacityNode = storage(
      linksColorSBA,
      'vec4',
      linksColorSBA.count
    ).toAttribute().w
    const linksMesh = new THREE.Mesh(linksGeometry, linksMaterial)
    linksMesh.frustumCulled = true
    this._scene.add(linksMesh)

    // compute nodes
    this._updateParticles = Fn(() => {
      const position = particlePositions.element(instanceIndex).xyz
      const life = particlePositions.element(instanceIndex).w
      const velocity = particleVelocities.element(instanceIndex).xyz
      const dt = deltaTime.mul(0.1).mul(this._timeScale)

      If(life.greaterThan(0.0), () => {
        // 首先更新粒子的位置和速度
        const localVel = mx_fractal_noise_vec3(
          position.mul(this._turbFrequency),
          this._turbOctaves,
          this._turbLacunarity,
          this._turbGain,
          this._turbAmplitude
        ).mul(life.add(0.01))
        velocity.addAssign(localVel)
        velocity.mulAssign(this._turbFriction.oneMinus())
        position.addAssign(velocity.mul(dt))

        life.subAssign(dt.mul(this._particleLifetime.reciprocal()))
        const closestDist_1 = float(10000.0).toVar()
        const closestPos_1 = vec3(0.0).toVar()
        const closestLife_1 = float(0.0).toVar()
        const closestDist_2 = float(10000.0).toVar()
        const closestPos_2 = vec3(0.0).toVar()
        const closestLife_2 = float(0.0).toVar()

        Loop(this._nbParticles, ({ i }) => {
          const otherPart = particlePositions.element(i);
          If(
            i.notEqual(instanceIndex).and(otherPart.w.greaterThan(0.0)),
            () => {
              const otherPosition = otherPart.xyz
              const dist = position.sub(otherPosition).lengthSq()
              const moreThanZero = dist.greaterThan(0.0)

              If(dist.lessThan(closestDist_1).and(moreThanZero), () => {
                closestDist_1.assign(dist)
                closestPos_1.assign(otherPosition.xyz)
                closestLife_1.assign(otherPart.w)
              }).ElseIf(dist.lessThan(closestDist_2).and(moreThanZero), () => {
                closestDist_2.assign(dist)
                closestPos_2.assign(otherPosition.xyz)
                closestLife_2.assign(otherPart.w)
              })
            }
          )
        })

        const linksPositions = storage(
          linksVerticesSBA,
          'vec4',
          linksVerticesSBA.count
        )
        const linksColors = storage(linksColorSBA, 'vec4', linksColorSBA.count)
        const firstLinkIndex = instanceIndex.mul(8)
        const secondLinkIndex = firstLinkIndex.add(4)
        linksPositions.element(firstLinkIndex).xyz.assign(position)

        linksPositions.element(firstLinkIndex).y.addAssign(this._linksWidth)
        linksPositions.element(firstLinkIndex.add(1)).xyz.assign(position)
        linksPositions
          .element(firstLinkIndex.add(1))
          .y.addAssign(this._linksWidth.negate())
        linksPositions.element(firstLinkIndex.add(2)).xyz.assign(closestPos_1)
        linksPositions
          .element(firstLinkIndex.add(2))
          .y.addAssign(this._linksWidth.negate())
        linksPositions.element(firstLinkIndex.add(3)).xyz.assign(closestPos_1)
        linksPositions
          .element(firstLinkIndex.add(3))
          .y.addAssign(this._linksWidth)

        // positions link 2
        linksPositions.element(secondLinkIndex).xyz.assign(position)
        linksPositions.element(secondLinkIndex).y.addAssign(this._linksWidth)
        linksPositions.element(secondLinkIndex.add(1)).xyz.assign(position)
        linksPositions
          .element(secondLinkIndex.add(1))
          .y.addAssign(this._linksWidth.negate())
        linksPositions.element(secondLinkIndex.add(2)).xyz.assign(closestPos_2)
        linksPositions
          .element(secondLinkIndex.add(2))
          .y.addAssign(this._linksWidth.negate())
        linksPositions.element(secondLinkIndex.add(3)).xyz.assign(closestPos_2)
        linksPositions
          .element(secondLinkIndex.add(3))
          .y.addAssign(this._linksWidth)

        const linkColor = this._getInstanceColor(instanceIndex)
        const l_1 = max(0.0, min(closestLife_1, life)).pow(0.8)
        const l_2 = max(0.0, min(closestLife_2, life)).pow(0.8)

        Loop(4, ({ i }) => {
          linksColors.element(firstLinkIndex.add(i)).xyz.assign(linkColor)
          linksColors.element(firstLinkIndex.add(i)).w.assign(l_1)
          linksColors.element(secondLinkIndex.add(i)).xyz.assign(linkColor)
          linksColors.element(secondLinkIndex.add(i)).w.assign(l_2)
        })
      })
    })().compute(this._nbParticles)

    this._spawnParticles = Fn(() => {
      const particleIndex = this._spawnIndex
        .add(instanceIndex)
        .mod(this._nbParticles)
        .toInt()
      const position = particlePositions.element(particleIndex).xyz
      const life = particlePositions.element(particleIndex).w
      const velocity = particleVelocities.element(particleIndex).xyz

      life.assign(1.0)

      const rRange = float(0.01)
      const rTheta = hash(particleIndex).mul(PI2)
      const rPhi = hash(particleIndex.add(1)).mul(PI)
      const rx = sin(rTheta).mul(cos(rPhi))
      const ry = sin(rTheta).mul(sin(rPhi))
      const rz = cos(rTheta)
      const rDir = vec3(rx, ry, rz)

      const pos = mix(
        this._previousSpawnPosition,
        this._spawnPosition,
        instanceIndex.toFloat().div(this._nbToSpawn.sub(1).toFloat()).clamp()
      )
      position.assign(pos.add(rDir.mul(rRange)))

      velocity.assign(rDir.mul(5.0))
    })().compute(this._nbToSpawn.value)

    const backgroundGeometry = new THREE.IcosahedronGeometry(
      100,
      5
    ).applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1))
    const backgroundMaterial = new THREE.MeshStandardNodeMaterial()
    backgroundMaterial.roughness = 0.4
    backgroundMaterial.metalness = 0.9
    backgroundMaterial.flatShading = true
    backgroundMaterial.colorNode = color(0x0)
    const backgroundMesh = new THREE.Mesh(
      backgroundGeometry,
      backgroundMaterial
    )
    this._scene.add(backgroundMesh)

    this._light = new THREE.PointLight(0xffdcde, 3000)
    this._scene.add(this._light)
    this._postProcessing = new THREE.PostProcessing(this._renderer)
    const scenePass = pass(this._scene, this._perspectiveCamera)
    const scenePassColor = scenePass.getTextureNode('output')
    const bloomPass = bloom(scenePassColor, 0.75, 0.1, 0.5)
    this._postProcessing.outputNode = scenePassColor.add(bloomPass)

    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    )

    this._options.dom.addEventListener(
      'pointermove',
      this._onPointerMove.bind(this)
    )

    const gui = new GUI()

    gui.add(this._orbitControls, 'autoRotate').name('Auto Rotate')
    gui
      .add(this._orbitControls, 'autoRotateSpeed', -10.0, 10.0, 0.01)
      .name('Auto Rotate Speed')

    const partFolder = gui.addFolder('Particles')
    partFolder.add(this._timeScale, 'value', 0.0, 4.0, 0.01).name('timeScale')
    partFolder.add(this._nbToSpawn, 'value', 1, 100, 1).name('Spawn rate')
    partFolder.add(this._particleSize, 'value', 0.01, 3.0, 0.01).name('Size')
    partFolder
      .add(this._particleLifetime, 'value', 0.01, 2.0, 0.01)
      .name('Lifetime')
    partFolder
      .add(this._linksWidth, 'value', 0.001, 0.1, 0.001)
      .name('Links width')
    partFolder
      .add(this._colorVariance, 'value', 0.0, 10.0, 0.01)
      .name('Color variance')
    partFolder
      .add(this._colorRotationSpeed, 'value', 0.0, 5.0, 0.01)
      .name('Color rotation speed')

    const turbFolder = gui.addFolder('Turbulence')
    turbFolder.add(this._turbFriction, 'value', 0.0, 0.3, 0.01).name('Friction')
    turbFolder
      .add(this._turbFrequency, 'value', 0.0, 1.0, 0.01)
      .name('Frequency')
    turbFolder
      .add(this._turbAmplitude, 'value', 0.0, 10.0, 0.01)
      .name('Amplitude')
    turbFolder.add(this._turbOctaves, 'value', 1, 9, 1).name('Octaves')
    turbFolder
      .add(this._turbLacunarity, 'value', 1.0, 5.0, 0.01)
      .name('Lacunarity')
    turbFolder.add(this._turbGain, 'value', 0.0, 1.0, 0.01).name('Gain')

    const bloomFolder = gui.addFolder('bloom')
    bloomFolder
      .add(bloomPass.threshold, 'value', 0, 2.0, 0.01)
      .name('Threshold')
    bloomFolder.add(bloomPass.strength, 'value', 0, 10, 0.01).name('Strength')
    bloomFolder.add(bloomPass.radius, 'value', 0, 1, 0.01).name('Radius')
    this._renderer.setAnimationLoop(this._animate.bind(this));
  }
  _onPointerMove(e) {
    this._scenePointer.x = (e.clientX / window.innerWidth) * 2 - 1
    this._scenePointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  }
  _animate() {
   
    
    this._renderer.compute(this._updateParticles);
    this._renderer.compute(this._spawnParticles);
    this._spawnIndex.value =
      (this._spawnIndex.value + this._nbToSpawn.value) % this._nbParticles

    this._raycastPlane.normal.applyEuler(this._perspectiveCamera.rotation)
    this._spawnPosition.value.lerp(this._scenePointer, 0.1)
    this._colorOffset.value +=
      this._clock.getDelta() *
      this._colorRotationSpeed.value *
      this._timeScale.value

    const elapsedTime = this._clock.getElapsedTime()
    this._light.position.set(
      Math.sin(elapsedTime * 0.5) * 30,
      Math.cos(elapsedTime * 0.3) * 30,
      Math.sin(elapsedTime * 0.2) * 30
    )
    this._postProcessing.render()
  }
  _windowResizeFun(params = {}) {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight
    this._perspectiveCamera.updateProjectionMatrix()

    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

export class TslVfxTornado{
  constructor(_options={}){
    this._options = _options;
    this._init();
  }

  _init(){
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,500);
    this._perspectiveCamera.position.set(0,10,30);

    // 创建场景
    this._scene = new THREE.Scene();

    	// Create a sine-like wave
			const curve = new THREE.SplineCurve( [
				new THREE.Vector2( -10, 0 ),
				new THREE.Vector2( -5, 5 ),
				new THREE.Vector2( 0, 0 ),
				new THREE.Vector2( 5, -5 ),
				new THREE.Vector2( 10, 0 )
			] );

			const points = curve.getPoints( 50 );
			const geometry = new THREE.BufferGeometry().setFromPoints( points );

			const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );

			// Create the final object to add to the scene
			const splineObject = new THREE.Line( geometry, material );
			this._scene.add(splineObject);
			//console.log('线条对象:',splineObject)

    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    const perlinTexture = textureLoader.load('./noises/perlin/rgb-256x256.png');
    perlinTexture.wrapS = THREE.RepeatWrapping;
    perlinTexture.wrapT = THREE.RepeatWrapping;

    // tsl function
    const toRadialUv = Fn(([uv,multiplier,rotation,offset])=>{
      const centeredUv = uv.sub(0.5).toVar();
      const distanceToCenter = centeredUv.length();
      const angle = atan(centeredUv.y,centeredUv.x);
      const radialUv = vec2(angle.add(PI).div(PI2),distanceToCenter).toVar();
      radialUv.mulAssign(multiplier);
      radialUv.x.addAssign(rotation);
      radialUv.y.addAssign(offset);
      return radialUv;
    });
    /**
     * 注意这里的参数形式，采用传统的方式而不是[uv,shew]进行测试,只能采用[] 这种方式
     */
    const toSkewedUv = Fn(([uv,skew])=>{
      //console.log('uv',skew);
      return vec2(uv.x.add(uv.y.mul(skew.x)),uv.y.add(uv.x.mul(skew.y)));
    });

    const twistedCylinder = Fn(([position,parabolStrength,parabolOffset,parabolAmplitude,time])=>{
      const angle = atan(position.z,position.x).toVar();
      const elevation = position.y;

      const radius = parabolStrength.mul(position.y.sub(parabolOffset)).pow(2).add(parabolAmplitude).toVar();
      radius.addAssign(sin(elevation.sub(time).mul(20).add(angle.mul(2))).mul(0.05));
      const twistedPosition = vec3(cos(angle).mul(radius),elevation,sin(angle).mul(radius));
      return twistedPosition;
    });
    // 创建uniform 统一的变量数据
    const emissiveColor = uniform(color('#ff8b4d'));
    const timeScale = uniform(0.2);
    const parabolStrength = uniform(1);
    const parabolOffset = uniform(0.3);
    const parabolAmplitude = uniform(0.2);


    // 创建地面材质
    const floorMaterial = new THREE.MeshBasicMaterial({
      transparent:true,
      wireframe:true,
    });
    floorMaterial.output = Fn(()=>{
      const scaledTime = time.mul(timeScale);

      // noise 1
      const noise_1_Uv = toRadialUv(uv(),vec2(0.5,0.5),scaledTime,scaledTime);
      noise_1_Uv.assign(toSkewedUv(noise_1_Uv,vec2(-1,0)));
      noise_1_Uv.mulAssign(vec2(4,1));
      const noise_1 = texture(perlinTexture,noise_1_Uv,1).r.remap(0.45,0.7);

      // 第二个noise 2
      const noise_2_Uv = toRadialUv(uv(),vec2(2,8),scaledTime.mul(2),scaledTime.mul(8));
      noise_2_Uv.assign(toSkewedUv(noise_2_Uv,vec2(-0.25,0)));
      noise_2_Uv.mulAssign(vec2(2,0.25));

      const noise_2 = texture(perlinTexture,noise_2_Uv,1).b.remap(0.45,0.7);

      // outer fade
      const distanceToCenter = uv().sub(0.5).toVar();
      const outerFade = min(oneMinus(distanceToCenter.length()).smoothstep(0.5,0.9),distanceToCenter.length().smoothstep(0,0.02));

      // effect 
      const effect  = noise_1.mul(noise_2).mul(outerFade).toVar();
      return vec4(emissiveColor.mul(float(0.2).step(effect)).mul(3),effect.smoothstep(0.,0.01));
    })();

    // 创建地面
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2,2),floorMaterial);
    floor.rotation.x = - Math.PI * 0.5;
    this._scene.add(floor);

    // 创建圆柱体
    const cylinderGeometry = new THREE.CylinderGeometry(1,1,1,20,20,true);
    cylinderGeometry.translate(0,0.5,0);

    const emissiveMaterial = new THREE.MeshBasicNodeMaterial({transparent:true,side:THREE.DoubleSide,wireframe:false});
    emissiveMaterial.positionNode = twistedCylinder(positionLocal,parabolStrength,parabolOffset,parabolAmplitude.sub(0.05),time.mul(timeScale));
    emissiveMaterial.outputNode = Fn(()=>{
      const scaledTime = time.mul(timeScale);
      const noise_1_Uv = uv().add(vec2(scaledTime,scaledTime.negate())).toVar();
      noise_1_Uv.assign(toSkewedUv(noise_1_Uv,vec2(-1,0)));
      noise_1_Uv.mulAssign(vec2(2,0.25));
      const noise_1 = texture(perlinTexture,noise_1_Uv,1).r.remap(0.45,0.7);
      const noise_2_Uv = uv().add(vec2(scaledTime.mul(0.5),scaledTime.negate())).toVar();
      noise_2_Uv.assign(toSkewedUv(noise_2_Uv,vec2(-1,0)));
      noise_2_Uv.mulAssign(vec2(5,1));
      const noise_2 = texture(perlinTexture,noise_2_Uv,1).g.remap(0.45,0.7);
      const outerFade = min(uv().y.smoothstep(0,0.1),oneMinus(uv().y).smoothstep(0,0.4));
      const effect = noise_1.mul(noise_2).mul(outerFade);
      const emissiveColorLuminance = luminance(emissiveColor);
      return vec4(emissiveColor.mul(1.2).div(emissiveColorLuminance),effect.smoothstep(0,0.1));
    })();

    const emissive = new THREE.Mesh(cylinderGeometry,emissiveMaterial);
    emissive.scale.set(1,1,1);
    this._scene.add(emissive);

    // 黑色的材质
    const darkMaterial = new THREE.MeshBasicNodeMaterial({transparent:true,side:THREE.DoubleSide,wireframe:false});
    darkMaterial.positionNode = twistedCylinder(positionLocal,parabolStrength,parabolOffset,parabolAmplitude,time.mul(timeScale));
    darkMaterial.outputNode = Fn(()=>{
      const scaledTime = time.mul(timeScale).add(123.4);

      const noise_1_Uv = uv().add(vec2(scaledTime,scaledTime.negate())).toVar();
      noise_1_Uv.assign(toSkewedUv(noise_1_Uv,vec2(-1,0)));
      noise_1_Uv.mulAssign(vec2(2,0.25));

      const noise_1 = texture(perlinTexture,noise_1_Uv,1).g.remap(0.45,0.7);
      const noise_2_Uv = uv().add(vec2(scaledTime.mul(0.5),scaledTime.negate())).toVar();
      noise_2_Uv.assign(toSkewedUv(noise_2_Uv,vec2(-1,0)));
      noise_2_Uv.mulAssign(vec2(5,1));

      const noise_2 = texture(perlinTexture,noise_2_Uv,1).b.remap(0.45,0.7);
      const outerFade = min(uv().y.smoothstep(0,0.2),oneMinus(uv().y).smoothstep(0,0.4));
      const effect = noise_1.mul(noise_2).mul(outerFade);
      return vec4(vec3(0),effect.smoothstep(0,0.01));
    })();

    const dark = new THREE.Mesh(cylinderGeometry,darkMaterial);
    dark.scale.set(1,1,1);
    this._scene.add(dark);

    this._renderer = new THREE.WebGPURenderer({antialias:true});
    this._renderer.setClearColor(0x201919);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._renderer.setAnimationLoop(this._animate.bind(this));
    this._options.dom.appendChild(this._renderer.domElement);

    //post processing
    this._postProcessing = new THREE.PostProcessing(this._renderer);

    const scenePass = pass(this._scene,this._perspectiveCamera);
    const scenePassColor = scenePass.getTextureNode('output');

    const bloomPass = bloom(scenePassColor,1,0.1,1);
    this._postProcessing.outputNode = scenePassColor.add(bloomPass);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

    const gui = new GUI();
    gui.addColor({color:emissiveColor.value.getHexString(THREE.SRGBColorSpace)},'color').onChange(value=>emissiveColor.value.set(value)).name('emissiveColor');
    gui.add(timeScale,'value',-1,1,0.01).name('timeScale');
    gui.add(parabolStrength,'value',0,2,0.01).name('parabolStrength');
    gui.add(parabolOffset,'value',0,1,0.01).name('parabolOffset');
    gui.add(parabolAmplitude,'value',0,2,0.01).name('parabolAmplitude');

    const bloomGui = gui.addFolder('bloom');
    bloomGui.add(bloomPass.strength,'value',0,10,0.01).name('strength');
    bloomGui.add(bloomPass.radius,'value',0,1,0.01).name('radius');
  }
  _animate(){
    this._orbitControls.update();
    this._postProcessing.render();
  }
  _windowResizeFun(params={}){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth,window.innerHeight);
  }
}

export class TslBaseLession{
  constructor(_options={}){
    this._options = _options;
    this._init();
  }

  _init(){
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,2500);
    this._perspectiveCamera.position.set(0,1,4);

    // 创建场景
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x444488);

    this._renderer = new THREE.WebGPURenderer({antialias:true});
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._renderer.setAnimationLoop(this._animate.bind(this));
    this._options.dom.appendChild(this._renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xaaaaaa,3);
    const hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x333333);
    const light = new THREE.DirectionalLight(0xffdfde,3);
    light.position.set(3,3,1);
    this._scene.add(ambientLight);
    this._scene.add(light);
    this._scene.add(hemisphereLight);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

    this._initTsl();
  }
  _initTsl(){
    const geometry = new THREE.SphereGeometry(1,32,32);
    const material = new THREE.MeshStandardNodeMaterial({
      color:0xff0000,
    });
    //material.colorNode = positionLocal;
    
    const mesh = new THREE.Mesh(geometry,material);
    this._scene.add(mesh);
    // 加载纹理
    const uvTexture = new THREE.TextureLoader().load('./texture/uv_grid.jpg');
    this._guiOptions = {
      mode:"positionLocal",
      operation:'add',
      value:0,
    };
    this._gui = new GUI();
    this._gui.add(this._guiOptions,'mode',['positionLocal','texture']).onChange(value=>{
      switch(value){
        case 'positionLocal':
          material.colorNode = positionLocal;
          break;
        case 'texture':
          material.colorNode = texture(uvTexture);
          break;
      }
      material.needsUpdate = true;
    });
    this._gui.add(this._guiOptions,'operation',['add','sub','mul','div']).onChange(value=>{
      this._updateTsl(value,this._guiOptions.value);
      material.needsUpdate = true;
    });
    this._gui.add(this._guiOptions,'value',0,10).onChange(value=>{
      this._updateTsl(this._guiOptions.operation,value);
      material.needsUpdate = true;
    })

  }
  _updateTsl(operation,value){
    switch(operation){
      case 'add':
        material.colorNode = positionLocal.add(value);
        break;
      case 'sub':
        material.colorNode = positionLocal.sub(value);
        break;
      case 'mul':
        material.colorNode = positionLocal.mul(value);
        break;
      case 'div':
        material.colorNode = positionLocal.div(value);
        break;
        

    }
  }
  _animate(){
    this._renderer.render(this._scene,this._perspectiveCamera);
  }
  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth,window.innerHeight);

  }
}  
