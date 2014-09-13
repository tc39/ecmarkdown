{
    var $ = require('cheerio').load('', { decodeEntities: false, normalizeWhitespace: true });
    var beautify = require('js-beautify').html;
    var Stack = require('./stack.js');

    // Deal with indentation via trickery: http://stackoverflow.com/q/4205442/3191
    var indentDepths = new Stack([0]);
    var ols = new Stack([$('<ol>')]);
    var INDENT = '__INDENT__';
    var DEDENT = '__DEDENT__';

    function beautifyBetter(html) {
        var originalOutput = beautify(html, {
            indent_size: 2,
            wrap_line_length: 0
        });

        // https://github.com/beautify-web/js-beautify/issues/524
        var fixNewlines = originalOutput.replace(/(<\/code\>|<\/var>)\n *<\/li>/g, '$1</li>');

        // https://github.com/beautify-web/js-beautify/issues/525
        var fixExtraSpaces = fixNewlines.replace(/\>  \</g, '> <');

        return fixExtraSpaces;
    }
}

start = items:(dents listItem "\n")+ {
    items.forEach(function (item) {
        var dents = item[0];
        var li = item[1];

        dents.forEach(function (dent) {
            if (dent === INDENT) {
                var currentLI = ols.current.children(':last-of-type');
                var newOL = $('<ol>');
                currentLI.append(newOL);
                ols.push(newOL);
            } else if (dent === DEDENT) {
                ols.pop();
            }
        });

        ols.current.append(li);
    });

    return beautifyBetter($.html(ols.emptyAndReturnBottom()));
}

listItem = "0. " atoms:atom+ {
    var li = $('<li>');
    atoms.forEach(function (atom) {
        li.append(atom);
    });
    return li;
}

atom = variable
     / code
     / value
     / normalText

normalText = $[^\n]

variable = "_" initialSegment:variableSegment otherSegments:$("_" variableSegment)* "_" {
    return $('<var>').text(initialSegment + otherSegments);
}

variableSegment = $[^\n_ ]+

code = "`" content:$[^\n`]+ "`" {
    return $('<code>').text(content);
}

value = "*" content:$[^\n* ]+ "*" {
    return $('<code class="value">').text(content);
}

dents = spaces:"  "* {
    var depth = spaces.length;

    if (depth == indentDepths.current) {
        return [];
    }

    if (depth > indentDepths.current) {
        indentDepths.push(depth);
        return [INDENT];
    }

    var dedents = [];
    while (depth < indentDepths.current) {
        indentDepths.pop();
        dedents.push(DEDENT);
    }

    if (depth !== indentDepths.current) {
        expected('balanced indentation');
        return;
    }

    return dedents;
}
