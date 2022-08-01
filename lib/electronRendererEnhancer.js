'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = electronRendererEnhancer;

var _filterObject = require('./utils/filter-object');

var _filterObject2 = _interopRequireDefault(_filterObject);

var _objectMerge = require('./utils/object-merge');

var _objectMerge2 = _interopRequireDefault(_objectMerge);

var _fillShape = require('./utils/fill-shape');

var _fillShape2 = _interopRequireDefault(_fillShape);

var _getSubscribeFuncs = require('./getSubscribeFuncs.js');

var _getSubscribeFuncs2 = _interopRequireDefault(_getSubscribeFuncs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var globalName = '__REDUX_ELECTRON_STORE__';

/**
 * Creates a store enhancer which allows a redux store to synchronize its data
 * with an electronEnhanced store in the browser process.
 * @param {Object} p - The parameters to the creator
 * @param {Object|Function|true} p.filter - Describes what data should be forwarded to this process from the browser
 * @param {Boolean} p.excludeUnfilteredState - Whether to have all data not passing the filter to be undefined (Helpful to avoid bugs at the cost of performance)
 * @param {Boolean} p.synchronous - Whether dispatches from this process should be processed within this process synchronously, or await an update from the browser process
 * @param {Function} p.stateTransformer - A function that takes data from the browser store and returns an object in the proper format of the renderer's data (if you have different reducers between processes)
 * @param {Function} p.postDispatchCallback - A callback to run after a dispatch has occurred.
 * @param {Function} p.preDispatchCallback - A callback to run before an action is dispatched.
 * @param {String} p.sourceName - An override to the 'source' property appended to every action
 */
function electronRendererEnhancer() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$filter = _ref.filter,
      filter = _ref$filter === undefined ? true : _ref$filter,
      _ref$excludeUnfiltere = _ref.excludeUnfilteredState,
      excludeUnfilteredState = _ref$excludeUnfiltere === undefined ? false : _ref$excludeUnfiltere,
      _ref$synchronous = _ref.synchronous,
      synchronous = _ref$synchronous === undefined ? true : _ref$synchronous,
      _ref$postDispatchCall = _ref.postDispatchCallback,
      postDispatchCallback = _ref$postDispatchCall === undefined ? function () {
    return null;
  } : _ref$postDispatchCall,
      _ref$preDispatchCallb = _ref.preDispatchCallback,
      preDispatchCallback = _ref$preDispatchCallb === undefined ? function () {
    return null;
  } : _ref$preDispatchCallb,
      _ref$stateTransformer = _ref.stateTransformer,
      stateTransformer = _ref$stateTransformer === undefined ? function (state) {
    return state;
  } : _ref$stateTransformer,
      _ref$sourceName = _ref.sourceName,
      sourceName = _ref$sourceName === undefined ? null : _ref$sourceName;

  return function (storeCreator) {
    return function (reducer, initialState) {
      var _require = require('electron'),
          ipcRenderer = _require.ipcRenderer;

      var remote = require('@electron/remote');

      // If this process is a webview, it will have a guestInstanceId.  Otherwise it is a window
      var rendererId = process.guestInstanceId || remote.getCurrentWindow().id;

      // Get current data from the electronEnhanced store in the browser through the global it creates
      var browserStore = remote.getGlobal(globalName);
      if (!browserStore) {
        throw new Error('Could not find electronEnhanced redux store in main process');
      }

      // Prefetch initial state
      var storeData = JSON.parse(browserStore.getJSONState());
      var filteredStoreData = excludeUnfilteredState ? (0, _fillShape2.default)(storeData, filter) : storeData;
      var preload = stateTransformer(filteredStoreData);
      var newInitialState = (0, _objectMerge2.default)(initialState || reducer(undefined, { type: null }), preload);

      var clientId = process.guestInstanceId ? 'webview ' + rendererId : 'window ' + rendererId;
      var currentSource = sourceName || clientId;

      // This flag is toggled to true when events are received
      var mainProcessUpdateFlag = false;

      // Augment the reducer to handle electron enhanced actions that have been forwarded
      // Dispatches from the browser are in the format of {type, data: {updated, deleted}}.
      var parsedReducer = function parsedReducer() {
        var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : newInitialState;
        var action = arguments[1];

        if (mainProcessUpdateFlag) {
          mainProcessUpdateFlag = false;
          var data = action.data;
          data.deleted = stateTransformer(data.deleted);
          data.updated = stateTransformer(data.updated);
          var filteredState = (0, _filterObject2.default)(state, data.deleted);
          return (0, _objectMerge2.default)(filteredState, data.updated);
        } else {
          var reduced = reducer(state, action);
          return excludeUnfilteredState ? (0, _fillShape2.default)(reduced, filter) : reduced;
        }
      };

      var store = storeCreator(parsedReducer, newInitialState);

      // This must be kept in an object to be accessed by reference
      // by the subscribe function
      var reduxState = { isDispatching: false };

      // Augment the subscribe function to make the listeners happen after the action is forwarded
      var subscribeFuncs = (0, _getSubscribeFuncs2.default)();
      store.subscribe = function (listener) {
        return subscribeFuncs.subscribe(listener, reduxState);
      };

      // Renderers register themselves to the electronEnhanced store in the browser proecss
      ipcRenderer.send(globalName + '-register-renderer', { filter: filter, clientId: clientId });

      var storeDotDispatch = store.dispatch;
      var doDispatch = function doDispatch(action) {
        reduxState.isDispatching = true;
        try {
          preDispatchCallback(action);
          storeDotDispatch(action);
          postDispatchCallback(action);
        } finally {
          reduxState.isDispatching = false;
        }
      };

      // Dispatches from other processes are forwarded using this ipc message
      var browserDispatchEvent = globalName + '-browser-dispatch';
      ipcRenderer.removeAllListeners(browserDispatchEvent);
      ipcRenderer.on(browserDispatchEvent, function (event, _ref2) {
        var action = _ref2.action,
            sourceClientId = _ref2.sourceClientId;

        var actionParsed = JSON.parse(action);
        if (!synchronous || sourceClientId !== clientId) {
          mainProcessUpdateFlag = true;
          doDispatch(actionParsed);
          subscribeFuncs.callListeners();
        }
      });

      store.dispatch = function (action) {
        if (!action) {
          storeDotDispatch(action);
        } else {
          action.source = currentSource;

          if (synchronous) {
            doDispatch(action);
          }

          ipcRenderer.send(globalName + '-renderer-dispatch', JSON.stringify({ action: action, clientId: clientId }));
        }

        subscribeFuncs.callListeners();
        return action;
      };

      return store;
    };
  };
}