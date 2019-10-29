import fillShape from './utils/fill-shape';
import objectDifference from './utils/object-difference.js';
import getSubscribeFuncs from './getSubscribeFuncs.js';

let globalName = '__REDUX_ELECTRON_STORE__';

/**
 * Creates a store enhancer which allows a redux store to synchronize its data
 * with an electronEnhanced store in the browser process.
 * @param {Object} p - The parameters to the creator
 * @param {Function} p.postDispatchCallback - A callback to run after a dispatch has occurred.
 * @param {Function} p.preDispatchCallback - A callback to run before an action is dispatched.
 * @param {String} p.sourceName - An override to the 'source' property appended to every action
 */
export default function electronBrowserEnhancer({
  postDispatchCallback: postDispatchCallback = (() => null),
  preDispatchCallback: preDispatchCallback = (() => null),
  sourceName: sourceName = null
} = {}) {
  return (storeCreator) => {
    return (reducer, initialState) => {
      let { ipcMain, BrowserWindow } = require('electron');

      let store = storeCreator(reducer, initialState);
      global[globalName] = store;

      let clients = {}; // webContentsId -> {webContents, filter, clientId, windowId, active}

      // Need to keep track of windows, as when a window refreshes it creates a new
      // webContents, and the old one must be unregistered
      let windowMap = {}; // windowId -> webContentsId

      let currentSource = sourceName || 'main_process';

      // Cannot delete data, as events could still be sent after close
      // events when a BrowserWindow is created using remote
      let unregisterRenderer = (webContentsId) => {
        clients[webContentsId].active = false;
      };

      // This must be kept in an object to be accessed by reference
      // by the subscribe function
      let reduxState = {isDispatching: false};

      let storeDotDispatch = store.dispatch;
      let doDispatch = (action) => {
        reduxState.isDispatching = true;
        try {
          preDispatchCallback(action);
          storeDotDispatch(action);
          postDispatchCallback(action);
        } finally {
          reduxState.isDispatching = false;
        }
      };

      ipcMain.on(`${globalName}-register-renderer`, ({ sender }, { filter, clientId }) => {
        let webContentsId = sender.id;
        if (clients[webContentsId] && clients[webContentsId].active) {
          // HMR is causing a re-register, ignore
          return;
        }
        clients[webContentsId] = {
          webContents: sender,
          filter,
          clientId,
          windowId: sender.getOwnerBrowserWindow().id,
          active: true
        };

        let browserWindow = BrowserWindow.fromWebContents(sender);
        if (browserWindow) { // For windowMap (not webviews)
          if (windowMap[browserWindow.id] !== undefined) {
            unregisterRenderer(windowMap[browserWindow.id]);
          }
          windowMap[browserWindow.id] = webContentsId;

          // Webcontents aren't automatically destroyed on window close
          browserWindow.on('closed', () => {
            unregisterRenderer(webContentsId)
          });
        }
      });

      let senderClientId = null;
      ipcMain.on(`${globalName}-renderer-dispatch`, ({ sender }, payload) => {
        let { action, clientId } = JSON.parse(payload);
        senderClientId = clientId;
        store.dispatch(action);
        senderClientId = null;
      });

      // Augment the subscribe function to make the listeners happen after the action is forwarded
      let subscribeFuncs = getSubscribeFuncs();
      store.subscribe = (listener) => subscribeFuncs.subscribe(listener, reduxState);

      store.dispatch = (action) => {
        if (!action) {
          storeDotDispatch(action);
        } else {
          action.source = action.source || currentSource;

          let prevState = store.getState();
          doDispatch(action);
          let newState = store.getState();
          let stateDifference = objectDifference(prevState, newState);

          // Forward all actions to the listening renderers
          for (let webContentsId in clients) {
            if (!clients[webContentsId].active) continue;

            let webContents = clients[webContentsId].webContents;

            if (webContents.isDestroyed() || webContents.isCrashed()) {
              unregisterRenderer(webContentsId);
              continue;
            }

            let shape = clients[webContentsId].filter;
            let updated = fillShape(stateDifference.updated, shape);
            let deleted = fillShape(stateDifference.deleted, shape);

            // If any data the renderer is watching changes, send an ipc
            // call to inform it of the updated and deleted data
            // Note: this used to be conditional, but since we have
            // reactors on the renderer side (and logging), we want to know about it regardless
            let transferredAction = {
              type: action.type,
              payload: action.payload,
              data: { updated, deleted },
            };
            let transfer = { action: JSON.stringify(transferredAction), sourceClientId: senderClientId || currentSource };
            webContents.send(`${globalName}-browser-dispatch`, transfer);
          }
        }

        senderClientId = null;
        subscribeFuncs.callListeners();

        return action;
      };

      store.getJSONState = () => JSON.stringify(store.getState());

      return store;
    };
  };
}
