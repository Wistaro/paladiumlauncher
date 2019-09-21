/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

 const $initSettingsLauncherConfigGameDirectoryTextField = $('#settings-launcher-config-gamedirectory-textfield')
 const $initSettingsLauncherConfigGameDirectoryOpenButton = $('#settings-launcher-config-gamedirectory-open-button');
 const $initSettingsLauncherConfigGameDirectoryEditButton = $('#settings-launcher-config-gamedirectory-edit-button');

 const $initSettingsLauncherConfigKeepLauncherOpenButton = $('#settings-launcher-config-keepopen');
 
 function initSettingsLauncherConfigTab() {
    $initSettingsLauncherConfigGameDirectoryTextField.val(ConfigManager.getWorkingDirectory());
}
//Game Directory
$($initSettingsLauncherConfigGameDirectoryOpenButton).click(function() {
    shell.openExternal($initSettingsLauncherConfigGameDirectoryTextField.val());
});

//Keep Launcher Open While Game iS Running
function initSettingsLauncherOptionsTab(){
    if (ConfigManager.getLauncherConfigKeepOpen()){
        $initSettingsLauncherConfigKeepLauncherOpenButton.attr('checked', 'checked');
    }else{
        $initSettingsLauncherConfigKeepLauncherOpenButton.removeAttr('checked');
    }
}
$initSettingsLauncherConfigKeepLauncherOpenButton.click(function(e){
    //e.preventDefault();
    
    if($(this).prop('checked')){
        ConfigManager.setLauncherConfigKeepOpen('true');

    }else{     
        ConfigManager.setLauncherConfigKeepOpen('false');
    }
});

