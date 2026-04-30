const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'), // Här laddar vi in din nya ikon!
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Laddar den färdigbyggda React-appen
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Lyssna på om webbsidan försöker blockera fönstret från att stängas (osparade ändringar)
  win.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Stäng programmet', 'Avbryt'],
      title: 'Osparade ändringar',
      message: 'Du har osparade ändringar.',
      detail: 'Vill du verkligen stänga programmet? De placeringar du inte har sparat i historiken kommer att gå förlorade.',
      defaultId: 1, // Standardvalet (Avbryt) om man trycker Enter
      cancelId: 1   // Vad som händer om man kryssar rutan (Avbryt)
    });

    const shouldClose = (choice === 0);
    if (shouldClose) {
      // Om användaren klickar "Stäng programmet", ignorera blockeringen och stäng ändå!
      event.preventDefault(); 
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});