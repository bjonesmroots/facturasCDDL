const { app, shell, BrowserWindow, ipcMain } = require('electron');
const { promises: fs, constants }   = require('fs');
const path                          = require('path');
const assestPath                    = app.getPath("userData");
const viewsPath                     = path.join(__dirname, 'views');
let workerWindow                  = null;
require('@electron/remote/main').initialize();

try {
  require('electron-reloader')(module)
} catch (_) {}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = async () => {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
  // Create the browser window.
  console.log('createWindow');
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    icon: path.join(app.getAppPath(), "assets/icon.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  if (await configurated()) {
    mainWindow.loadFile(path.join(viewsPath, 'generate_invoice.html'));
  } else {
    mainWindow.loadFile(path.join(viewsPath, 'configurate.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  
  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

ipcMain.on("printPDF", function(event, content){
  workerWindow = new BrowserWindow({
    width: 1000,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  workerWindow.loadURL("file://" + __dirname + "/views/invoice_viewer.html");
  setTimeout(function () {
    workerWindow.webContents.send("printPDF", content);
  },1000)
});

ipcMain.on("readyToPrintPDF", (event) => {
  var options = {
    silent: false,
    printBackground: true,
    color: false,
    margin: {
        marginType:'custom',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    landscape: false,
    pagesPerSheet: 1,
    collate: false,
    copies: 1,
    header: 'Header of the Page',
    footer: 'Footer of the Page'
  }
  workerWindow.webContents.print(options);
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

async function configurated() {
  try {
    await fs.access(path.join(assestPath, 'cert.crt'), constants.R_OK);
    await fs.access(path.join(assestPath, 'key.key'), constants.R_OK);
    await fs.access(path.join(assestPath, 'cuit.txt'), constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
}
