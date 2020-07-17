'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const beautify = require('./helpers/beautify.js');

const ecmarkdown = require('..');

let shouldUpdate = process.env.UPDATE_SNAPSHOTS === 'true';

describe('baselines', () => {
  let cases = path.resolve(__dirname, 'cases');
  for (let file of fs.readdirSync(cases)) {
    if (!file.endsWith('.ecmarkdown')) {
      continue;
    }
    it(file, () => {
      let snapshotFile = path.resolve(cases, file.replace(/ecmarkdown$/, 'html'));

      let input = fs.readFileSync(path.resolve(cases, file), 'utf8');
      let processor = file.endsWith('.fragment.ecmarkdown')
        ? ecmarkdown.fragment
        : ecmarkdown.algorithm;
      let rawOutput = processor(input);
      let output = beautify(rawOutput);
      let existing = fs.existsSync(snapshotFile) ? fs.readFileSync(snapshotFile, 'utf8') : null;
      if (shouldUpdate) {
        if (existing !== output) {
          console.log('updated ' + file);
          fs.writeFileSync(snapshotFile, output, 'utf8');
          existing = output;
        }
      }
      if (existing === null) {
        throw new Error(
          `could not find snapshot for ${file}; perhaps you need to regenerate snapshots?`
        );
      }
      assert.strictEqual(existing, output);
    });
  }
});
