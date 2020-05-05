import { Emitter } from './emitter';
import { Parser } from './parser';

export type Options = {
  trackPositions?: boolean;
};

let parseFragment = Parser.parseFragment;
let parseAlgorithm = Parser.parseAlgorithm;
let emit = Emitter.emit;
let fragment = (str: string, options?: Options) => Emitter.emit(Parser.parseFragment(str, options));
let algorithm = (str: string, options?: Options) =>
  Emitter.emit(Parser.parseAlgorithm(str, options));

export { parseFragment, parseAlgorithm, emit, fragment, algorithm };
