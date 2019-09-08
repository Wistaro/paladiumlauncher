/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

function initLauncherHomePanel() {
    refreshServer();
}

$("#launcher-home-options-button").click(function() {
    switchView(getCurrentView(), VIEWS.settings);
    initSettings();
});

$("#launcher-home-play-button").click(function() {
    gameUpdate();
});

document.addEventListener('keydown', (e) => {
    if(getCurrentView() === VIEWS.launcher && currentLauncherPanel === LAUNCHER_PANELS.home) {
        if(e.key === 'Enter') {
            // TODO : Ajout de l'event key (ENTER) pour lancer le jeu.
            // gameUpdate();
        }
    }
});

function refreshServer() {
    var paladium_server = require('./assets/js/minecraftserver');
    paladium_server.init('play.paladium-pvp.fr', 25565, function(result) {
        if(paladium_server.online) {
            $("#server-paladium-players").html(paladium_server.current_players);
            $("#server-paladium-latency").html(paladium_server.latency);

            $("#server-total-players").html(paladium_server.current_players + " <i class=\"online\"></i>");
        }
        else {
            $("#server-total-players").html("0 <i class=\"offline\"></i>");
        }
    });
}

// Game update Functions
// #region

let gameAssetEx;
function gameUpdate() {
    let proc;
    let isValideDistro = false;
    
    const loggerGameAssetEx = LoggerUtil('%c[AssetManagerEx]', 'color: #000668; font-weight: bold');
    loggerGameAssetEx.log('Initialization..');

    setGameUpdateOverlayContent();
    toggleGameUpdateOverlay(true);

    setGameUpdateOverlayDownloadProgress(0);
    setGameUpdateOverlayDownload("Recherche de mise à jour..");

    $(VIEWS.launcher).fadeOut(1000);

    gameAssetEx = cp.fork(path.join(__dirname, 'assets', 'js', 'assetmanagerexec.js'), [
        'AssetManager',
        ConfigManager.getCommonDirectory(),
        ConfigManager.getJavaExecutable()
    ], {
        stdio: 'pipe'
    });

    // Stdout
    gameAssetEx.stdio[1].setEncoding('utf8');
    gameAssetEx.stdio[1].on('data', (data) => {
        loggerGameAssetEx.log(data);
    });
    // Stderr
    gameAssetEx.stdio[2].setEncoding('utf8');
    gameAssetEx.stdio[2].on('data', (data) => {
        loggerGameAssetEx.log(data);
    });

    gameAssetEx.on('error', (err) => {
        loggerLaunchSuite.error('Error during launch', err);
    })
    gameAssetEx.on('close', (code, signal) => {
        if(code !== 0) {
            loggerLaunchSuite.error(`AssetExec exited with code ${code}, assuming error.`);
        }
    })

    gameAssetEx.on('message', (m) => {
        if(m.context === 'validate') {
            switch(m.data) {
                case 'distribution': {
                    loggerGameAssetEx.log('Validated distibution index.');
                    isValideDistro = true;
                    break;
                }
                case 'version': {
                    loggerGameAssetEx.log('Version data loaded.');
                    setGameUpdateOverlayDownload("Vérification de la version..");
                    break;
                }
                case 'assets': {
                    loggerGameAssetEx.log('Asset Validation Complete.');
                    setGameUpdateOverlayDownload("Vérification des assets..");
                    break;
                }
                case 'libraries': {
                    loggerGameAssetEx.log('Library validation complete.');
                    setGameUpdateOverlayDownload("Vérification des libraries..");
                    break;
                }
                case 'files': {
                    loggerGameAssetEx.log('File validation complete.');
                    setGameUpdateOverlayDownload("Vérification des fichiers..");
                    break; 
                }
            }
        }
        else if(m.context === 'progress') {
            setGameUpdateOverlayDownload("Téléchargement des fichiers en cours..");

            switch(m.data) {
                case 'assets': {
                    const perc = (m.value / m.total) * 100;
                    setGameUpdateOverlayDownloadProgress(Math.round(perc));
                    break;
                }
                case 'download': {
                    setDownloadPercentage(m.value, m.total, m.percent);
                    break;
                }
            }
        }
        else if(m.context === 'complete') {
            switch(m.data) {
                case 'download': {
                    setGameUpdateOverlayDownload("Chargement en cours..");
                    break;
                }
            }
        }
        else if(m.context === 'error') {
            toggleGameUpdateOverlay(false);

            setOverlayContent('Mise à jour échoué 😭',
                'Une erreur c\'est produite lors de la mise à jour du jeu.'
                + '<br>Nous vous conseillons de réessayer la mise à jour avec le bouton ci-dessous.', 
                'Annuler', 'Réessayer');
            toggleOverlay(true);

            setCloseHandler();
            setActionHandler(() => {
                toggleOverlay(false);
                gameUpdate();
            });
        }
        else if(m.context === 'validateEverything') {
            if(!isValideDistro) {
                gameAssetEx.disconnect();

                $(VIEWS.launcher).fadeIn(1000);
                toggleGameUpdateOverlay(false);

                if(ConfigManager.getDistroCustom() == 'true') {
                    setOverlayContent('Mise à jour échoué 😭',
                        'Une erreur c\'est produite lors de la récupération des distributions.'
                        + '<br><i class="fas fa-angle-right"></i> Nous vous conseillons de vérifier l\'url de distribution dans les options du launcher.', 
                        'Annuler');
                    toggleOverlay(true);
        
                    setCloseHandler();
                }
                else {
                    setOverlayContent('Mise à jour échoué 😭',
                        'Une erreur c\'est produite lors de la mise à jour du jeu.'
                        + '<br><i class="fas fa-angle-right"></i> Nous vous conseillons de réessayer la mise à jour avec le bouton ci-dessous.', 
                        'Annuler', 'Réessayer');
                    toggleOverlay(true);
        
                    setCloseHandler();
                    setActionHandler(() => {
                        toggleOverlay(false);
                        gameUpdate();
                    });
                }

                return;
            }
            setGameUpdateOverlayDownload("Lancement du jeu en cours..");

            const tempListener = function(data) {
                if(data.trim().match(/Initializing LWJGL OpenAL/i)) {
                    proc.stdout.on('data', gameStateChange);
                    proc.stdout.removeListener('data', tempListener);
                    proc.stderr.removeListener('data', gameErrorListener);

                    $(VIEWS.launcher).fadeIn(1000);
                    toggleGameUpdateOverlay(false);
                }
            }
            
            const gameStateChange = function(data) {
                // TODO : Ajouter d'autre event d'erreur.

                data = data.trim();
                if(data.trim().match(/Error in class 'LibraryLWJGLOpenAL'/i)) {
                    proc.kill();

                    setOverlayContent('Erreur de lancement',
                    'Nous avons détecté une erreur lors du lancement de votre jeu.'
                    + '<br>Nous vous conseillons de relancer votre jeu avec le bouton ci-dessous.', 
                    'Annuler', 'Relancer');
                    toggleOverlay(true);

                    setCloseHandler();
                    setActionHandler(() => {
                        toggleOverlay(false);
                        gameUpdate();
                    });
                }
            }

            const gameErrorListener = function(data) {
                // TODO : Ajouter d'autre event d'erreur.

                data = data.trim();
                if(data.indexOf('Could not find or load main class net.minecraft.launchwrapper.Launch') > -1) {
                    console.error('Game launch failed, LaunchWrapper was not downloaded properly.');
                }
                
                $(VIEWS.launcher).fadeIn(1000);
                toggleGameUpdateOverlay(false);
            }

            forgeData = m.result.forgeData;
            versionData = m.result.versionData;

            const instance = DistroManager.getDistribution().getInstance(ConfigManager.getSelectedInstance());
            const authUser = ConfigManager.getSelectedAccount();
            console.log(`Sending selected account (${authUser.displayName}) to ProcessBuilder.`)

            let pb = new ProcessBuilder(instance, versionData, forgeData, authUser);
            try {
                proc = pb.build(); // Build Minecraft process.

                proc.stdout.on('data', tempListener);
                proc.stderr.on('data', gameErrorListener);

                proc.on('close', (code, signal) => {
                    $("#launcher-home-play-button").attr("disabled", false);
                });

                $("#launcher-home-play-button").attr("disabled", true);
            } 
            catch(err) {
                console.error('Error during launch', err);

                $(VIEWS.launcher).fadeIn(1000);
                toggleGameUpdateOverlay(false);

                $("#launcher-home-play-button").attr("disabled", false);
            }

            gameAssetEx.disconnect();
        }
    });

    gameAssetEx.send({task: 'execute', function: 'validateEverything', argsArr: [ConfigManager.getSelectedInstance()]});
}

function setDownloadPercentage(value, max, percent = ((value / max) * 100)) {
    setGameUpdateOverlayDownloadProgress(percent);
}

// #endregion