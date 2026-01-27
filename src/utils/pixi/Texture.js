class Texture {
  constructor(img) {
    this.img = img;
  }
  static fromURL(url, onload) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => onload && onload(new Texture(img));
    img.onerror = () => onload && onload(null);
    img.src = url;
  }
}

export { Texture };
