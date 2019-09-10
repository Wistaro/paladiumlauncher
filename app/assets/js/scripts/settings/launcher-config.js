/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

 const $initSettingsGameDirectoryField = $('#gameDirectory')
 const $initSettingsGameDirectorySelect = $('#settings-game-directory-select');

 function initSettingsGameDirectoryTab() {
    $initSettingsGameDirectoryField.val(ConfigManager.getWorkingDirectory());
}

$($initSettingsGameDirectorySelect).click( function() {
    shell.openExternal($initSettingsGameDirectoryField.val());
});
