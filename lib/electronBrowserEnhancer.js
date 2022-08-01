'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = electronBrowserEnhancer;

var _fillShape = require('./utils/fill-shape');

var _fillShape2 = _interopRequireDefault(_fillShape);

var _objectDifference = require('./utils/object-difference.js');

var _objectDifference2 = _interopRequireDefault(_objectDifference);

var _getSubscribeFuncs = require('./getSubscribeFuncs.js');

var _getSubscribeFuncs2 = _interopRequireDefault(_getSubscribeFuncs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var globalName = '__REDUX_ELECTRON_STORE__';

/**
 * Creates a store enhancer which allows a redux store to synchronize its data
 * with an electronEnhanced store in the browser process.
 * @param {Object} p - The parameters to the creator
 * @param {Function} p.postDispatchCallback - A callback to run after a dispatch has occurred.
 * @param {Function} p.preDispatchCallback - A callback to run before an action is dispatched.
 * @param {String} p.sourceName - An override to the 'source' property appended to every action
 */
function electronBrowserEnhancer() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$postDispatchCall = _ref.postDispatchCallback,
      postDispatchCallback = _ref$postDispatchCall === undefined ? function () {
    return null;
  } : _ref$postDispatchCall,
      _ref$preDispatchCallb = _ref.preDispatchCallback,
      preDispatchCallback = _ref$preDispatchCallb === undefined ? function () {
    return null;
  } : _ref$preDispatchCallb,
      _ref$sourceName = _ref.sourceName,
      sourceName = _ref$sourceName === undefined ? null : _ref$sourceName;

  return function (storeCreator) {
    return function (reducer, initialState) {
      var _require = require('electron'),
          ipcMain = _require.ipcMain,
          BrowserWindow = _require.BrowserWindow;

      var store = storeCreator(reducer, initialState);
      global[globalName] = store;

      var clients = {}; // webContentsId -> {webContents, filter, clientId, windowId, active}

      // Need to keep track of windows, as when a window refreshes it creates a new
      // webContents, and the old one must be unregistered
      var windowMap = {}; // windowId -> webContentsId

      var currentSource = sourceName || 'main_process';

      // Cannot delete data, as events could still be sent after close
      // events when a BrowserWindow is created using remote
      var unregisterRenderer = function unregisterRenderer(webContentsId) {
        clients[webContentsId].active = false;
      };

      // This must be kept in an object to be accessed by reference
      // by the subscribe function
      var reduxState = { isDispatching: false };

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

      ipcMain.on(globalName + '-register-renderer', function (_ref2, _ref3) {
        var sender = _ref2.sender;
        var filter = _ref3.filter,
            clientId = _ref3.clientId;

        var webContentsId = sender.id;
        if (clients[webContentsId] && clients[webContentsId].active) {
          // HMR is causing a re-register, ignore
          return;
        }
        clients[webContentsId] = {
          webContents: sender,
          filter: filter,
          clientId: clientId,
          windowId: sender.getOwnerBrowserWindow().id,
          active: true
        };

        var browserWindow = BrowserWindow.fromWebContents(sender);
        if (browserWindow) {
          // For windowMap (not webviews)
          if (windowMap[browserWindow.id] !== undefined) {
            unregisterRenderer(windowMap[browserWindow.id]);
          }
          windowMap[browserWindow.id] = webContentsId;

          // Webcontents aren't automatically destroyed on window close
          browserWindow.on('closed', function () {
            unregisterRenderer(webContentsId);
          });
        }
      });

      var senderClientId = null;
      ipcMain.on(globalName + '-renderer-dispatch', function (_ref4, payload) {
        var sender = _ref4.sender;

        var _JSON$parse = JSON.parse(payload),
            action = _JSON$parse.action,
            clientId = _JSON$parse.clientId;

        senderClientId = clientId;
        store.dispatch(action);
        senderClientId = null;
      });

      // Augment the subscribe function to make the listeners happen after the action is forwarded
      var subscribeFuncs = (0, _getSubscribeFuncs2.default)();
      store.subscribe = function (listener) {
        return subscribeFuncs.subscribe(listener, reduxState);
      };

      store.dispatch = function (action) {
        if (!action) {
          storeDotDispatch(action);
        } else {
          action.source = action.source || currentSource;

          var prevState = store.getState();
          doDispatch(action);
          var newState = store.getState();
          var stateDifference = (0, _objectDifference2.default)(prevState, newState);

          // Forward all actions to the listening renderers
          for (var webContentsId in clients) {
            if (!clients[webContentsId].active) continue;

            var webContents = clients[webContentsId].webContents;

            if (webContents.isDestroyed() || webContents.isCrashed()) {
              unregisterRenderer(webContentsId);
              continue;
            }

            var shape = clients[webContentsId].filter;
            var updated = (0, _fillShape2.default)(stateDifference.updated, shape);
            var deleted = (0, _fillShape2.default)(stateDifference.deleted, shape);

            // If any data the renderer is watching changes, send an ipc
            // call to inform it of the updated and deleted data
            // Note: this used to be conditional, but since we have
            // reactors on the renderer side (and logging), we want to know about it regardless
            var transferredAction = {
              type: action.type,
              payload: action.payload,
              data: { updated: updated, deleted: deleted }
            };
            var transfer = { action: JSON.stringify(transferredAction), sourceClientId: senderClientId || currentSource };
            webContents.send(globalName + '-browser-dispatch', transfer);
          }
        }

        senderClientId = null;
        subscribeFuncs.callListeners();

        return action;
      };

      store.getJSONState = function () {
        return JSON.stringify(store.getState());
      };

      return store;
    };
  };
}