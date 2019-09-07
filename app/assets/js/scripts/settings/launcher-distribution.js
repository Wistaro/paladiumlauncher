/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const initSettingsLauncherDistroTextField = document.getElementById('settings-launcher-distro-textfield');

function initSettingsLauncherDistroTab() {
    if(ConfigManager.getDistroCustom() == "true") {
        initSettingsLauncherDistroTextField.setAttribute("value", ConfigManager.getDistroURL());
    }
    else {
        initSettingsLauncherDistroTextField.setAttribute("value", "");
    }
}