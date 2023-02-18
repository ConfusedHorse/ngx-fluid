import { ProgramEntity } from '../entities/program';

export interface Programs {
  blurProgram: ProgramEntity;
  copyProgram: ProgramEntity;
  clearProgram: ProgramEntity;
  colorProgram: ProgramEntity;
  checkerboardProgram: ProgramEntity;
  bloomPrefilterProgram: ProgramEntity;
  bloomBlurProgram: ProgramEntity;
  bloomFinalProgram: ProgramEntity;
  sunraysMaskProgram: ProgramEntity;
  sunraysProgram: ProgramEntity;
  splatProgram: ProgramEntity;
  advectionProgram: ProgramEntity;
  divergenceProgram: ProgramEntity;
  curlProgram: ProgramEntity;
  vorticityProgram: ProgramEntity;
  pressureProgram: ProgramEntity;
  gradienSubtractProgram: ProgramEntity;
}

