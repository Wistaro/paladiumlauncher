/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const ConfigManager = require('./configmanager');

const logger = require('./loggerutil')('%c[Preloader]', 'color: #a02d2a; font-weight: bold');

logger.log('Loading..');

// Load ConfigManager
ConfigManager.load();

fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err) {
        logger.warn('Error while cleaning natives directory', err);
    }
    else {
        logger.log('Cleaned natives directory.');
    }
});