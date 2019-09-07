/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const loginForm = document.getElementById('login-form');
const loginUsernameTextField = document.getElementById('login-username-textfield');
const loginPasswordTextField = document.getElementById('login-password-textfield');
const loginButton = document.getElementById('login-button');

const basicEmail = /^\S+@\S+\.\S+$/;

loginForm.onsubmit = () => { 
    return false; 
}

loginButton.addEventListener('click', () => {
    onLogin();
});

document.addEventListener('keydown', (e) => {
    if(getCurrentView() === VIEWS.login && !loginUsernameTextField.disabled) {
        if(e.key === 'Enter') {
            onLogin();
        }
    }
});

$("#login-help-button").click(function() {
    setOverlayContent('Aide',
        '~~ C\'est pour bientôt ! 💜', 
        'Retour');
    toggleOverlay(true);
    setCloseHandler();
});

function showLoginError(title, value) {
    setOverlayContent(title,
        value, 
        'Retour');
    toggleOverlay(true);
    setCloseHandler();
}

function onLogin() {
    if(loginUsernameTextField.value && loginPasswordTextField.value) {
        if(!basicEmail.test(loginUsernameTextField.value)) {
            showLoginError("Adresse email non valide ! 😅", "Merci de vérifier votre adresse email.");
            return;
        }
    }
    else {
        return;
    }

    formDisabled(true);

    AuthManager.addAccount(loginUsernameTextField.value, loginPasswordTextField.value).then((value) => {
        setTimeout(() => {
            switchView(getCurrentView(), VIEWS.launcher, () => {
                loginUsernameTextField.value = '';
                loginPasswordTextField.value = '';
                formDisabled(false);
            });
            initLauncherView();
        }, 1000);
    }).catch((err) => {
        formDisabled(false);
        loginPasswordTextField.value = '';

        const errF = resolveError(err);
        showLoginError(errF.title, errF.desc);
    });
}

function resolveError(err) {
    // Mojang Response => err.cause | err.error | err.errorMessage
    // Node error => err.code | err.message
    
    if(err.cause != null && err.cause === 'UserMigratedException') {
        return {
            title: "Échec d'authentification ! 😭",
            desc: "Vous avez tenté de vous connecter avec un compte migré. <br><br>Essayez à nouveau en utilisant l'adresse e-mail du compte."
        }
    }
    else {
        if(err.error != null) {
            if(err.error === 'ForbiddenOperationException') {
                if(err.errorMessage != null) {
                    if(err.errorMessage === 'Invalid credentials. Invalid username or password.') {
                        return {
                            title: "Échec d'authentification ! 😭",
                            desc: "L'adresse e-mail ou le mot de passe que vous avez entré est incorrect. <br><br>Veuillez réessayer."
                        }
                    }
                    else if(err.errorMessage === 'Invalid credentials.') {
                        return {
                            title: "Trop de tentative de connexion ! 🤔",
                            desc: "Il y a eu trop de tentatives de connexion avec ce compte récemment. <br><br>Veuillez réessayer plus tard."
                        }
                    }
                }
            }
        }
        else {
            if(err.code != null) {
                if(err.code === 'ENOENT') {
                    // No Internet.
                    return {
                        title: "Pas de connexion Internet ! 😮",
                        desc: "Vous devez être connecté à Internet pour pouvoir vous connecter. <br>Veuillez vous connecter et réessayer."
                    }
                } 
                else if(err.code === 'ENOTFOUND') {
                    // Could not reach server.
                    return {
                        title: "Serveur d'authentification non disponible ! 😱",
                        desc: "Le serveur d'authentification de Mojang est actuellement hors ligne ou inaccessible. <br>S'il vous plaît attendez un peu et essayez à nouveau. <br><br>Vous pouvez vérifier l’état du serveur sur <a href=\"https://help.mojang.com/\">Mojang's help portal</a>."
                    }
                }
            }
        }
    }
}

function formDisabled(value) {
    loginDisabled(value);
    loginUsernameTextField.disabled = value;
    loginPasswordTextField.disabled = value;
}

function loginDisabled(value) {
    if(loginButton.disabled !== value) {
        loginButton.disabled = value;
    }

    if(value) {
        $('#login-button-loader').show();
    }
    else {
        $('#login-button-loader').hide();
    }
}