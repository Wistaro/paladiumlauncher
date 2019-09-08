/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const ProcessBuilder = require('./assets/js/processbuilder');

let currentLauncherPanel;

const LAUNCHER_PANELS = {
    home: '#launcher-home-panel',
    store: '#launcher-store-panel',
    betalauncher: '#launcher-betalauncher-panel',
    maintenance: '#launcher-maintenance-panel'
}

function switchLauncherPanel(current, next) {
    currentLauncherPanel = next;
    $(`${current}`).hide();
    $(`${next}`).fadeIn(500);
}

function initLauncherView() {
    currentLauncherPanel = LAUNCHER_PANELS.home;
    $(LAUNCHER_PANELS.home).fadeIn(1000);
    
    initLauncherHeader();
    initLauncherHomePanel();
}

// Header Functions
// #region

function initLauncherHeader() {
    var splashes = ["Paladium V6 !"]; // TODO : Add other soon..
    var splashe_text = splashes[Math.floor(Math.random() * splashes.length)];
    var rand = Math.floor(Math.random() * 100);

    if(rand == 1) {
        splashe_text = "Nep nep nep";
    }
    else if(rand == 2) {
        splashe_text = "Origami <3";
    }
    else if(rand == 3) {
        splashe_text = "Chaika9 <3";
    }
    
    if(rand == 4) {
        splashe_text = "Terrainwax";
    }
    else if(rand == 5) {
        splashe_text = "Goldorak85";
    }
    else if(rand == 6) {
        splashe_text = "FuzeIII";
    }
    else if(rand == 7) {
        splashe_text = "Viking5754";
    }
    else if(rand == 8) {
        splashe_text = "Soristos";
    }

    $("#subtitle").html(splashe_text);
}

$("#launcher-nav-home-button").click(function() {
    var element = $(this);
    if(!element.hasClass('active')) {
        switchLauncherPanel(currentLauncherPanel, LAUNCHER_PANELS.home);
        initLauncherHomePanel();
    }
});

$("#launcher-nav-community-button").click(function() {
    var element = $(this);
    if(!element.hasClass('active')) {
        switchLauncherPanel(currentLauncherPanel, LAUNCHER_PANELS.maintenance);
    }
});

$("#launcher-nav-wiki-button").click(function() {
    var element = $(this);
    if(!element.hasClass('active')) {
        switchLauncherPanel(currentLauncherPanel, LAUNCHER_PANELS.maintenance);
    }
});

$("#launcher-nav-support-button").click(function() {
    var element = $(this);
    if(!element.hasClass('active')) {
        switchLauncherPanel(currentLauncherPanel, LAUNCHER_PANELS.maintenance);
    }
});

$("#launcher-nav-betalauncher-button").click(function() {
    var element = $(this);
    if(!element.hasClass('active')) {
        switchLauncherPanel(currentLauncherPanel, LAUNCHER_PANELS.betalauncher);
    }
});

$("#launcher-nav-store-button").click(function() {
    var element = $(this);
    if(!element.hasClass('active')) {
        switchLauncherPanel(currentLauncherPanel, LAUNCHER_PANELS.store);
    }
});

$("#launcher-nav-workshop-button").click(function() {
    var element = $(this);
    if(!element.hasClass('active')) {
        switchLauncherPanel(currentLauncherPanel, LAUNCHER_PANELS.maintenance);
    }
});

$(".nav-left > a").on("click", function() {
    var element = $(this);

    $(".nav-left .active").removeClass("active");
    $(".nav-right .active").removeClass("active");
    element.addClass("active");
});

$(".nav-right > a").on("click", function() {
    var element = $(this);

    $(".nav-left .active").removeClass("active");
    $(".nav-right .active").removeClass("active");
    element.addClass("active");
});

// #endregion