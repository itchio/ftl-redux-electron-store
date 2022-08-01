'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = objectMerge;

var _isObject = require('lodash/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

var _isEqual = require('lodash/isEqual');

var _isEqual2 = _interopRequireDefault(_isEqual);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _keys = require('lodash/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function objectMerge(objA, objB) {
  var merged = {};
  if ((0, _isEmpty2.default)(objB)) {
    // no change
    return objA;
  }

  (0, _keys2.default)(objA).forEach(function (key) {
    var a = objA[key];
    var b = objB[key];

    if (a === b) {
      merged[key] = a;
    } else if (!Array.isArray(a) && !Array.isArray(b) && (0, _isObject2.default)(a) && (0, _isObject2.default)(b)) {
      merged[key] = objectMerge(a, b);
    } else {
      merged[key] = b !== undefined ? b : a; // default to b if it exists
    }
  });

  (0, _keys2.default)(objB).forEach(function (key) {
    if (objA[key] === undefined) {
      // fill in the rest
      merged[key] = objB[key];
    }
  });

  return merged;
}