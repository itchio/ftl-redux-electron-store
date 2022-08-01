'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = objectDifference;

var _isObject = require('lodash/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _isDate = require('lodash/isDate');

var _isDate2 = _interopRequireDefault(_isDate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function objectDifference(oldValue, newValue) {
  var updated = {};
  var deleted = {};

  Object.keys(newValue).forEach(function (key) {
    if (oldValue[key] === newValue[key]) return;

    if ((0, _isDate2.default)(newValue[key])) {
      if (+oldValue[key] != +newValue[key]) {
        // otherwise, it's the same
        updated[key] = newValue[key];
      }
      return;
    }

    // If there is a difference in the variables, check if they are an actual
    // javascript object (not an array, which typeof says is object).  If they
    // are an object, check for differences in the objects and update our
    // diffs if there is anything there.  If it isn't an object, then it is either
    // a changed value or a new value, therefore add it to the updated object
    if ((0, _isObject2.default)(oldValue[key]) && (0, _isObject2.default)(newValue[key]) && !Array.isArray(oldValue[key]) && !Array.isArray(newValue[key])) {
      var deep = objectDifference(oldValue[key], newValue[key]);
      if (!(0, _isEmpty2.default)(deep.updated)) updated[key] = deep.updated;
      if (!(0, _isEmpty2.default)(deep.deleted)) deleted[key] = deep.deleted;
    } else {
      updated[key] = newValue[key];
    }
  });

  // Any keys in the old object that aren't in the new one must have been deleted
  Object.keys(oldValue).forEach(function (key) {
    if (newValue[key] !== undefined) return;
    deleted[key] = true;
  });

  return { updated: updated, deleted: deleted };
} /*
    Takes the old and the new version of an immutable object and
    returns a hash of what has updated (added or changed) in the object
    and what has been deleted in the object (with the entry that has
    been deleted given a value of true).
  
    ex: objectDifference({a: 1}, {b: 2}) would return
      {updated: {b: 2}, deleted: {a: true}}
  */