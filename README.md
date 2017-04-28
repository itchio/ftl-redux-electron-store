# ftl-redux-electron-store

![](https://img.shields.io/badge/maintained%3F-no!-red.svg)

This is a fork of [redux-electron-store](https://github.com/samiskin/redux-electron-store), with the following differences:

  * Based on v0.3.13
  * Supports Hot Module Reload when used together with [electron-compile](https://github.com/electron/electron-compile)

It looks like redux-electron-store has been undergoing a large refactor, but it's
going in a direction that makes it unusable for me (ie. having full reducers
running in the renderer). I'm attached to the old model (renderer actions
forwarded to the browser, which runs reducers and broadcasts the state diff
to all renderers).

The Hot Module Reload fix simply handles the case where a BrowserWindow reloads
its code, including the store, and:

  * Makes sure no ipcRenderer listeners leak
  * Doesn't mark the window's webContents as inactive (that's what 0.3.13 did, because it assumed we reloaded - which trashes the webContents and creates a new one. In the HMR case, it's the same webContents).

Anyway, except if you have a funky setup like me, you probably want to
check out the original project instead.

I probably won't be accepting issues/PRs on this repo. Cheers!

