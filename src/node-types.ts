export type Position = {
  line: number;
  column: number;
  offset: number;
};

export type LocationRange = {
  start: Position;
  end: Position;
};

export type Located = {
  location: LocationRange;
};

export type EOFToken = {
  name: 'EOF';
  done: true;
};

export type Format = 'star' | 'underscore' | 'tick' | 'pipe' | 'tilde';

export type FormatToken = {
  name: Format;
  contents: string;
};

export type ParabreakToken = {
  name: 'parabreak';
  contents: string;
};

export type LinebreakToken = {
  name: 'linebreak';
  contents: string;
};

export type WhitespaceToken = {
  name: 'whitespace';
  contents: string;
};

export type TextToken = {
  name: 'text';
  contents: string;
};

export type CommentToken = {
  name: 'comment';
  contents: string;
};

export type OpaqueTagToken = {
  name: 'opaqueTag';
  contents: string;
};

export type TagToken = {
  name: 'tag';
  contents: string;
};

export type UnorderedListToken = {
  name: 'ul';
  contents: string;
};

export type OrderedListToken = {
  name: 'ol';
  contents: string;
};

export type IdToken = {
  name: 'id';
  value: string;
};

export type Token =
  | EOFToken
  | FormatToken
  | ParabreakToken
  | LinebreakToken
  | WhitespaceToken
  | TextToken
  | CommentToken
  | TagToken
  | UnorderedListToken
  | OrderedListToken
  | OpaqueTagToken;

export type NotEOFToken = Exclude<Token, EOFToken>;

export type LocatedToken = Token & Located;

export type OpaqueTagNode = {
  name: 'opaqueTag';
  contents: string;
};

export type TagNode = {
  name: 'tag';
  contents: string;
};

export type CommentNode = {
  name: 'comment';
  contents: string;
};

export type AlgorithmNode = {
  name: 'algorithm';
  contents: OrderedListNode;
};

export type TextNode = {
  name: 'text';
  contents: string;
};

export type StarNode = {
  name: 'star';
  contents: FragmentNode[];
};

export type UnderscoreNode = {
  name: 'underscore';
  contents: FragmentNode[];
};

export type TickNode = {
  name: 'tick';
  contents: FragmentNode[];
};

export type TildeNode = {
  name: 'tilde';
  contents: FragmentNode[];
};

export type PipeNode = {
  name: 'pipe';
  nonTerminal: string;
  params: string;
  optional: boolean;
  contents: null;
};

export type FormatNode = StarNode | UnderscoreNode | TickNode | TildeNode | PipeNode;

export type UnorderedListNode = {
  name: 'ul';
  indent: number;
  contents: UnorderedListItemNode[];
};

export type OrderedListNode = {
  name: 'ol';
  indent: number;
  start: number;
  contents: OrderedListItemNode[];
};

export type UnorderedListItemNode = {
  name: 'unordered-list-item';
  contents: FragmentNode[];
  sublist: ListNode | null;
  id: string | null;
};

export type OrderedListItemNode = {
  name: 'ordered-list-item';
  contents: FragmentNode[];
  sublist: ListNode | null;
  id: string | null;
};

export type FragmentNode = TextNode | FormatNode | CommentNode | TagNode | OpaqueTagNode;

export type ListNode = UnorderedListNode | OrderedListNode;

export type Node =
  | OpaqueTagNode
  | TagNode
  | CommentNode
  | AlgorithmNode
  | TextNode
  | StarNode
  | UnderscoreNode
  | TickNode
  | TildeNode
  | PipeNode
  | UnorderedListNode
  | OrderedListNode
  | UnorderedListItemNode
  | OrderedListItemNode;

export type LocatedNode = Node & Located;
