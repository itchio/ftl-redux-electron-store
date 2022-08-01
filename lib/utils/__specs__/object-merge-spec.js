'use strict';

var _tape = require('tape');

var _tape2 = _interopRequireDefault(_tape);

var _objectMerge = require('../object-merge');

var _objectMerge2 = _interopRequireDefault(_objectMerge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _tape2.default)('Basic functionality', function (t) {
  t.plan(1);

  var obj1 = {
    numTeams: 3,
    teamIndices: ['a', 'b', 'c']
  };

  var obj2 = {
    teamIndices: ['b', 'c', 'a'],
    numUnread: 6
  };

  t.looseEquals((0, _objectMerge2.default)(obj1, obj2), {
    teamIndices: ['b', 'c', 'a'],
    numTeams: 3,
    numUnread: 6
  });
});