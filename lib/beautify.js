'use strict';
var beautifyWithBugs = require('js-beautify').html;

module.exports = function beautify(html) {
    var originalOutput = beautifyWithBugs(html, {
        indent_size: 2,
        wrap_line_length: 0
    });

    // https://github.com/beautify-web/js-beautify/issues/524
    var fixNewlines = originalOutput.replace(/(<\/code>|<\/var>)\n *<\/li>/g, '$1</li>');

    // https://github.com/beautify-web/js-beautify/issues/525
    var fixExtraSpaces = fixNewlines.replace(/>  </g, '> <');

    return fixExtraSpaces;
};
