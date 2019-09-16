/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

 const $initSettingsLauncherConfigGameDirectoryTextField = $('#settings-launcher-config-gamedirectory-textfield')
 const $initSettingsLauncherConfigGameDirectoryOpenButton = $('#settings-launcher-config-gamedirectory-open-button');
 const $initSettingsLauncherConfigGameDirectoryEditButton = $('#settings-launcher-config-gamedirectory-edit-button');

 function initSettingsLauncherConfigTab() {
    $initSettingsLauncherConfigGameDirectoryTextField.val(ConfigManager.getWorkingDirectory());
}

$($initSettingsLauncherConfigGameDirectoryOpenButton).click(function() {
    shell.openExternal($initSettingsLauncherConfigGameDirectoryTextField.val());
});
