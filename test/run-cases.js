'use strict';
const path = require('path');
const Bluebird = require('bluebird');
const baselineTester = Bluebird.promisify(require('baseline-tester'));
const beautify = require('./helpers/beautify.js');

const ecmarkdown = require('..');

Bluebird.try(function () {
  return baselineTester(beautified(ecmarkdown.document), {
    casesDirectory: path.resolve(__dirname, 'list-cases'),
    inputExtension: 'ecmarkdown',
    outputExtension: 'html'
  });
})
.then(function () {
  return baselineTester(beautified(ecmarkdown.document), {
    casesDirectory: path.resolve(__dirname, 'paragraph-cases'),
    inputExtension: 'ecmarkdown',
    outputExtension: 'html'
  });
})
.then(function () {
  return baselineTester(ecmarkdown.fragment, {
    casesDirectory: path.resolve(__dirname, 'fragment-cases'),
    inputExtension: 'ecmarkdown',
    outputExtension: 'html',
    trim: false
  });
})
.done();

function beautified(fn) {
  // In order to be able to read the test case outputs, we write them with nice linebreaks and spacing.
  // However, Ecmarkdown does not output such beautiful HTML, largely for speed reasons (and also it is probably
  // redundant as you would instead beautify the outer document). Thus, we beautify the Ecmarkdown output before
  // comparing it to the test case outputs.
  return function () {
    return beautify(fn.apply(undefined, arguments));
  };
}
