/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const {app, BrowserWindow, ipcMain} = require('electron');
const autoUpdater = require('electron-updater').autoUpdater;
const path = require('path');
const url = require('url');
const ejse = require('ejs-electron');

const isDev = require('./app/assets/js/isdev');

let frame;
let isInitAutoUpdater = false;

function initAutoUpdater(event) {
    autoUpdater.autoDownload = false;
    autoUpdater.allowPrerelease = true;

    if(isDev) {
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
    }

    autoUpdater.on('update-available', info => {
        event.sender.send('autoUpdateNotification', 'update-available', info);
    });
    autoUpdater.on('update-downloaded', info => {
        event.sender.send('autoUpdateNotification', 'update-downloaded', info);
    });
    autoUpdater.on('download-progress', (info) => {
        event.sender.send('autoUpdateNotification', 'download-progress', info);
    });
    autoUpdater.on('update-not-available', info => {
        event.sender.send('autoUpdateNotification', 'update-not-available', info);
    });
    autoUpdater.on('checking-for-update', () => {
        event.sender.send('autoUpdateNotification', 'checking-for-update');
    });
    autoUpdater.on('error', (err) => {
        event.sender.send('autoUpdateNotification', 'realerror', err);
    });
}

function initialize() {
    app.setName('Paladium Launcher');
    app.disableHardwareAcceleration();

	if(makeSingleInstance()) {
		return app.quit();
    }

    ipcMain.on('autoUpdateAction', (event, arg, data) => {
        switch(arg) {
            case 'initAutoUpdater': {
                if(!isInitAutoUpdater) {
                    initAutoUpdater(event);
                    isInitAutoUpdater = true;
                }
                event.sender.send('autoUpdateNotification', 'ready');
                break;
            }
            case 'checkForUpdate': {
                autoUpdater.checkForUpdates().catch(err => {
                    event.sender.send('autoUpdateNotification', 'realerror', err);
                });
                break;
            }
            case 'downloadUpdate': {
                autoUpdater.downloadUpdate();
                break;
            }
            case 'installUpdateNow': {
                autoUpdater.quitAndInstall();
                break;
            }
            default: {
                console.log('Unknown argument', arg);
                break;
            }
        }
    });

    app.on('ready', () => {
        createWindow();
    });

    app.on('window-all-closed', () => {
        if(process.platform !== 'darwin') {
            app.quit();
        }
    });
    
    app.on('activate', () => {
        if(frame === null) {
            createWindow();
        }
    });
}

function createWindow() {
    frame = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1280,
        minHeight: 720,
        icon: getPlatformIcon('icon'),
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'app', 'assets', 'js', 'preloader.js'),
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#2f2f2f'
    });

    frame.loadURL(url.format({
        pathname: path.join(__dirname, 'app', 'app.ejs'),
        protocol: 'file:',
        slashes: true
    }));

    frame.setMenu(null);
    frame.setResizable(true);

    frame.on('closed', () => {
        frame = null;
    });
}

function getPlatformIcon(filename) {
    const os = process.platform;
    if(os === 'darwin') {
        filename = filename + '.icns';
    } 
    else if(os === 'win32') {
        filename = filename + '.ico';
    }
    else {
        filename = filename + '.png';
    }
    return path.join(__dirname, 'app', 'assets', 'images', 'icons', filename);
}

function makeSingleInstance() {
    const lock = app.requestSingleInstanceLock();

	if(process.mas) {
		return false;
    }
    
	if(!lock) {
        app.quit();
    } 
    else {
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            if(frame) {
                if(frame.isMinimized()) {
                    frame.restore();
                    frame.focus();
                }
            }
        });
    }
}

initialize();