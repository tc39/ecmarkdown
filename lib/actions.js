'use strict';
var $ = require('cheerio').load('', { decodeEntities: false, normalizeWhitespace: true });
var beautify = require('./beautify.js');
var Stack = require('./stack.js');

/*global expected: false*/

// The strategy for dealing with indentation is where much of the complexity in this file comes from. It is derived
// from http://stackoverflow.com/q/4205442/3191. We match indents (the `dents` rule/action) and use them to create
// INDENT and DEDENT tokens. They end up inside the lines matched by the `list` action, where we use them to
// create new `<ol>`s and insert them into the tree upon indent, or to move up a level in the `<ol>` tree upon dedent.

var INDENT = '__INDENT__';
var DEDENT = '__DEDENT__';

exports.makeInitialState = function () {
    return {
        indentDepths: new Stack([0]),
        ols: new Stack([$('<ol>')])
    };
};

exports.list = function (lines, state) {
    var ols = state.ols;

    lines.forEach(function (line) {
        var dents = line[0];
        var li = line[1];

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

    return beautify($.html(ols.emptyAndReturnBottom()));
};

exports.listItem = function (atoms) {
    var li = $('<li>');
    atoms.forEach(function (atom) {
        li.append(atom);
    });
    return li;
};

exports.variable = function (first, rest) {
    return $('<var>').text(first + rest);
};

exports.code = function (content) {
    return $('<code>').text(content);
};

exports.string = function (content) {
    return $('<code>').text('"' + content + '"');
};

exports.value = function (content) {
    return $('<emu-val>').text(content);
};

exports.specConstant = function (content) {
    return $('<emu-const>').text(content);
};

exports.dents = function (spaces, state) {
    var indentDepths = state.indentDepths;
    var depth = spaces.length;

    if (depth === indentDepths.current) {
        return [];
    }

    if (depth > indentDepths.current) {
        if (depth !== indentDepths.current + 1) {
            expected('only a one-level increase in indentation');
            return;
        }

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
};
