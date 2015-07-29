# Ecmarkdown

**Ecmarkdown** is a Markdown-inspired syntax for writing text and algorithms in the style of the ECMAScript spec. This package will convert Ecmarkdown input to HTML output, allowing you to write

```
1. Assert: Type(_iterator_) is Object.
1. Assert: _completion_ is a Completion Record.
1. Let _hasReturn_ be HasProperty(_iterator_, `"return"`).
1. ReturnIfAbrupt(_hasReturn_).
  1. If _hasReturn_ is *true*, then
    1. Let _innerResult_ be Invoke(_iterator_, `"return"`, ( )).
    1. If _completion_.[[type]] is not ~throw~ and _innerResult_.[[type]] is ~throw~, then
      1. Return _innerResult_.
1. Return _completion_.
```

instead of

```html
<ol>
  <li>Assert: Type(<var>iterator</var>) is Object.</li>
  <li>Assert: <var>completion</var> is a Completion Record.</li>
  <li>Let <var>hasReturn</var> be HasProperty(<var>iterator</var>, <code>"return"</code>).</li>
  <li>ReturnIfAbrupt(<var>hasReturn</var>).
    <ol>
      <li>If <var>hasReturn</var> is <emu-val>true</emu-val>, then
        <ol>
          <li>Let <var>innerResult</var> be Invoke(<var>iterator</var>, <code>"return"</code>, ( )).</li>
          <li>If <var>completion</var>.[[type]] is not <emu-const>throw</emu-const> and <var>innerResult</var>.[[type]] is <emu-const>throw</emu-const>, then
            <ol>
              <li>Return <var>innerResult</var>.</li>
            </ol>
          </li>
        </ol>
      </li>
    </ol>
  </li>
  <li>Return <var>completion</var>.</li>
</ol>
```

## Syntax

### Top-Level Constructs
The following is a partial [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_Form#Basics) for the top-level constructs in Ecmarkdown.

```
Document = Paragraph , [ { "\n\n" , Paragraph  } ] ;

Paragraph = OrderedList | UnorderedList | NonList ;

OrderedList = OrderedListItem , [ { "\n" , OrderedListItem | UnorderedListItem } ] ;

UnorderedList = UnorderedListItem , [ { "\n" , OrderedListItem | UnorderedListItem } ] ;

OrderedListItem = { white space } , { digit } , "." , space , Fragment ;

UnorderedListItem = { white space } , "*" , space , Fragment ;

NonList = Fragment ;

Fragment = { StarFormat | UnderscoreFormat | TildeFormat
         | TickFormat | PipeFormat | Text } ;
         // could consider renaming to output element

StarFormat = "*" , Text , "*" ;
// With some complex restrictions on surrounding context to match Github-flavored
// Markdown semantics

// and etc. for each fragment type except TickFragment which has no context
// restrictions per gmd semantics and UnderscoreFormat which doesn't allow whitespace
// or format characters inside of it.
```

The key takeaways from this grammar are the following:

* Paragraphs are separated by two line breaks.
* Paragraphs can either be lists or non-lists.
* Lists can be ordered or unordered. List items must be preceded by a line break. You can have a ordered list as a sublist in an unordered list and vice versa.
* List items and non-list paragraphs are fragments. Fragments are a series of one or more formats or plain text.

Ecmarkdown also allows HTML tags and comments anywhere that does not otherwise disturb the parsing. They are included in the resulting output, in the equivalent location.

### Lists

Lists are written as a series of lines, each starting with either a number, e.g. `1.`, or a star, e.g. `*`. The first list item's number determines the starting number in the output (via `<ol start="x">`); subsequent list items' numbers are ignored.

Lists can be nested. To do so, use any number of spaces to indent; as long as the number of spaces is consistent, list items will stay together in a nested list.

## Inline Formatting

Within a fragment, the following can be used:

**Variables** are written as `_x_` and are translated to `<var>x</var>`. Variables cannot contain whitespace or other formatting characters. You can use variables adjacent to other characters, e.g. as in `_SIMD_Constructor`, as long as the start of the variable is preceded by whitespace (e.g. `my_SIMD_constructor` does not contain any variables).

**Values** are written as `*x*` and are translated to `<emu-val>x</emu-val>`. Values cannot contain asterisks.

**Code** is written as `` `x` `` and is translated to `<code>x</code>`. Code cannot contain backticks.

**Spec-level constants** are written as `~x~` and are translated to `<emu-const>x</emu-const>`. Spec-level constants cannot contain tildes.

**Nonterminals** are written as `|x|`, `|x_opt|`, `|x[p]|`, or `|x[p]_opt|`. These are translated, respectively, into `<emu-nt>x</emu-nt>`, `<emu-nt optional>x</emu-nt>`, `<emu-nt params="p">x</emu-nt>`, or `<emu-nt params="p" optional>x</emu-nt>`. Nonterminal names can only be composed of letters. Params can be composed of anything except a closing square bracket.

You can escape any format above with a backslash. Escaping of any non-format characters will not be considered an escape and will render literally (eg. `\a` simply renders as `\a`). If you need a literal backslash before a formatting character, you must escape the backslash (eg. `\\*foo*` renders as `\<emu-val>foo</emu-val>`).

Finally, anything in between `<` and `>` will count as an **html tag** and will not be messed with, so e.g. `<span title="_x_">` will be left alone instead of being translated into `<span title=<code>"<var>x</var>"</code>>`.

## Interaction with Ecmarkup

Ecmarkdown is meant to be used together with [Ecmarkup](https://github.com/bterlson/ecmarkup/). Ecmarkup has an `<emu-alg>` element within which Ecmarkdown numeric lists can be used, and in other contexts it treats the content of text nodes as Ecmarkdown fragments. In the other direction, several Ecmarkdown productions produce Ecmarkup elements (as noted above). This relationship is evolving, however.

In short, we expect Ecmarkdown to be embedded within a larger Ecmarkup document, used for writing algorithm steps and other text in a concise format.
