export function scaleByPixelRatio(pixels: number): number {
  const ratio = window.devicePixelRatio || 1;
  return Math.floor(pixels * ratio);
}
