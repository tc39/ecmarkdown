import type { Node } from './node-types';

const childKeys = {
  opaqueTag: [],
  tag: [],
  comment: [],
  algorithm: ['contents'],
  text: [],
  star: ['contents'],
  underscore: ['contents'],
  tick: ['contents'],
  tilde: ['contents'],
  pipe: [],
  ul: ['contents'],
  ol: ['contents'],
  'ordered-list-item': ['contents'],
  'unordered-list-item': ['contents'],
};

export type Observer = {
  enter?: (node: Node) => void;
  exit?: (node: Node) => void;
};

export class Visitor {
  observer: Observer;

  static visit(ast: Node, observer: Observer) {
    new Visitor(observer).genericallyVisit(ast);
  }

  constructor(observer: Observer) {
    this.observer = observer;
  }

  genericallyVisit(node: Node) {
    this.observer.enter?.(node);
    // @ts-ignore
    for (let childKey of childKeys[node.name]) {
      // @ts-ignore
      let child: Node | Node[] = node[childKey];
      if (Array.isArray(child)) {
        for (let c of child) {
          this.genericallyVisit(c);
        }
      } else {
        this.genericallyVisit(child);
      }
    }
    this.observer.exit?.(node);
  }
}
