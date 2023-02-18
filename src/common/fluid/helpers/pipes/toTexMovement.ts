import { filter, map, OperatorFunction, pairwise, pipe } from 'rxjs';
import { TexCoordinates, TexMovement } from '../../model/dimension';
import { correctDeltaX, correctDeltaY, scaleByPixelRatio } from '../dimension';

type InteractionCoordinates = Pick<MouseEvent, 'clientX' | 'clientY'>;

export default (canvas: HTMLCanvasElement | OffscreenCanvas): OperatorFunction<InteractionCoordinates, TexMovement> => pipe(
  map<InteractionCoordinates, TexCoordinates>(({ clientX, clientY }: InteractionCoordinates) => ({
    x: scaleByPixelRatio(clientX) / canvas.width,
    y: scaleByPixelRatio(clientY) / canvas.height
  })),
  pairwise(),
  map<[TexCoordinates, TexCoordinates], TexMovement>(([ previous, current ]) => ({
    x: current.x,
    y: 1 - current.y,
    deltaX: correctDeltaX(current.x - previous.x, canvas),
    deltaY: correctDeltaY(previous.y - current.y, canvas)
  })),
  filter<TexMovement>(texMovement => Math.abs(texMovement.deltaX) > 0 || Math.abs(texMovement.deltaY) > 0)
);
