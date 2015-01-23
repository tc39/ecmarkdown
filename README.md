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

### Top-Level Constructs

Every Ecmarkdown string is a either a **numeric list** or a **fragment**. These base productions can contain other productions.

**Numeric lists** are written as a series of lines, each starting with `1. `. Lines can be indented by multiples of exactly two spaces to indicate nesting. To convert a numeric list, use `ecmarkdown.list(stringOfText)` to get back HTML for the list (with root element `<ol>`). HTML is allowed inside list items, where it is passed through untouched, but HTML tags cannot span multiple list items. The exception is HTML comments (`<!-- -->`), which can span multiple lines.

**Fragments** are strings of text, which unlike numeric lists, are assumed to not contain any HTML. Thus, you can pass in `` "`2 < 3`" `` as a fragment, and you'll get back as the output HTML `"<code>2 &lt; 3</code>"`. To convert a fragment, use `ecmarkdown.fragment(stringOfText)` to get back HTML for that fragment (with no root element).

In the future we will unify these into a single parser that allows multiple paragraphs, multiple lists, and any combination thereof. But for now the above is what's fallen out of the work done so far.

### Inline Constructs

Within a list item line or a fragment, the following can be used:

**Variables** are written as `_x_` and are translated to `<var>x</var>`. Variables cannot contain spaces, but can contain underscores.

**Values** are written as `*x*` and are translated to `<emu-val>x</emu-val>`. Values cannot contain spaces or asterisks.

**Code** is written as `` `x` `` and is translated to `<code>x</code>`. Code cannot contain backticks.

**Strings** are written as `"x"` and are translated to `<code>"x"</code>`. (In other words, quoted strings are automatically interpreted as code, with no need to surround them in backticks.) Strings cannot contain double quotes.

**Spec-level constants** are written as `~x~` and are translated to `<emu-const>x</emu-const>`. Spec-level constants cannot contain spaces or tildes.

**Nonterminals** are written as `|x|`, `|x_opt|`, `|x[p]|`, or `|x[p]_opt|`. These are translated, respectively, into `<emu-nt>x</emu-nt>`, `<emu-nt optional>x</emu-nt>`, `<emu-nt params="p">x</emu-nt>`, or `<emu-nt params="p" optional>x</emu-nt>`. Nonterminal names can only be composed of letters. Params can be composed of anything except a closing square bracket.

## Interaction with Ecmarkup

Ecmarkdown is meant to be used together with [Ecmarkup](https://github.com/bterlson/ecmarkup/). Ecmarkup has an `<emu-alg>` element within which Ecmarkdown numeric lists can be used, and in other contexts it treats the content of text nodes as Ecmarkdown fragments. In the other direction, several Ecmarkdown productions produce Ecmarkup elements (as noted above).

In short, we expect Ecmarkdown to be embedded within a larger Ecmarkup document, used for writing algorithm steps and other text in a concise format.
