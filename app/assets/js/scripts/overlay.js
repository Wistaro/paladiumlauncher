/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

// Overlay : Simple
// #region

function setOverlayContent(title, description, buttonClose = 'Fermer', buttonAction = null, timeLeft = null, timeLeftMessage = null) {
    document.getElementById('overlay-title').innerHTML = title;
    document.getElementById('overlay-desc').innerHTML = description;
    document.getElementById('overlay-button-close').innerHTML = buttonClose;
    document.getElementById('overlay-button-action').innerHTML = buttonAction;

    $('#overlay-button-action').hide();

    if(timeLeft != null) {
        var x = setInterval(function() {
            document.getElementById("overlay-autoreload").innerHTML = timeLeftMessage + " " + timeLeft + "s";
            timeLeft -= 1;

            if(timeLeft <= 0) {
                clearInterval(x);
                document.getElementById("overlay-autoreload").innerHTML = "";
            }
        }, 1000);
    }

    if(buttonAction != null) {
        $('#overlay-button-action').show();
    }

    $('#overlay').show();
}

function toggleOverlay(toggleState) {
    if(toggleState) {
        document.getElementById('main').setAttribute('overlay', true);
        $('#overlay-view').fadeIn(350);
    }
    else {
        document.getElementById('main').removeAttribute('overlay');
        $('#overlay-view').fadeOut(350);
        $('#overlay').hide();
    }
}

function setActionHandler(handler) {
    if(handler == null) {
        document.getElementById('overlay-button-action').onclick = () => {
            toggleOverlay(false);
        }
    } 
    else {
        document.getElementById('overlay-button-action').onclick = handler;
    }
}

function setCloseHandler(handler) {
    if(handler == null) {
        document.getElementById('overlay-button-close').onclick = () => {
            toggleOverlay(false);
        }
    } 
    else {
        document.getElementById('overlay-button-close').onclick = handler;
    }
}

// #endregion

// Overlay : Game update
// #region

function setGameUpdateOverlayContent() {
    $('#game-update-overlay').show();
}

function toggleGameUpdateOverlay(toggleState) {
    if(toggleState) {
        document.getElementById('main').setAttribute('game-update-overlay', true);
        $('#overlay-view').fadeIn(350);
    }
    else {
        document.getElementById('main').removeAttribute('game-update-overlay');
        $('#overlay-view').fadeOut(350);
        $('#game-update-overlay').hide();
    }
}

function setGameUpdateOverlayTitle(title) {
    document.getElementById('game-update-overlay-title').innerHTML = title;
}

function setGameUpdateOverlayDownload(text) {
    document.getElementById('game-update-overlay-download').innerHTML = text;
}

function setGameUpdateOverlayDownloadProgress(percent) {
    document.getElementById('game-update-overlay-download-percent').innerHTML = percent + "%";

    let p = parseFloat(percent.toFixed(1));
    if(p >= 100) {
        p = 100;
    }
    $('.progress__bar').css({ width: p + "%" });
}

// #endregion