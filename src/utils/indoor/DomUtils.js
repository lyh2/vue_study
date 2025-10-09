export function getElementRect(element) {
  if (!element) return { left: 0, top: 0, width: 0, height: 0 };

  const rect = element.getBoundingClientRect();
  console.log('rect:', rect);
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  };
}

export function getElementLeft(element) {
  return getElementRect(element).left;
}

export function getElementTop(element) {
  return getElementRect(element).top;
}

export function getPos(element) {
  return [getElementLeft(element), getElementTop(element)];
}
export function getTranslateString(point, is3d = false) {
  return `translate${is3d ? '3d' : ''}(${point[0]}px,${point[1]}px${is3d ? ',0' : ''})`;
}
export function setPos(element, point, is3d = false) {
  element._idm_pos = point;
  element.style['transform'] = getTranslateString(point, is3d);
}
