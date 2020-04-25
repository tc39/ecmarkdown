import { Emitter } from './emitter';
import { Parser } from './parser';

export type Options = {
  trackPositions?: boolean;
};

let parse = Parser.parse;
let emit = Emitter.emit;
let process = (str: string, options: Options) => Emitter.emit(Parser.parse(str, options));

export { parse, emit, process };
