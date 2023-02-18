export interface CompiledShaders {
  baseVertexShader: WebGLShader;
  blurVertexShader: WebGLShader;
  blurShader: WebGLShader;
  copyShader: WebGLShader;
  clearShader: WebGLShader;
  colorShader: WebGLShader;
  checkerboardShader: WebGLShader;
  bloomPrefilterShader: WebGLShader;
  bloomBlurShader: WebGLShader;
  bloomFinalShader: WebGLShader;
  sunraysMaskShader: WebGLShader;
  sunraysShader: WebGLShader;
  splatShader: WebGLShader;
  advectionShader: WebGLShader;
  divergenceShader: WebGLShader;
  curlShader: WebGLShader;
  vorticityShader: WebGLShader;
  pressureShader: WebGLShader;
  gradientSubtractShader: WebGLShader;
}
