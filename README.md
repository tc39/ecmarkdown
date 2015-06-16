# Ecmarkdown

**Ecmarkdown** is a Markdown-inspired syntax for writing algorithms in the style of the ECMAScript spec. This package will convert Ecmarkdown input to HTML output, allowing you to write

```
1. Assert: Type(_iterator_) is Object.
1. Assert: _completion_ is a Completion Record.
1. Let _hasReturn_ be HasProperty(_iterator_, "return").
1. ReturnIfAbrupt(_hasReturn_).
  1. If _hasReturn_ is *true*, then
    1. Let _innerResult_ be Invoke(_iterator_, "return", ( )).
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

_NOTE: this section is a bit in flux after recent changes. Please use the latest released-to-npm release for a stable syntax; we promise we will nail everything down before doing another release._

### Top-Level Constructs

An Ecmarkdown **document**, processed using the `ecmarkdown.document(string)` export, is composed of multiple pararaphs.

A **paragraph** can be either a list or non-list paragraph.

A **list** is composed of one or more **list items**, which are segments. Non-list paragraphs are also segments.

A **segment** is a list of non-formatting characters (i.e., literal text) and formatting characters.

An Ecmarkdown **fragment**, processed using the `ecmarkdown.fragment(string)` export, is a segment that is assumed to contain no HTML. Thus, you can pass in `` "`2 < 3`" `` as a fragment, and you'll get back as the output HTML `"<code>2 &lt; 3</code>"`.

Ecmarkdown also allows HTML comments anywhere that does not otherwise disturb the parsing. They are included in the resulting output, in the equivalent location.

### Lists

Lists are written as a series of lines, each starting with a number, e.g. `1.`. The first list item's number determines the starting number in the output (via `<ol start="x">`); subsequent list items' numbers are ignored.

Lists can be nested using multiples of exactly two spaces.

## Inline Formatting

Within a segment, the following can be used:

**Variables** are written as `_x_` and are translated to `<var>x</var>`. Variables cannot contain spaces, but can contain underscores. You can use variables adjacent to other characters, e.g. as in `_SIMD_Constructor`. (TODO: this latter is not working yet, and also spaces are allowed. Fix this!!)

**Values** are written as `*x*` and are translated to `<emu-val>x</emu-val>`. Values cannot contain asterisks.

**Code** is written as `` `x` `` and is translated to `<code>x</code>`. Code cannot contain backticks.

**Strings** are written as `"x"` and are translated to `<code>"x"</code>`. (In other words, quoted strings are automatically interpreted as code, with no need to surround them in backticks.) Strings cannot contain double quotes.

**Spec-level constants** are written as `~x~` and are translated to `<emu-const>x</emu-const>`. Spec-level constants cannot contain tildes.

**Nonterminals** are written as `|x|`, `|x_opt|`, `|x[p]|`, or `|x[p]_opt|`. These are translated, respectively, into `<emu-nt>x</emu-nt>`, `<emu-nt optional>x</emu-nt>`, `<emu-nt params="p">x</emu-nt>`, or `<emu-nt params="p" optional>x</emu-nt>`. Nonterminal names can only be composed of letters. Params can be composed of anything except a closing square bracket.

Finally, anything in between `<` and `>` will count as an **html tag** and will not be messed with, so e.g. `<span title="_x_">` will be left alone instead of being translated into `<span title=<code>"<var>x</var>"</code>>`.

## Interaction with Ecmarkup

Ecmarkdown is meant to be used together with [Ecmarkup](https://github.com/bterlson/ecmarkup/). Ecmarkup has an `<emu-alg>` element within which Ecmarkdown numeric lists can be used, and in other contexts it treats the content of text nodes as Ecmarkdown fragments. In the other direction, several Ecmarkdown productions produce Ecmarkup elements (as noted above). This relationship is evolving, however; the introduction of the Ecmarkdown document production will change things.

In short, we expect Ecmarkdown to be embedded within a larger Ecmarkup document, used for writing algorithm steps and other text in a concise format.
