'use strict';

var _tape = require('tape');

var _tape2 = _interopRequireDefault(_tape);

var _fillShape = require('../fill-shape');

var _fillShape2 = _interopRequireDefault(_fillShape);

var _mapValues = require('lodash/mapValues');

var _mapValues2 = _interopRequireDefault(_mapValues);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _tape2.default)('Basic functionality', function (t) {
  t.plan(3);

  var basicSource = {
    teams: {
      a: {
        name: 'The A Team',
        rating: 5
      },
      b: {
        name: 'The B Team',
        rating: 3
      }
    }
  };

  var basicSink = {
    teams: {
      a: {
        name: true
      },
      b: true
    }
  };

  t.deepEquals((0, _fillShape2.default)(basicSource, basicSink), {
    teams: {
      a: {
        name: basicSource.teams.a.name
      },
      b: basicSource.teams.b
    }
  });

  t.deepEquals((0, _fillShape2.default)(basicSource, true), basicSource);

  var exampleState = {
    settings: {
      notifyPosition: 'top-right',
      version: '0.1.0'
    },
    notifications: [{
      content: 'Hello World'
    }, {
      content: 'Hello Mars'
    }],
    emptyList: [],
    zero: 0,
    bool: false,
    emptyObj: {},
    teams: {
      '123': {
        name: 'The A Team',
        icons: {
          32: 's3.com/image_34.png',
          64: 's3.com/image_64.png',
          128: 's3.com/image_128.png'
        }
      },
      '321': {
        name: 'The B Team',
        icons: {
          32: 's4.com/image2_32.png',
          64: 's4.com/image2_64.png',
          128: 's4.com/image2_128.png'
        }
      }
    }
  };

  var exampleFilter = {
    notifications: true,
    settings: {
      notifyPosition: true
    },
    emptyList: true,
    zero: true,
    bool: true,
    emptyObj: true,
    teams: function teams(_teams) {
      return (0, _mapValues2.default)(_teams, function () {
        return { icons: true };
      });
    }
  };

  t.deepEquals((0, _fillShape2.default)(exampleState, exampleFilter), {
    settings: {
      notifyPosition: 'top-right'
    },
    notifications: [{
      content: 'Hello World'
    }, {
      content: 'Hello Mars'
    }],
    emptyList: [],
    zero: 0,
    bool: false,
    emptyObj: {},
    teams: {
      '123': {
        icons: {
          32: 's3.com/image_34.png',
          64: 's3.com/image_64.png',
          128: 's3.com/image_128.png'
        }
      },
      '321': {
        icons: {
          32: 's4.com/image2_32.png',
          64: 's4.com/image2_64.png',
          128: 's4.com/image2_128.png'
        }
      }
    }
  });
});