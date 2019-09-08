/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const os = require('os');

const settingsMaxRAMRange = document.getElementById('settings-max-ram-range');
const settingsMaxRAMLabel = document.getElementById('settings-max-ram-label');
const settingsMinRAMRange = document.getElementById('settings-min-ram-range');
const settingsMinRAMLabel = document.getElementById('settings-min-ram-label');

const settingsMemoryTotalLabel = document.getElementById('settings-memory-total-label');
const settingsMemoryAvailLabel = document.getElementById('settings-memory-avail-label');

const SETTINGS_MAX_MEMORY = ConfigManager.getAbsoluteMaxRAM();
const SETTINGS_MIN_MEMORY = ConfigManager.getAbsoluteMinRAM();

settingsMaxRAMRange.setAttribute('max', SETTINGS_MAX_MEMORY);
settingsMaxRAMRange.setAttribute('min', SETTINGS_MIN_MEMORY);
settingsMinRAMRange.setAttribute('max', SETTINGS_MAX_MEMORY);
settingsMinRAMRange.setAttribute('min', SETTINGS_MIN_MEMORY);

function initSettingsJavaMemoryTab() {
    let memoryMaxAbsolute = Number((os.totalmem() - 1000000000) / 1000000000).toFixed(1);

    let maxRam = ConfigManager.getMaxRAM();
    if(maxRam.endsWith('M')) {
        maxRam = Number(maxRam.substring(0, maxRam.length - 1)) / 1000;
    } 
    else {
        maxRam = Number.parseFloat(maxRam);
    }

    let minRam = ConfigManager.getMinRAM();
    if(minRam.endsWith('M')) {
        minRam = Number(minRam.substring(0, minRam.length - 1)) / 1000;
    } 
    else {
        minRam = Number.parseFloat(minRam);
    }

    settingsMaxRAMRange.setAttribute('value', maxRam);
    settingsMinRAMRange.setAttribute('value', minRam);

    settingsMemoryTotalLabel.innerHTML = memoryMaxAbsolute + 'Go';
    setInterval(function() {
        settingsMemoryAvailLabel.innerHTML = Number(os.freemem() / 1000000000).toFixed(1) + 'Go';
    }, 1000);

    bindRangeSlider();
}

settingsMinRAMRange.onchange = (e) => {
    const sMaxV = Number(settingsMaxRAMRange.getAttribute('value'));
    const sMinV = Number(settingsMinRAMRange.getAttribute('value'));

    const bar = e.target.getElementsByClassName('range-slider-bar')[0];
    const max = (os.totalmem() - 1000000000) / 1000000000;

    if(sMinV >= max / 2) {
        bar.style.background = '#e86060';
    } 
    else if(sMinV >= max / 4) {
        bar.style.background = '#e8e18b';
    } 
    else {
        bar.style.background = null;
    }

    if(sMaxV < sMinV) {
        const sliderMeta = calculateRangeSliderMeta(settingsMaxRAMRange);
        updateRangedSlider(settingsMaxRAMRange, sMinV, ((sMinV - sliderMeta.min) / sliderMeta.step) * sliderMeta.inc);
        settingsMaxRAMLabel.innerHTML = sMinV.toFixed(1) + 'Go';
    }
    settingsMinRAMLabel.innerHTML = sMinV.toFixed(1) + 'Go';
}

settingsMaxRAMRange.onchange = (e) => {
    const sMaxV = Number(settingsMaxRAMRange.getAttribute('value'));
    const sMinV = Number(settingsMinRAMRange.getAttribute('value'));

    const bar = e.target.getElementsByClassName('range-slider-bar')[0];
    const max = (os.totalmem() - 1000000000) / 1000000000;
    
    if(sMaxV >= max / 2) {
        bar.style.background = '#e86060';
    } 
    else if(sMaxV >= max / 4) {
        bar.style.background = '#e8e18b';
    } 
    else {
        bar.style.background = null;
    }

    if(sMaxV < sMinV) {
        const sliderMeta = calculateRangeSliderMeta(settingsMaxRAMRange);
        updateRangedSlider(settingsMinRAMRange, sMaxV, ((sMaxV - sliderMeta.min) / sliderMeta.step) * sliderMeta.inc);
        settingsMinRAMLabel.innerHTML = sMaxV.toFixed(1) + 'Go';
    }
    settingsMaxRAMLabel.innerHTML = sMaxV.toFixed(1) + 'Go';
}