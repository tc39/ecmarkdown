'use strict';

module.exports = Stack;

function Stack(arraySource) {
    this._array = arraySource;
};

Stack.prototype.push = function (value) {
    this._array.push(value);
};

Stack.prototype.pop = function () {
    return this._array.pop();
};

// Sugar for `var bottom; while (s.current !== undefined) { bottom = s.pop(); }`
Stack.prototype.emptyAndReturnBottom = function () {
    var bottom = this._array[0];
    this._array.length = 0;
    return bottom;
};

Object.defineProperty(Stack.prototype, 'current', {
    enumerable: true,
    configurable: true,
    get: function () {
        return this._array[this._array.length - 1];
    }
});
