'use strict';
var assert = require('assert');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var generate = require('..');

// TODO: dedupe this framework with domenic/webidl-class-generator. Inputs: .markdown, .html

describe('Checking inputs against outputs', function () {
    glob.sync(path.resolve(__dirname, 'cases/*.ecmarkdown')).forEach(function (ecmarkdownFilePath) {
        var ecmarkdownFileName = path.basename(ecmarkdownFilePath);
        var htmlFileName = path.basename(ecmarkdownFilePath, '.ecmarkdown') + '.html';
        var htmlFilePath = path.resolve(__dirname, 'cases', htmlFileName);

        var ecmarkdownContents = fs.readFileSync(ecmarkdownFilePath, { encoding: 'utf-8' }).trim();
        var htmlContents = fs.readFileSync(htmlFilePath, { encoding: 'utf-8' }).trim();

        specify(ecmarkdownFileName, function () {
            assert.strictEqual(generate(ecmarkdownContents), htmlContents);
        });
    });
});
