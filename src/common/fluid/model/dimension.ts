export interface Dimension {
  width: number;
  height: number;
}

export interface TexCoordinates {
  x: number;
  y: number;
}

export interface TexMovement extends TexCoordinates {
  deltaX: number;
  deltaY: number;
}
