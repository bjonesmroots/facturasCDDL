const { app, shell, BrowserWindow, ipcMain, Notification } = require('electron');
const { promises: fs, constants }   = require('fs');
const path                          = require('path');
const assestPath                    = app.getPath("userData");
const viewsPath                     = path.join(__dirname, 'views');
let workerWindow                    = null;
let mainWindow                      = null;
const nodemailer                    = require("nodemailer");
require('@electron/remote/main').initialize();

try {
  require('electron-reloader')(module)
} catch (_) {}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const gotTheLock = app.requestSingleInstanceLock()
    
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  const createWindow = async () => {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
    // Create the browser window.
    console.log('createWindow');
    mainWindow = new BrowserWindow({
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
    
    mainWindow.maximize();
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
    },2000)
  });
  
  ipcMain.on("readyToPrintPDF", (event, selectedCaePrint, selectedCaeSavePdf, cae) => {
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
    
    if (selectedCaeSavePdf == 'true') {
      setTimeout(function () {
          workerWindow.webContents.printToPDF(options).then(data => {
            fs.writeFile(path.join(assestPath, 'comprobantes/' + cae + ".pdf"), data);
            if (selectedCaePrint == 'true') {
              workerWindow.webContents.print(options);
            }
          }).catch(error => {
            new Notification({ title: 'Failed to write PDF', body: error }).show();
          });
      }, 2000);
    } else if (selectedCaePrint == 'true') {
      workerWindow.webContents.print(options);
    }
  })
  
  function SendIt(cae, email) {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "litoralfiatrosario@gmail.com",
        pass: "Asdasd123.",
      },
    });
  
    const mailOptions = {
      from: "litoralfiatrosario@gmail.com", 
      to: email,
      subject: "Se adjunta comprobante",
      html: "<p>Se adjunta comprobante.</p>",
      attachments: [
        {  
            filename: cae + ".pdf",
            path: path.join(assestPath, 'comprobantes/' + cae + ".pdf")
        },
      ]
    };
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        new Notification({ title: 'Error al enviar el email:', body: err.message }).show();
      }
      else { 
        new Notification({ title: 'Email enviado:', body: 'Email enviado con compprobante ' + cae + ' a ' + email }).show();
      }
    });
  }
  
  
  ipcMain.on("SendIt", (event, cae, email) => {
    console.log("ipcMain: Executing SendIt");
    SendIt(cae, email);
  });
  
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
      try {
        await fs.mkdir(path.join(assestPath, 'comprobantes'));
      } catch (e) {
      }
      await fs.access(path.join(assestPath, 'cert.crt'), constants.R_OK);
      await fs.access(path.join(assestPath, 'key.key'), constants.R_OK);
      await fs.access(path.join(assestPath, 'cuit.txt'), constants.R_OK);
      return true;
    } catch (e) {
      return false;
    }
  }  
}