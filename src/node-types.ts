export type Position = {
  line: number;
  column: number;
  offset: number;
};

export type LocationRange = {
  start: Position;
  end: Position;
};

export type EOFToken = {
  name: 'EOF';
  done: true;
  location?: LocationRange;
};

export type Format = 'star' | 'underscore' | 'tick' | 'pipe' | 'tilde';

export type FormatToken = {
  name: Format;
  contents: string;
  location?: LocationRange;
};

export type ParabreakToken = {
  name: 'parabreak';
  contents: string;
  location?: LocationRange;
};

export type LinebreakToken = {
  name: 'linebreak';
  contents: string;
  location?: LocationRange;
};

export type WhitespaceToken = {
  name: 'whitespace';
  contents: string;
  location?: LocationRange;
};

export type TextToken = {
  name: 'text';
  contents: string;
  location?: LocationRange;
};

export type CommentToken = {
  name: 'comment';
  contents: string;
  location?: LocationRange;
};

export type OpaqueTagToken = {
  name: 'opaqueTag';
  contents: string;
  location?: LocationRange;
};

export type TagToken = {
  name: 'tag';
  contents: string;
  location?: LocationRange;
};

export type UnorderedListToken = {
  name: 'ul';
  contents: string;
  location?: LocationRange;
};

export type OrderedListToken = {
  name: 'ol';
  contents: string;
  location?: LocationRange;
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

export type OpaqueTagNode = {
  name: 'opaqueTag';
  contents: string;
  location?: LocationRange;
};

export type TagNode = {
  name: 'tag';
  contents: string;
  location?: LocationRange;
};

export type CommentNode = {
  name: 'comment';
  contents: string;
  location?: LocationRange;
};

export type AlgorithmNode = {
  name: 'algorithm';
  contents: OrderedListNode;
  location?: LocationRange;
};

export type TextNode = {
  name: 'text';
  contents: string;
  location?: LocationRange;
};

export type StarNode = {
  name: 'star';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type UnderscoreNode = {
  name: 'underscore';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type TickNode = {
  name: 'tick';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type TildeNode = {
  name: 'tilde';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type PipeNode = {
  name: 'pipe';
  nonTerminal: string;
  params: string;
  optional: boolean;
  contents: null;
  location?: LocationRange;
};

export type FormatNode = StarNode | UnderscoreNode | TickNode | TildeNode | PipeNode;

export type UnorderedListNode = {
  name: 'ul';
  indent: number;
  contents: UnorderedListItemNode[];
  location?: LocationRange;
};

export type OrderedListNode = {
  name: 'ol';
  indent: number;
  start: number;
  contents: OrderedListItemNode[];
  location?: LocationRange;
};

export type UnorderedListItemNode = {
  name: 'unordered-list-item';
  contents: FragmentNode[];
  sublist: ListNode | null;
  location?: LocationRange;
};

export type OrderedListItemNode = {
  name: 'ordered-list-item';
  contents: FragmentNode[];
  sublist: ListNode | null;
  location?: LocationRange;
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
