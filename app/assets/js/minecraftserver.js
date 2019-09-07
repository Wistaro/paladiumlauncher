/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

address = null;
port = null;
online = null;
version = null;
motd = null;
current_players = null;
max_players = null;
latency = null;

module.exports = {
    init: function(address, port, timeout, callback) {
        this.address = address;
        this.port = port;

        callback = timeout;
        timeout = 5;

        const net = require('net');
        var start_time = new Date();
        const client = net.connect(port, address, () => {
            this.latency = Math.round(new Date() - start_time);
            var buff = Buffer.from([ 0xFE, 0x01 ]);
            client.write(buff);
        });

        client.setTimeout(timeout * 1000);

        client.on('data', (data) => {
            if(data != null && data != '') {
                var server_info = data.toString().split("\x00\x00\x00");
                if(server_info != null && server_info.length >= 6) {
                    this.online = true;
                    this.version = server_info[2].replace(/\u0000/g, '');
                    this.motd = server_info[3].replace(/\u0000/g, '');
                    this.current_players = server_info[4].replace(/\u0000/g, '');
                    this.max_players = server_info[5].replace(/\u0000/g, '');
                }
                else {
                    this.online = false;
                }
            }
            callback();
            client.end();
        });
            
        client.on('timeout', () => {
            callback();
            client.end();
            //process.exit();
        });

        client.on('end', () => {
            // nothing needed here
        });

        client.on('error', (err) =>  {
            callback();
        });
    }
};