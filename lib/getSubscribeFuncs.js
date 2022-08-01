'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getSubscribeFuncs;
function getSubscribeFuncs() {
  var currentListeners = [];
  var nextListeners = currentListeners;
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  return {
    subscribe: function subscribe(listener, reduxState) {
      if (typeof listener !== 'function') {
        throw new Error('Expected listener to be a function.');
      }

      if (reduxState.isDispatching) {
        throw new Error('You may not call store.subscribe() while a reducer is executing');
      }

      var isSubscribed = true;
      ensureCanMutateNextListeners();
      nextListeners.push(listener);

      return function unsubscribe() {
        if (!isSubscribed) return;

        if (reduxState.isDispatching) {
          throw new Error('You may not unsubscribe from a store listener while the reducer is executing');
        }

        isSubscribed = false;
        ensureCanMutateNextListeners();
        nextListeners.splice(nextListeners.indexOf(listener), 1);
      };
    },
    callListeners: function callListeners() {
      var listeners = currentListeners = nextListeners;
      listeners.forEach(function (listener) {
        return listener();
      });
    }
  };
}