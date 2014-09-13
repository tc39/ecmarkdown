var parser = require('./generated-parser.js');

export default function translate(ecmarkdown) {
    return parser.parse(ecmarkdown.trim() + '\n');
}
