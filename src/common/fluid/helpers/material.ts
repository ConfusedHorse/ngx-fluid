import { MaterialEntity } from '../entities/material';

export function createMaterial(renderingContext: WebGL2RenderingContext, vertexShader: WebGLShader): MaterialEntity {
  return new MaterialEntity(renderingContext, vertexShader);
}

