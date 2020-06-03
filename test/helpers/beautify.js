'use strict';
const beautifyWithBugs = require('js-beautify').html;
const inlineElements = require('inline-elements');

module.exports = function beautify(html) {
  const originalOutput = beautifyWithBugs(html, {
    indent_size: 2,
    wrap_line_length: 0,
    unformatted: ['emu-const', 'emu-val', 'emu-nt', 'emu-grammar'].concat(inlineElements),
  });

  // https://github.com/beautify-web/js-beautify/issues/524#issuecomment-82791022
  const fixEmbeddedNewlines = originalOutput.replace(/(<\/emu-[^>]+>)\n *<\/li>/g, '$1</li>');

  // Remove empty =""s
  const withSimplifiedAttributes = fixEmbeddedNewlines.replace(/=""/g, '');

  // Preserve trailing line feeds, adding one if necessary
  return withSimplifiedAttributes + (html.match(/\n*$/)[0] || '\n');
};
