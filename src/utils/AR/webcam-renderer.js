import * as THREE from "three";
/**
 * 这里实现把 相机的内容当做 three.js 背景
 */
class WebcamRenderer {
  constructor(renderer, videoElement) {
    this.renderer = renderer;
    this.renderer.autoClear = false;
    this.sceneWebcam = new THREE.Scene(); // 创建一个场景
    let video;
    // 如果参数没有传递一个视频组件，则创建一个视频组件添加到文档流中
    if (videoElement === undefined) {
      video = document.createElement("video");
      video.setAttribute("autoplay", true);
      video.setAttribute("playsinline", true);
      video.style.display = "none";
      document.body.appendChild(video); 
    } else {
      video = document.querySelector(videoElement);
    }
    /**
     * 【注意：】这里有一个简便的方法就是设置平面的长宽为1*1，那么对应的正交相机尺寸也在-0.5，到 0.5 之间，和是1，与平面相等
     * 就可以铺满整个窗口
     */
    this.geom = new THREE.PlaneGeometry(window.innerWidth,window.innerHeight); // 这里定义一个平面
    this.texture = new THREE.VideoTexture(video);
    this.material = new THREE.MeshBasicMaterial({ map: this.texture,side:THREE.DoubleSide,wireframe:false });
    //this.geom = new THREE.BoxGeometry(0.51,0.51,0.51);
    const mesh = new THREE.Mesh(this.geom, this.material);
    this.sceneWebcam.add(mesh);
    //mesh.rotateY ( -Math.PI / 6);
    this.cameraWebcam = new THREE.OrthographicCamera(
      // -0.5, // 对应上面的1*1 的平面
      // 0.5,
      // 0.5,
      // -0.5,
      -window.innerWidth /2,window.innerWidth/2,
      window.innerHeight/2,- window.innerHeight/2, // 场景的一半
      0,
      100
    );
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = {
        video: {
          width: 1280,
          height: 720,
          facingMode: "environment",
        },
      };
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          console.log(`using the webcam successfully...`);
          video.srcObject = stream;
          video.play();
        })
        .catch((e) => {
          alert(`Webcam error: ${e}`);
        });
    } else {
      alert("sorry - media devices API not supported");
    }
  }

  update() {
    this.renderer.clear();
    this.renderer.render(this.sceneWebcam, this.cameraWebcam);
    this.renderer.clearDepth();
  }

  dispose() {
    this.material.dispose();
    this.texture.dispose();
    this.geom.dispose();
  }
}

export { WebcamRenderer };
