class Cd {
    constructor(e) {
        this.experience = new Od,
        this.config = this.experience.config,
        this.debug = this.experience.debug,
        this.time = this.experience.time,
        this.sizes = this.experience.sizes,
        this.targetElement = this.experience.targetElement,
        this.scene = this.experience.scene,
        this.mode = "debug",
        this.setInstance(),
        this.setModes()
    }
    setInstance() {
        this.instance = new _n(25,this.config.width / this.config.height,.1,150),
        this.instance.rotation.reorder("YXZ"),
        this.scene.add(this.instance)
    }
    setModes() {
        this.modes = {},
        this.modes.default = {},
        this.modes.default.instance = this.instance.clone(),
        this.modes.default.instance.rotation.reorder("YXZ"),
        this.modes.debug = {},
        this.modes.debug.instance = this.instance.clone(),
        this.modes.debug.instance.rotation.reorder("YXZ"),
        this.modes.debug.instance.position.set(-3.6075070194579104, -.5992302447775956, -3.8236586756402806),
        this.modes.debug.orbitControls = new Td(this.modes.debug.instance,this.targetElement),
        this.modes.debug.orbitControls.enabled = this.modes.debug.active,
        this.modes.debug.orbitControls.screenSpacePanning = !0,
        this.modes.debug.orbitControls.enableKeys = !1,
        this.modes.debug.orbitControls.zoomSpeed = .25,
        this.modes.debug.orbitControls.enableDamping = !0,
        this.modes.debug.orbitControls.update()
    }
    resize() {
        this.instance.aspect = this.config.width / this.config.height,
        this.instance.updateProjectionMatrix(),
        this.modes.default.instance.aspect = this.config.width / this.config.height,
        this.modes.default.instance.updateProjectionMatrix(),
        this.modes.debug.instance.aspect = this.config.width / this.config.height,
        this.modes.debug.instance.updateProjectionMatrix()
    }
    update() {
        this.modes.debug.orbitControls.update(),
        this.instance.position.copy(this.modes[this.mode].instance.position),
        this.instance.quaternion.copy(this.modes[this.mode].instance.quaternion),
        this.instance.updateMatrixWorld()
    }
    destroy() {
        this.modes.debug.orbitControls.destroy()
    }
}
class Pd {
    constructor(e) {
        this.experience = new Od,
        this.renderer = this.experience.renderer,
        this.time = this.experience.time,
        this.scene = this.experience.scene,
        this.positions = e.positions,
        this.debug = e.debugFolder,
        this.count = this.positions.length / 3,
        this.width = 4096,
        this.height = Math.ceil(this.count / this.width),
        this.texture = null,
        this.seed = 1e3 * Math.random(),
        this.debug && (this.debugFolder = this.debug.addFolder({
            title: "flowField"
        })),
        this.setBaseTexture(),
        this.setRenderTargets(),
        this.setEnvironment(),
        this.setPlane(),
        this.setDebugPlane(),
        this.setFboUv(),
        this.render()
    }
    setBaseTexture() {
        const e = this.width * this.height
          , t = new Float32Array(4 * e);
        for (let n = 0; n < e; n++)
            t[4 * n + 0] = this.positions[3 * n + 0],
            t[4 * n + 1] = this.positions[3 * n + 1],
            t[4 * n + 2] = this.positions[3 * n + 2],
            t[4 * n + 3] = Math.random();
        this.baseTexture = new bs(t,this.width,this.height,x,m),
        this.baseTexture.minFilter = o,
        this.baseTexture.magFilter = o,
        this.baseTexture.generateMipmaps = !1
    }
    setRenderTargets() {
        this.renderTargets = {},
        this.renderTargets.a = new oe(this.width,this.height,{
            minFilter: o,
            magFilter: o,
            generateMipmaps: !1,
            format: x,
            type: m,
            encoding: D,
            depthBuffer: !1,
            stencilBuffer: !1
        }),
        this.renderTargets.b = this.renderTargets.a.clone(),
        this.renderTargets.primary = this.renderTargets.a,
        this.renderTargets.secondary = this.renderTargets.b
    }
    setEnvironment() {
        this.environment = {},
        this.environment.scene = new Kr,
        this.environment.camera = new Da(-.5,.5,.5,-.5,.1,10),
        this.environment.camera.position.z = 1
    }
    setPlane() {
        this.plane = {},
        this.plane.geometry = new Nn(1,1,1,1),
        this.plane.material = new xn({
            uniforms: {
                uTime: {
                    value: 0
                },
                uDelta: {
                    value: 16
                },
                uBaseTexture: {
                    value: this.baseTexture
                },
                uTexture: {
                    value: this.baseTexture
                },
                uDecaySpeed: {
                    value: 49e-5
                },
                uPerlinFrequency: {
                    value: 4
                },
                uPerlinMultiplier: {
                    value: .004
                },
                uTimeFrequency: {
                    value: 4e-4
                },
                uSeed: {
                    value: this.seed
                }
            },
            vertexShader: "#define GLSLIFY 1\nvarying vec2 vUv;\n\nvoid main()\n{\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n\n    vUv = uv;\n}",
            fragmentShader: "#define GLSLIFY 1\nuniform float uTime;\nuniform float uDelta;\nuniform sampler2D uBaseTexture;\nuniform sampler2D uTexture;\n\nuniform float uDecaySpeed;\n\nuniform float uPerlinFrequency;\nuniform float uPerlinMultiplier;\nuniform float uTimeFrequency;\nuniform float uSeed;\n\nvarying vec2 vUv;\n\n//\tClassic Perlin 3D Noise \n//\tby Stefan Gustavson\n//\nvec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}\nvec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}\nvec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}\n\nfloat perlin3d(vec3 P)\n{\n    vec3 Pi0 = floor(P); // Integer part for indexing\n    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1\n    Pi0 = mod(Pi0, 289.0);\n    Pi1 = mod(Pi1, 289.0);\n    vec3 Pf0 = fract(P); // Fractional part for interpolation\n    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n    vec4 iy = vec4(Pi0.yy, Pi1.yy);\n    vec4 iz0 = Pi0.zzzz;\n    vec4 iz1 = Pi1.zzzz;\n\n    vec4 ixy = permute(permute(ix) + iy);\n    vec4 ixy0 = permute(ixy + iz0);\n    vec4 ixy1 = permute(ixy + iz1);\n\n    vec4 gx0 = ixy0 / 7.0;\n    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;\n    gx0 = fract(gx0);\n    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n    vec4 sz0 = step(gz0, vec4(0.0));\n    gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n    gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n    vec4 gx1 = ixy1 / 7.0;\n    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;\n    gx1 = fract(gx1);\n    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n    vec4 sz1 = step(gz1, vec4(0.0));\n    gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n    gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n    g000 *= norm0.x;\n    g010 *= norm0.y;\n    g100 *= norm0.z;\n    g110 *= norm0.w;\n    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n    g001 *= norm1.x;\n    g011 *= norm1.y;\n    g101 *= norm1.z;\n    g111 *= norm1.w;\n\n    float n000 = dot(g000, Pf0);\n    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n    float n111 = dot(g111, Pf1);\n\n    vec3 fade_xyz = fade(Pf0);\n    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); \n    return 2.2 * n_xyz;\n}\n\nvoid main()\n{\n    vec4 color = texture2D(uTexture, vUv);\n    color.a -= uDecaySpeed * uDelta;\n\n    // Reset to base position\n    if(color.a <= 0.0)\n    {\n        color.rgb = texture2D(uBaseTexture, vUv).rgb;\n        color.a = 1.0;\n        // color = texture2D(uBaseTexture, vUv);\n    }\n    else\n    {\n        vec4 baseColor = color;\n\n        float time = uTime * uTimeFrequency;\n        float perlinMultiplier = uPerlinMultiplier * uDelta * 0.1;\n\n        color.r += perlin3d(uSeed + vec3(baseColor.gb * uPerlinFrequency           , time)) * perlinMultiplier;\n        color.g += perlin3d(uSeed + vec3(baseColor.rb * uPerlinFrequency + 123.45  , time)) * perlinMultiplier;\n        color.b += perlin3d(uSeed + vec3(baseColor.rg * uPerlinFrequency + 12345.67, time)) * perlinMultiplier;\n    }\n\n    gl_FragColor = color;\n}"
        }),
        this.plane.mesh = new dn(this.plane.geometry,this.plane.material),
        this.environment.scene.add(this.plane.mesh),
        this.debug && (this.debugFolder.addInput(this.plane.material.uniforms.uDecaySpeed, "value", {
            label: "uDecaySpeed",
            min: 0,
            max: .005,
            step: 1e-5
        }),
        this.debugFolder.addInput(this.plane.material.uniforms.uPerlinFrequency, "value", {
            label: "uPerlinFrequency",
            min: 0,
            max: 5,
            step: .001
        }),
        this.debugFolder.addInput(this.plane.material.uniforms.uPerlinMultiplier, "value", {
            label: "uPerlinMultiplier",
            min: 0,
            max: .1,
            step: .001
        }),
        this.debugFolder.addInput(this.plane.material.uniforms.uTimeFrequency, "value", {
            label: "uTimeFrequency",
            min: 0,
            max: .005,
            step: 1e-4
        }))
    }
    setDebugPlane() {
        this.debugPlane = {},
        this.debugPlane.geometry = new Nn(1,this.height / this.width,1,1),
        this.debugPlane.material = new It({
            transparent: !0
        }),
        this.debugPlane.mesh = new dn(this.debugPlane.geometry,this.debugPlane.material),
        this.debugPlane.mesh.visible = !1,
        this.scene.add(this.debugPlane.mesh),
        this.debug && this.debugFolder.addInput(this.debugPlane.mesh, "visible", {
            label: "debugPlaneVisible"
        })
    }
    setFboUv() {
        this.fboUv = {},
        this.fboUv.data = new Float32Array(2 * this.count);
        const e = 1 / this.width / 2
          , t = 1 / this.height / 2;
        for (let n = 0; n < this.count; n++) {
            const i = n % this.width / this.width + e
              , r = Math.floor(n / this.width) / this.height + t;
            this.fboUv.data[2 * n + 0] = i,
            this.fboUv.data[2 * n + 1] = r
        }
        this.fboUv.attribute = new kt(this.fboUv.data,2)
    }
    render() {
        this.renderer.instance.setRenderTarget(this.renderTargets.primary),
        this.renderer.instance.render(this.environment.scene, this.environment.camera),
        this.renderer.instance.setRenderTarget(null);
        const e = this.renderTargets.primary;
        this.renderTargets.primary = this.renderTargets.secondary,
        this.renderTargets.secondary = e,
        this.texture = this.renderTargets.secondary.texture,
        this.debugPlane.material.map = this.texture
    }
    update() {
        this.plane.material.uniforms.uDelta.value = this.time.delta,
        this.plane.material.uniforms.uTime.value = this.time.elapsed,
        this.plane.material.uniforms.uTexture.value = this.renderTargets.secondary.texture,
        this.render()
    }
    dispose() {
        this.baseTexture.dispose(),
        this.renderTargets.a.dispose(),
        this.renderTargets.b.dispose(),
        this.plane.geometry.dispose(),
        this.plane.material.dispose(),
        this.debugPlane.geometry.dispose(),
        this.scene.remove(this.debugPlane.mesh),
        this.debug && this.debugFolder.dispose()
    }
}
class Ad {
    constructor(e) {
        this.experience = new Od,
        this.config = this.experience.config,
        this.resources = this.experience.resources,
        this.scene = this.experience.scene,
        this.debug = e.debugFolder,
        this.colors = e.colors,
        this.ringCount = 3e4,
        this.insideCount = 5e3,
        this.count = this.ringCount + this.insideCount,
        this.debug && (this.debugFolder = this.debug.addFolder({
            title: "particles"
        }),
        this.debugFolder.addInput(this, "ringCount", {
            min: 100,
            max: 5e4,
            step: 100
        }).on("change", ( () => {
            this.reset()
        }
        )),
        this.debugFolder.addInput(this, "insideCount", {
            min: 100,
            max: 5e4,
            step: 100
        }).on("change", ( () => {
            this.reset()
        }
        ))),
        this.setPositions(),
        this.setFlowfield(),
        this.setGeometry(),
        this.setMaterial(),
        this.setPoints()
    }
    reset() {
        this.flowField.dispose(),
        this.geometry.dispose(),
        this.setPositions(),
        this.setFlowfield(),
        this.setGeometry(),
        this.points.geometry = this.geometry
    }
    setPositions() {
        this.positions = new Float32Array(3 * this.count);
        let e = 0;
        for (e = 0; e < this.ringCount; e++) {
            const t = Math.random() * Math.PI * 2;
            this.positions[3 * e + 0] = Math.sin(t),
            this.positions[3 * e + 1] = Math.cos(t),
            this.positions[3 * e + 2] = 0
        }
        for (; e < this.count; e++) {
            const t = Math.random() * Math.PI * 2
              , n = 1 * Math.pow(Math.random(), 2);
            this.positions[3 * e + 0] = Math.sin(t) * n + .2 * Math.random(),
            this.positions[3 * e + 1] = Math.cos(t) * n + .2 * Math.random(),
            this.positions[3 * e + 2] = 0
        }
    }
    setFlowfield() {
        this.flowField = new Pd({
            positions: this.positions,
            debugFolder: this.debugFolder
        })
    }
    setGeometry() {
        const e = new Float32Array(this.count);
        for (let t = 0; t < this.count; t++)
            e[t] = .2 + .8 * Math.random();
        this.geometry = new Xt,
        this.geometry.setAttribute("position", new kt(this.positions,3)),
        this.geometry.setAttribute("aSize", new kt(e,1)),
        this.geometry.setAttribute("aFboUv", this.flowField.fboUv.attribute)
    }
    setMaterial() {
        this.material = new xn({
            transparent: !0,
            blending: 2,
            depthWrite: !1,
            uniforms: {
                uColor: {
                    value: this.colors.c.instance
                },
                uSize: {
                    value: 30 * this.config.pixelRatio
                },
                uMaskTexture: {
                    value: this.resources.items.particleMaskTexture
                },
                uFBOTexture: {
                    value: this.flowField.texture
                }
            },
            vertexShader: "#define GLSLIFY 1\nuniform sampler2D uFBOTexture;\nuniform sampler2D uMaskTexture;\nuniform float uSize;\n\nattribute vec2 aFboUv;\nattribute float aSize;\n\nvoid main()\n{\n    vec4 fboColor = texture2D(uFBOTexture, aFboUv);\n\n    vec4 modelPosition = modelMatrix * vec4(fboColor.xyz, 1.0);\n    vec4 viewPosition = viewMatrix * modelPosition;\n    gl_Position = projectionMatrix * viewPosition;\n\n    float lifeSize = min((1.0 - fboColor.a) * 10.0, fboColor.a * 2.0);\n    lifeSize = clamp(lifeSize, 0.0, 1.0);\n\n    gl_PointSize = uSize * lifeSize * aSize;\n    gl_PointSize *= (1.0 / - viewPosition.z);\n}",
            fragmentShader: "#define GLSLIFY 1\nuniform vec3 uColor;\nuniform sampler2D uMaskTexture;\n\nvoid main()\n{\n    float mask = texture2D(uMaskTexture, gl_PointCoord).r;\n    gl_FragColor = vec4(uColor, mask);\n}"
        }),
        this.debug && this.debugFolder.addInput(this.material.uniforms.uSize, "value", {
            label: "uSize",
            min: 1,
            max: 100,
            step: 1
        })
    }
    setPoints() {
        this.points = new js(this.geometry,this.material),
        this.scene.add(this.points)
    }
    update() {
        this.flowField.update(),
        this.material.uniforms.uFBOTexture.value = this.flowField.texture
    }
}
class Ld {
    constructor(e) {
        this.experience = new Od,
        this.debug = this.experience.debug,
        this.resources = this.experience.resources,
        this.scene = this.experience.scene,
        this.time = this.experience.time,
        this.debug = e.debugFolder,
        this.colors = e.colors,
        this.setGeometry(),
        this.setMaterial(),
        this.setMesh()
    }
    setGeometry() {
        this.geometry = new Nn(3,3,1,1)
    }
    setMaterial() {
        this.material = new xn({
            transparent: !0,
            blending: 2,
            side: 2,
            depthWrite: !1,
            uniforms: {
                uTime: {
                    value: 0
                },
                uColorA: {
                    value: this.colors.a.instance
                },
                uColorB: {
                    value: this.colors.b.instance
                },
                uColorC: {
                    value: this.colors.c.instance
                }
            },
            vertexShader: "#define GLSLIFY 1\nvarying vec2 vUv;\n\nvoid main()\n{\n    vec4 modelPosition = modelMatrix * vec4(position, 1.0);\n    vec4 viewPosition = viewMatrix * modelPosition;\n    gl_Position = projectionMatrix * viewPosition;\n\n    vUv = uv;\n}",
            fragmentShader: "#define GLSLIFY 1\n#define M_PI 3.1415926535897932384626433832795\n\nuniform vec3 uColorA;\nuniform vec3 uColorB;\nuniform vec3 uColorC;\nuniform float uTime;\n\nvarying vec2 vUv;\n\n//\tClassic Perlin 3D Noise \n//\tby Stefan Gustavson\n//\nvec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}\nvec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}\nvec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}\n\nfloat perlin3d(vec3 P)\n{\n    vec3 Pi0 = floor(P); // Integer part for indexing\n    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1\n    Pi0 = mod(Pi0, 289.0);\n    Pi1 = mod(Pi1, 289.0);\n    vec3 Pf0 = fract(P); // Fractional part for interpolation\n    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n    vec4 iy = vec4(Pi0.yy, Pi1.yy);\n    vec4 iz0 = Pi0.zzzz;\n    vec4 iz1 = Pi1.zzzz;\n\n    vec4 ixy = permute(permute(ix) + iy);\n    vec4 ixy0 = permute(ixy + iz0);\n    vec4 ixy1 = permute(ixy + iz1);\n\n    vec4 gx0 = ixy0 / 7.0;\n    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;\n    gx0 = fract(gx0);\n    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n    vec4 sz0 = step(gz0, vec4(0.0));\n    gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n    gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n    vec4 gx1 = ixy1 / 7.0;\n    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;\n    gx1 = fract(gx1);\n    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n    vec4 sz1 = step(gz1, vec4(0.0));\n    gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n    gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n    g000 *= norm0.x;\n    g010 *= norm0.y;\n    g100 *= norm0.z;\n    g110 *= norm0.w;\n    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n    g001 *= norm1.x;\n    g011 *= norm1.y;\n    g101 *= norm1.z;\n    g111 *= norm1.w;\n\n    float n000 = dot(g000, Pf0);\n    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n    float n111 = dot(g111, Pf1);\n\n    vec3 fade_xyz = fade(Pf0);\n    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); \n    return 2.2 * n_xyz;\n}\n\nvoid main()\n{\n    vec2 centeredUv = vUv - 0.5;\n    float distanceToCenter = length(centeredUv);\n\n    float colorMixA = pow(distanceToCenter * 3.0, 4.0);\n    vec3 color = mix(uColorA, uColorB, colorMixA);\n\n    float colorMixB = (distanceToCenter - 0.3) * 30.0;\n    colorMixB = clamp(colorMixB, 0.0, 1.0);\n    colorMixB = smoothstep(0.0, 1.0, colorMixB);\n    color = mix(color, uColorC, colorMixB);\n\n    float alpha = (distanceToCenter - 0.33) * 20.0;\n    alpha = 1.0 - alpha;\n    alpha = smoothstep(0.0, 1.0, alpha);\n    \n    gl_FragColor = vec4(color, alpha);\n}"
        })
    }
    setMesh() {
        this.mesh = new dn(this.geometry,this.material),
        this.scene.add(this.mesh)
    }
    update() {
        this.material.uniforms.uTime.value = this.time.elapsed
    }
}
class Rd {
    constructor(e) {
        this.experience = new Od,
        this.debug = this.experience.debug,
        this.resources = this.experience.resources,
        this.scene = this.experience.scene,
        this.time = this.experience.time,
        this.debug = e.debugFolder,
        this.colors = e.colors,
        this.setGeometry(),
        this.setMaterial(),
        this.setMesh()
    }
    setGeometry() {
        this.geometry = new Nn(3,3,1,1)
    }
    setMaterial() {
        this.material = new xn({
            transparent: !0,
            blending: 2,
            side: 2,
            depthWrite: !1,
            uniforms: {
                uTime: {
                    value: 0
                },
                uColorStart: {
                    value: this.colors.b.instance
                },
                uColorEnd: {
                    value: this.colors.c.instance
                }
            },
            vertexShader: "#define GLSLIFY 1\nvarying vec2 vUv;\n\nvoid main()\n{\n    vec4 modelPosition = modelMatrix * vec4(position, 1.0);\n    vec4 viewPosition = viewMatrix * modelPosition;\n    gl_Position = projectionMatrix * viewPosition;\n\n    vUv = uv;\n}",
            fragmentShader: "#define GLSLIFY 1\n#define M_PI 3.1415926535897932384626433832795\n\nuniform vec3 uColorStart;\nuniform vec3 uColorEnd;\nuniform float uTime;\n\nvarying vec2 vUv;\n\n//\tClassic Perlin 3D Noise \n//\tby Stefan Gustavson\n//\nvec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}\nvec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}\nvec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}\n\nfloat perlin3d(vec3 P)\n{\n    vec3 Pi0 = floor(P); // Integer part for indexing\n    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1\n    Pi0 = mod(Pi0, 289.0);\n    Pi1 = mod(Pi1, 289.0);\n    vec3 Pf0 = fract(P); // Fractional part for interpolation\n    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0\n    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);\n    vec4 iy = vec4(Pi0.yy, Pi1.yy);\n    vec4 iz0 = Pi0.zzzz;\n    vec4 iz1 = Pi1.zzzz;\n\n    vec4 ixy = permute(permute(ix) + iy);\n    vec4 ixy0 = permute(ixy + iz0);\n    vec4 ixy1 = permute(ixy + iz1);\n\n    vec4 gx0 = ixy0 / 7.0;\n    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;\n    gx0 = fract(gx0);\n    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);\n    vec4 sz0 = step(gz0, vec4(0.0));\n    gx0 -= sz0 * (step(0.0, gx0) - 0.5);\n    gy0 -= sz0 * (step(0.0, gy0) - 0.5);\n\n    vec4 gx1 = ixy1 / 7.0;\n    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;\n    gx1 = fract(gx1);\n    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);\n    vec4 sz1 = step(gz1, vec4(0.0));\n    gx1 -= sz1 * (step(0.0, gx1) - 0.5);\n    gy1 -= sz1 * (step(0.0, gy1) - 0.5);\n\n    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);\n    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);\n    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);\n    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);\n    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);\n    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);\n    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);\n    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);\n\n    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));\n    g000 *= norm0.x;\n    g010 *= norm0.y;\n    g100 *= norm0.z;\n    g110 *= norm0.w;\n    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));\n    g001 *= norm1.x;\n    g011 *= norm1.y;\n    g101 *= norm1.z;\n    g111 *= norm1.w;\n\n    float n000 = dot(g000, Pf0);\n    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));\n    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));\n    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));\n    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));\n    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));\n    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));\n    float n111 = dot(g111, Pf1);\n\n    vec3 fade_xyz = fade(Pf0);\n    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);\n    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);\n    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); \n    return 2.2 * n_xyz;\n}\n\nvoid main()\n{\n    vec2 centeredUv = vUv - 0.5;\n    float distanceToCenter = length(centeredUv);\n    float angle = atan(centeredUv.x, centeredUv.y) / (M_PI * 2.0) + 0.5;\n    vec2 smokeUv = vec2(distanceToCenter, angle);\n\n    float halo = smoothstep(0.0, 1.0, 1.0 - abs(distanceToCenter - 0.34) * 20.0);\n\n    float smoke = perlin3d(vec3(smokeUv * vec2(50.0, 15.0), uTime * 0.001));\n    smoke *= halo;\n    smoke *= 2.0;\n\n    vec3 color = mix(uColorStart, uColorEnd, smoke);\n\n    gl_FragColor = vec4(color, smoke);\n    // gl_FragColor = vec4(vUv, 1.0, 1.0);\n}"
        })
    }
    setMesh() {
        this.mesh = new dn(this.geometry,this.material),
        this.scene.add(this.mesh)
    }
    update() {
        this.material.uniforms.uTime.value = this.time.elapsed
    }
}
class Id {
    constructor(e) {
        this.experience = new Od,
        this.config = this.experience.config,
        this.resources = this.experience.resources,
        this.scene = this.experience.scene,
        this.time = this.experience.time,
        this.world = this.experience.world,
        this.debug = e.debugFolder,
        this.colors = e.colors,
        this.count = 40,
        this.group = new Vr,
        this.scene.add(this.group),
        this.dummy = new ut,
        this.setGeometry(),
        this.setItems()
    }
    setGeometry() {
        this.geometry = new Nn(1,1,1,1)
    }
    setItems() {
        this.items = [];
        for (let e = 0; e < this.count; e++) {
            const t = {};
            t.floatingSpeed = .5 * Math.random(),
            t.rotationSpeed = (Math.random() - .5) * Math.random() * 2e-4 + 2e-4,
            t.progress = Math.random(),
            t.material = new It({
                depthWrite: !1,
                transparent: !0,
                blending: 2,
                alphaMap: this.resources.items.smokeTexture,
                side: 2,
                opacity: 1
            }),
            t.material.color = this.colors.b.instance,
            t.scale = .2 + .5 * Math.random(),
            t.angle = Math.random() * Math.PI * 2,
            t.mesh = new dn(this.geometry,t.material),
            t.mesh.position.z = 5e-4 * (e + 1),
            this.group.add(t.mesh),
            this.items.push(t)
        }
    }
    resize() {}
    update() {
        const e = this.time.elapsed + 123456789.123;
        for (const t of this.items) {
            t.progress += 1e-4 * this.time.delta,
            t.progress > 1 && (t.progress = 0),
            t.material.opacity = Math.min(2 * (1 - t.progress), 4 * t.progress),
            t.material.opacity = Math.min(t.material.opacity, 1),
            t.material.opacity *= .25;
            let n = Math.min(4 * t.progress, 1);
            n = 1 - Math.pow(1 - n, 4);
            const i = n * t.scale;
            t.mesh.scale.set(i, i, i),
            t.mesh.rotation.z = e * t.rotationSpeed;
            const r = 1 - t.progress * t.floatingSpeed;
            t.mesh.position.x = Math.sin(t.angle) * r,
            t.mesh.position.y = Math.cos(t.angle) * r
        }
    }
}
class Dd {
    constructor(e) {
        this.experience = new Od,
        this.config = this.experience.config,
        this.resources = this.experience.resources,
        this.scene = this.experience.scene,
        this.time = this.experience.time,
        this.world = this.experience.world,
        this.debug = e.debugFolder,
        this.colors = e.colors,
        this.count = 4,
        this.group = new Vr,
        this.scene.add(this.group),
        this.dummy = new ut,
        this.setGeometry(),
        this.setItems()
    }
    setGeometry() {
        this.geometry = new Nn(1,1,1,1)
    }
    setItems() {
        this.items = [];
        for (let e = 0; e < this.count; e++) {
            const t = {};
            t.floatingSpeed = .5 * Math.random(),
            t.rotationSpeed = (Math.random() - .5) * Math.random() * 2e-4 + 2e-4,
            t.progress = Math.random(),
            t.material = new xn({
                depthWrite: !1,
                transparent: !0,
                blending: 2,
                side: 2,
                uniforms: {
                    uMaskTexture: {
                        value: this.resources.items.lightningTexture
                    },
                    uColor: {
                        value: this.colors.c.instance
                    },
                    uAlpha: {
                        value: 1
                    }
                },
                vertexShader: "#define GLSLIFY 1\nvarying vec3 vModelPosition;\nvarying vec2 vUv;\n\nvoid main()\n{\n    vec4 modelPosition = modelMatrix * vec4(position, 1.0);\n    vec4 viewPosition = viewMatrix * modelPosition;\n    gl_Position = projectionMatrix * viewPosition;\n\n    vModelPosition = modelPosition.xyz;\n    vUv = uv;\n}",
                fragmentShader: "#define GLSLIFY 1\nuniform sampler2D uMaskTexture;\nuniform vec3 uColor;\nuniform float uAlpha;\n\nvarying vec3 vModelPosition;\nvarying vec2 vUv;\n\nvoid main()\n{\n    float outerAlpha = min(1.0, 1.0 - (length(vModelPosition.xy) - 1.0) * 10.0);\n\n    float maskStrength = texture2D(uMaskTexture, vUv).r * outerAlpha * uAlpha;\n    \n    gl_FragColor = vec4(uColor, maskStrength);\n}"
            }),
            t.scale = .5 + 1.5 * Math.random(),
            t.angle = Math.random() * Math.PI * 2,
            t.mesh = new dn(this.geometry,t.material),
            t.mesh.position.z = 5e-4 * -(e + .5),
            this.group.add(t.mesh),
            this.items.push(t)
        }
    }
    resize() {}
    update() {
        const e = this.time.elapsed + 123456789.123;
        for (const t of this.items) {
            t.progress += 5e-4 * this.time.delta,
            t.progress > 1 && (t.progress = 0,
            t.angle = Math.random() * Math.PI * 2),
            t.material.uniforms.uAlpha.value = Math.min(8 * (1 - t.progress), 200 * t.progress),
            t.material.uniforms.uAlpha.value = Math.min(t.material.uniforms.uAlpha.value, 1),
            t.mesh.rotation.z = e * t.rotationSpeed;
            const n = 1 - t.progress * t.floatingSpeed;
            t.mesh.position.x = Math.sin(t.angle) * n,
            t.mesh.position.y = Math.cos(t.angle) * n
        }
    }
}
class Nd {
    constructor(e) {
        this.experience = new Od,
        this.debug = this.experience.debug,
        this.scene = this.experience.scene,
        this.colorsSetting = e.colors,
        this.debug && (this.debugFolder = this.debug.addFolder({
            title: "portal",
            expanded: !1
        })),
        this.group = new Vr,
        this.scene.add(this.group),
        this.setColors(),
        this.setParticles(),
        this.setHalo(),
        this.setEventHorizon(),
        this.setSmoke(),
        this.setLightnins()
    }
    setColors() {
        this.colors = {};
        for (let e in this.colorsSetting) {
            const t = {};
            t.value = this.colorsSetting[e],
            t.instance = new Rt(t.value),
            this.colors[e] = t
        }
        if (this.debug)
            for (const e in this.colors) {
                const t = this.colors[e];
                this.debugFolder.addInput(t, "value", {
                    label: e,
                    view: "color"
                }).on("change", ( () => {
                    t.instance.set(t.value)
                }
                ))
            }
    }
    setParticles() {
        this.particles = new Ad({
            debugFolder: this.debugFolder,
            colors: this.colors
        }),
        this.group.add(this.particles.points)
    }
    setHalo() {
        this.halo = new Ld({
            debugFolder: this.debugFolder,
            colors: this.colors
        }),
        this.group.add(this.halo.mesh)
    }
    setEventHorizon() {
        this.eventHorizon = new Rd({
            debugFolder: this.debugFolder,
            colors: this.colors
        }),
        this.group.add(this.eventHorizon.mesh)
    }
    setSmoke() {
        this.smoke = new Id({
            debugFolder: this.debugFolder,
            colors: this.colors
        }),
        this.group.add(this.smoke.group)
    }
    setLightnins() {
        this.lightnings = new Dd({
            debugFolder: this.debugFolder,
            colors: this.colors
        }),
        this.group.add(this.lightnings.group)
    }
    update() {
        this.particles.update(),
        this.halo.update(),
        this.eventHorizon.update(),
        this.smoke.update(),
        this.lightnings.update()
    }
}
class kd {
    constructor(e) {
        this.experience = new Od,
        this.debug = this.experience.debug,
        this.scene = this.experience.scene,
        this.resources = this.experience.resources,
        this.renderer = this.experience.renderer,
        this.debug && (this.debugFolder = this.debug.addFolder({
            title: "environment"
        })),
        this.setTextures(),
        this.setFloor(),
        this.setLights(),
        this.setDoomGuy()
    }
    setTextures() {
        this.textures = {},
        this.textures.repeatCount = 2,
        this.textures.color = this.resources.items.floorColorTexture,
        this.textures.color.encoding = N,
        this.textures.color.wrapS = i,
        this.textures.color.wrapT = i,
        this.textures.color.repeat.set(this.textures.repeatCount, this.textures.repeatCount),
        this.textures.normal = this.resources.items.floorNormalTexture,
        this.textures.normal.wrapS = i,
        this.textures.normal.wrapT = i,
        this.textures.normal.repeat.set(this.textures.repeatCount, this.textures.repeatCount),
        this.textures.displacement = this.resources.items.floorDisplacementTexture,
        this.textures.displacement.wrapS = i,
        this.textures.displacement.wrapT = i,
        this.textures.displacement.repeat.set(this.textures.repeatCount, this.textures.repeatCount),
        this.textures.roughness = this.resources.items.floorRoughnessTexture,
        this.textures.roughness.wrapS = i,
        this.textures.roughness.wrapT = i,
        this.textures.roughness.repeat.set(this.textures.repeatCount, this.textures.repeatCount)
    }
    setFloor() {
        this.floor = {},
        this.floor.clean = !1,
        this.floor.geometry = new Nn(10,10,500,500),
        this.floor.geometry.rotateX(.5 * -Math.PI),
        this.floor.geometry.attributes.uv2 = this.floor.geometry.attributes.uv,
        this.floor.normalScale = 1,
        this.floor.material = new Wo({
            map: this.textures.color,
            normalMap: this.textures.normal,
            normalScale: new Q(this.floor.normalScale,this.floor.normalScale),
            displacementMap: this.textures.displacement,
            displacementScale: .1,
            roughnessMap: this.textures.roughness,
            roughness: 1
        }),
        this.floor.material.onBeforeCompile = e => {
            e.fragmentShader = e.fragmentShader.replace("gl_FragColor = vec4(", `\n                    float fadeOut = length(vUv - ${(.5 * this.textures.repeatCount).toFixed(2)});\n                    fadeOut -= 0.4;\n                    fadeOut *= 2.0;\n                    fadeOut = smoothstep(0.0, 1.0, fadeOut);\n                    outgoingLight = mix(outgoingLight, vec3(0.0), fadeOut);\n                    // outgoingLight = vec3(fadeOut);\n                    gl_FragColor = vec4(\n                `)
        }
        ,
        this.floor.mesh = new dn(this.floor.geometry,this.floor.material),
        this.floor.mesh.position.y = -.95,
        this.floor.mesh.receiveShadow = !0,
        this.scene.add(this.floor.mesh),
        this.debug && (this.floor.debugFolder = this.debugFolder.addFolder({
            title: "floor"
        }),
        this.floor.debugFolder.addInput(this.floor.material, "displacementScale", {
            min: 0,
            max: 1,
            step: .001
        }),
        this.floor.debugFolder.addInput(this.floor.material, "wireframe"),
        this.floor.debugFolder.addInput(this.floor, "normalScale", {
            min: 0,
            max: 2,
            step: .001
        }).on("change", ( () => {
            this.floor.material.normalScale.set(this.floor.normalScale, this.floor.normalScale)
        }
        )),
        this.floor.debugFolder.addInput(this.floor.material, "roughness", {
            min: 0,
            max: 5,
            step: .001
        }),
        this.floor.debugFolder.addInput(this.floor.mesh.position, "y", {
            min: -2,
            max: 0,
            step: .001
        }),
        this.floor.debugFolder.addInput(this.floor, "clean").on("change", ( () => {
            this.floor.clean ? (this.floor.material.map = null,
            this.floor.material.normalMap = null,
            this.floor.material.displacementMap = null) : (this.floor.material.map = this.textures.color,
            this.floor.material.normalMap = this.textures.normal,
            this.floor.material.displacementMap = this.textures.displacement),
            this.floor.material.needsUpdate = !0
        }
        )))
    }
    setLights() {
        if (this.lights = {},
        this.debug && (this.lights.debugFolder = this.debug.addFolder({
            title: "lights"
        })),
        this.lights.items = {},
        this.lights.items.a = {},
        this.lights.items.a.color = "#ff0a00",
        this.lights.items.a.instance = new Ia(this.lights.items.a.color,11),
        this.lights.items.a.instance.rotation.y = Math.PI,
        this.lights.items.a.instance.position.y = -.5,
        this.lights.items.a.instance.position.z = -1.501,
        this.lights.items.a.instance.castShadow = !0,
        this.lights.items.a.instance.shadow.camera.far = 7,
        this.lights.items.a.instance.shadow.normalBias = .005,
        this.scene.add(this.lights.items.a.instance),
        this.lights.items.b = {},
        this.lights.items.b.color = "#0059ff",
        this.lights.items.b.instance = new Ia(this.lights.items.b.color,11),
        this.lights.items.b.instance.position.y = -.5,
        this.lights.items.b.instance.position.z = 1.501,
        this.lights.items.b.instance.castShadow = !0,
        this.lights.items.b.instance.shadow.camera.far = 7,
        this.lights.items.b.instance.shadow.normalBias = .005,
        this.scene.add(this.lights.items.b.instance),
        this.debug)
            for (const e in this.lights.items) {
                const t = this.lights.items[e];
                this.lights.debugFolder.addInput(t.instance.position, "y", {
                    label: `${e}Y`,
                    min: -2,
                    max: 2,
                    step: .001
                }),
                this.lights.debugFolder.addInput(t, "color", {
                    label: `${e}Color`,
                    view: "color"
                }).on("change", ( () => {
                    t.instance.color.set(t.color)
                }
                )),
                this.lights.debugFolder.addInput(t.instance, "intensity", {
                    label: `${e}Intensity`,
                    min: 0,
                    max: 20,
                    step: .01
                })
            }
    }
    setDoomGuy() {
        this.doomGuy = {},
        this.doomGuy.scale = .017,
        this.doomGuy.model = this.resources.items.doomGuyModel.scene,
        this.doomGuy.model.scale.set(this.doomGuy.scale, this.doomGuy.scale, this.doomGuy.scale),
        this.doomGuy.model.position.y = -.93,
        this.doomGuy.model.rotation.y = -2.595,
        this.doomGuy.model.traverse((e => {
            e instanceof dn && (e.receiveShadow = !0,
            e.castShadow = !0)
        }
        )),
        this.scene.add(this.doomGuy.model),
        this.debug && (this.doomGuy.debugFolder = this.debugFolder.addFolder({
            title: "doomGuy"
        }),
        this.doomGuy.debugFolder.addInput(this.doomGuy.model.position, "y", {
            label: "positionY",
            min: -2,
            max: 0,
            step: .001
        }).on("change", ( () => {
            this.renderer.instance.shadowMap.needsUpdate = !0
        }
        )),
        this.doomGuy.debugFolder.addInput(this.doomGuy.model.rotation, "y", {
            label: "rotationY",
            min: -Math.PI,
            max: Math.PI,
            step: .001
        }).on("change", ( () => {
            this.renderer.instance.shadowMap.needsUpdate = !0
        }
        )),
        this.doomGuy.debugFolder.addInput(this.doomGuy, "scale", {
            min: .01,
            max: .04,
            step: 1e-4
        }).on("change", ( () => {
            this.doomGuy.model.scale.set(this.doomGuy.scale, this.doomGuy.scale, this.doomGuy.scale),
            this.renderer.instance.shadowMap.needsUpdate = !0
        }
        )))
    }
}
class Fd {
    constructor(e) {
        this.experience = new Od,
        this.config = this.experience.config,
        this.scene = this.experience.scene,
        this.resources = this.experience.resources,
        this.resources.on("groupEnd", (e => {
            "base" === e.name && (this.setPortals(),
            this.setEnvironment())
        }
        ))
    }
    setPortals() {
        this.portalA = new Nd({
            colors: {
                a: "#130000",
                b: "#ff000a",
                c: "#ff661e"
            }
        }),
        this.portalA.group.position.z = -1.5,
        this.portalB = new Nd({
            colors: {
                a: "#000813",
                b: "#0078ff",
                c: "#279fff"
            }
        }),
        this.portalB.group.position.z = 1.5
    }
    setEnvironment() {
        this.environment = new kd
    }
    resize() {}
    update() {
        this.portalA && this.portalA.update(),
        this.portalB && this.portalB.update()
    }
    destroy() {}
}
const zd = [{
    name: "base",
    data: {},
    items: [{
        name: "smokeTexture",
        source: "./resouces/smoke.png",
        type: "texture"
    }, {
        name: "lightningTexture",
        source: "./resouces/lightning.png",
        type: "texture"
    }, {
        name: "particleMaskTexture",
        source: "./resouces/particleMask.png",
        type: "texture"
    }, {
        name: "doomGuyModel",
        source: "./resouces/doomGuy/doomGuyModel.glb"
    }, {
        name: "floorColorTexture",
        source: "./resouces/floor/GroundForest003_COL_VAR1_3K.jpg",
        type: "texture"
    }, {
        name: "floorNormalTexture",
        source: "./resouces/floor/GroundForest003_NRM_3K.jpg",
        type: "texture"
    }, {
        name: "floorDisplacementTexture",
        source: "./resouces/floor/GroundForest003_DISP_3K.jpg",
        type: "texture"
    }, {
        name: "floorRoughnessTexture",
        source: "./resouces/floor/GroundForest003_ROUGH_3K.jpg",
        type: "texture"
    }]
}];
class Od {
    static instance;
    constructor(e={}) {
        if (Od.instance)
            return Od.instance;
        Od.instance = this,
        this.targetElement = e.targetElement,
        this.targetElement ? (this.time = new Ml,
        this.sizes = new Sl,
        this.setConfig(),
        this.setStats(),
        this.setDebug(),
        this.setScene(),
        this.setCamera(),
        this.setRenderer(),
        this.setResources(),
        this.setWorld(),
        this.sizes.on("resize", ( () => {
            this.resize()
        }
        )),
        this.update()) : console.warn("Missing 'targetElement' property")
    }
    setConfig() {
        this.config = {},
        this.config.debug = "#debug" === window.location.hash,
        this.config.pixelRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2);
        const e = this.targetElement.getBoundingClientRect();
        this.config.width = e.width,
        this.config.height = e.height || window.innerHeight
    }
    setStats() {
        this.config.debug && (this.stats = new Cl(!0))
    }
    setDebug() {
        this.config.debug && (this.debug = new bl.Pane,
        this.debug.containerElem_.style.width = "320px")
    }
    setScene() {
        this.scene = new Kr
    }
    setCamera() {
        this.camera = new Cd
    }
    setRenderer() {
        this.renderer = new wd({
            rendererInstance: this.rendererInstance
        }),
        this.targetElement.appendChild(this.renderer.instance.domElement)
    }
    setResources() {
        this.resources = new ld(zd)
    }
    setWorld() {
        this.world = new Fd
    }
    update() {
        this.stats && this.stats.update(),
        this.camera.update(),
        this.world && this.world.update(),
        this.renderer && this.renderer.update(),
        window.requestAnimationFrame(( () => {
            this.update()
        }
        ))
    }
    resize() {
        const e = this.targetElement.getBoundingClientRect();
        this.config.width = e.width,
        this.config.height = e.height,
        this.config.pixelRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2),
        this.camera && this.camera.resize(),
        this.renderer && this.renderer.resize(),
        this.world && this.world.resize()
    }
    destroy() {}
}
window.experience = new Od({
    targetElement: document.querySelector(".experience")
})
