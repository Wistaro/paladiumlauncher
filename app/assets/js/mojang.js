/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const request = require('request');
const logger  = require('./loggerutil')('%c[Mojang]', 'color: #a02d2a; font-weight: bold');

const minecraftAgent = {
    name: 'Minecraft',
    version: 1
}

const authpath = 'https://authserver.mojang.com';
const statuses = [
    {
        service: 'sessionserver.mojang.com',
        status: 'grey',
        name: 'Multiplayer Session Service',
        essential: true
    },
    {
        service: 'authserver.mojang.com',
        status: 'grey',
        name: 'Authentication Service',
        essential: true
    },
    {
        service: 'textures.minecraft.net',
        status: 'grey',
        name: 'Minecraft Skins',
        essential: false
    },
    {
        service: 'api.mojang.com',
        status: 'grey',
        name: 'Public API',
        essential: false
    },
    {
        service: 'minecraft.net',
        status: 'grey',
        name: 'Minecraft.net',
        essential: false
    },
    {
        service: 'account.mojang.com',
        status: 'grey',
        name: 'Mojang Accounts Website',
        essential: false
    }
];

exports.statusToHex = function(status) {
    switch(status.toLowerCase()) {
        case 'green':
            return '#a5c325';
        case 'yellow':
            return '#eac918';
        case 'red':
            return '#c32625';
        case 'grey':
        default:
            return '#848484';
    }
}

exports.status = function() {
    return new Promise((resolve, reject) => {
        request.get('https://status.mojang.com/check', {
            json: true,
            timeout: 2500
        },
        function(error, response, body) {
            if(error || response.statusCode !== 200) {
                logger.warn('Unable to retrieve Mojang status.');
                logger.debug('Error while retrieving Mojang statuses:', error);
                for(let i=0; i<statuses.length; i++) {
                    statuses[i].status = 'grey';
                }
                resolve(statuses);
            } 
            else {
                for(let i=0; i<body.length; i++) {
                    const key = Object.keys(body[i])[0]
                    inner:;
                    for(let j=0; j<statuses.length; j++) {
                        if(statuses[j].service === key) {
                            statuses[j].status = body[i][key];
                            break inner;
                        }
                    }
                }
                resolve(statuses);
            }
        });
    });
}

exports.authenticate = function(username, password, clientToken, requestUser = true, agent = minecraftAgent) {
    return new Promise((resolve, reject) => {
        const body = {
            agent,
            username,
            password,
            requestUser
        }

        if(clientToken != null) {
            body.clientToken = clientToken;
        }

        request.post(authpath + '/authenticate', {
            json: true,
            body
        },
        function(error, response, body) {
            if(error) {
                logger.error('Error during authentication.', error);
                reject(error);
            } 
            else {
                if(response.statusCode === 200) {
                    resolve(body);
                } 
                else {
                    reject(body || {code: 'ENOTFOUND'});
                }
            }
        });
    });
}

exports.validate = function(accessToken, clientToken) {
    return new Promise((resolve, reject) => {
        request.post(authpath + '/validate', {
                json: true,
                body: {
                    accessToken,
                    clientToken
                }
            },
            function(error, response, body) {
                if(error) {
                    logger.error('Error during validation.', error);
                    reject(error);
                } 
                else {
                    if(response.statusCode === 403) {
                        resolve(false);
                    } 
                    else {
                    // 204 if valid
                    resolve(true);
                }
            }
        });
    });
}

exports.invalidate = function(accessToken, clientToken) {
    return new Promise((resolve, reject) => {
        request.post(authpath + '/invalidate', {
            json: true,
            body: {
                accessToken,
                clientToken
            }
        },
        function(error, response, body) {
            if(error) {
                logger.error('Error during invalidation.', error);
                reject(error);
            } 
            else {
                if(response.statusCode === 204) {
                    resolve();
                } 
                else {
                    reject(body);
                }
            }
        });
    });
}

exports.refresh = function(accessToken, clientToken, requestUser = true) {
    return new Promise((resolve, reject) => {
        request.post(authpath + '/refresh', {
            json: true,
            body: {
                accessToken,
                clientToken,
                requestUser
            }
        },
        function(error, response, body) {
            if(error) {
                logger.error('Error during refresh.', error);
                reject(error);
            } 
            else {
                if(response.statusCode === 200) {
                    resolve(body);
                } 
                else {
                    reject(body);
                }
            }
        });
    });
}