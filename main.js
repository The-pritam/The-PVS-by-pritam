const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// Use the app’s data folder to store data.json
const dataPath = path.join(app.getPath('userData'), 'data.json');
const apiKey = '66be4cd1e2f35b9b853f45c53503ec92da94c9951c63319dbf576893fecf497b';

// Create data.json if it doesn't exist
async function ensureDataFile() {
  try {
    await fs.access(dataPath);
  } catch (err) {
    // File does not exist, create it
    await fs.writeFile(dataPath, JSON.stringify([]));
  }
}

async function sendSMS(phoneNumber, message) {
  try {
    const response = await axios.post('https://sms.aakashsms.com/sms/v3/send', {
      auth_token: apiKey,
      to: phoneNumber,
      text: message,
    });
    console.log('SMS sent:', response.data);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
}

async function checkExpiryDates() {
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const today = new Date().toISOString().split('T')[0];
  let dataChanged = false;
  let remindersSentToday = 0;

  for (const vaccine of data) {
    if (vaccine.expiryDate === today && !vaccine.reminderSent) {
      const message = `Reminder: Your pet ${vaccine.petName}'s ${vaccine.vaccinationType} vaccination has expired. Please visit the bardibas vet clinic and pet shops.`;
      await sendSMS(vaccine.ownerContact, message);
      vaccine.reminderSent = true;
      dataChanged = true;
      remindersSentToday++;
    }
  }

  if (dataChanged) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  }

  return remindersSentToday;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.on('ready', async () => {
  await ensureDataFile();
  const remindersSentToday = await checkExpiryDates();
  dialog.showMessageBox({
    type: 'info',
    title: 'Reminders Sent',
    message: `${remindersSentToday} reminder(s) sent today.`,
    buttons: ['OK']
  });
  setInterval(checkExpiryDates, 24 * 60 * 60 * 1000); // Check every 24 hours
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('read-data', async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data:', err);
    return [];
  }
});

ipcMain.handle('write-data', async (event, data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing data:', err);
  }
});

ipcMain.on('send-reminder', async () => {
  const remindersSentToday = await checkExpiryDates();
  dialog.showMessageBox({
    type: 'info',
    title: 'Reminders Sent',
    message: `${remindersSentToday} reminder(s) sent today.`,
    buttons: ['OK']
  });
});
