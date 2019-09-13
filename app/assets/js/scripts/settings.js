/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

let currentSettingsPanel;

function setupSettingsTabs() {
    Array.from(document.getElementsByClassName('settingsTab')).map((val) => {
        if(val.hasAttribute('rSc')) {
            val.onclick = () => {
                settingsNavItemListener(val);
            }
        }
    })
}

function settingsNavItemListener(ele) {
    var navItems = $(".selected");
    if(navItems.hasClass('settingsTab')) {
        navItems.removeClass("selected");
        navItems.attr("disabled", false);
    }

    let oldPanel = currentSettingsPanel;
    ele.className += ' selected';
    ele.disabled = true;
    currentSettingsPanel = '#' + ele.getAttribute('rSc');

    $(oldPanel).hide();
    $(currentSettingsPanel).fadeIn(250);
}

function initSettings(tab = 'settings-user-compte-panel') {
    initSettingsUserCompteTab();
    initSettingsJavaMemoryTab();
    initSettingsJavaExecutableTab();
    initSettingsLauncherDistroTab();
    initSettingsGameDirectoryTab();

    var navItems = $(".selected");
    if(navItems.hasClass('settingsTab')) {
        navItems.removeClass("selected");
        navItems.attr("disabled", false);
    }

    if(currentSettingsPanel != null) {
        $(currentSettingsPanel).hide();
    }

    $('#' + tab).fadeIn(250);
    currentSettingsPanel = '#' + tab;
    $('#' + tab + '-button').addClass('selected').prop("disabled", true);
}

setupSettingsTabs();

/**
 * Saves
 */
$("#settings-save-button").click(function() {
    let maxRam = Number(settingsMaxRAMRange.getAttribute('value'));
    if(maxRam % 1 > 0) {
        maxRam = Math.round(maxRam * 1000) + 'M';
    } 
    else {
        maxRam = Math.round(maxRam) + 'G';
    }
    ConfigManager.setMaxRAM(maxRam);

    let minRam = Number(settingsMinRAMRange.getAttribute('value'));
    if(minRam % 1 > 0) {
        minRam = Math.round(minRam * 1000) + 'M';
    } 
    else {
        minRam = Math.round(minRam) + 'G';
    }
    ConfigManager.setMinRAM(minRam);

    ConfigManager.setJavaExecutable(initSettingsJavaExecutableTextField.value);

    if(initSettingsLauncherDistroTextField.value == "") {
        ConfigManager.setDistroCustom("false");
        ConfigManager.setDistroURL(null);
    }
    else {
        ConfigManager.setDistroCustom("true");
        ConfigManager.setDistroURL(initSettingsLauncherDistroTextField.value);
    }

    ConfigManager.save();

    switchView(getCurrentView(), VIEWS.launcher);
});