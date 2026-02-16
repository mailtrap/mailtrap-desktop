const {app, BrowserWindow} = require('electron'); console.log('app?:', typeof app); app.on('ready', () => { console.log('READY'); app.quit(); });
