'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = filterObject;

var _keys = require('lodash/keys');

var _keys2 = _interopRequireDefault(_keys);

var _isObject = require('lodash/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Given an source object and a filter shape, remove all leaf elements in the shape
// from the source.  Example:
// filterObject({'a': 1, 'b':{'c': {}}}, {'b': {'c': true}})
//   will return {'a': 1, 'b': {}}.
// The value of the leaf elment has to be true to be ignored
// (To ensure all uses of this function look the same)
function filterObject(source, filter) {
  if (!source || filter === true) return {};
  if ((0, _isEmpty2.default)(filter)) {
    // no changes
    return source;
  }

  var filtered = {};
  (0, _keys2.default)(source).forEach(function (key) {
    if ((0, _isObject2.default)(filter[key])) {
      filtered[key] = filterObject(source[key], filter[key]);
    } else if (filter[key] && filter[key] !== true) {
      throw new Error('Values in the filter must either be another object or \'true\' \n Filter given: ' + JSON.stringify(filter));
    } else if (filter[key] !== true) {
      filtered[key] = source[key];
    }
  });
  return filtered;
}