"use strict";

var Service, Characteristic;
var dgram = require('dgram');

module.exports = function (homebridge) {

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-ecoplugs", "EcoPlug", EcoPlug);
}

function EcoPlug(log, config) {
    this.log = log;
    this.name = config.name;
    this.id = config.id;
    this.host = config.host;
    this.port = 80;

    this._service = new Service.Switch(this.name);
    this._service.getCharacteristic(Characteristic.On)
        .on('set', this.setStatus.bind(this))
        .on('get', this.getStatus.bind(this));

    this._info_service = new Service.AccessoryInformation();
    this._info_service
        .setCharacteristic(Characteristic.Model, "CT-065W")
        .setCharacteristic(Characteristic.Manufacturer, "ECO Plugs")
        .setCharacteristic(Characteristic.SerialNumber, this.id);

}

EcoPlug.prototype.getServices = function () {
    return [this._service, this._info_service];
}

EcoPlug.prototype.setStatus = function (on, callback) {

    var message = this.createMessage('set', this.id, on);
    var retry_count = 3;

    this.sendMessage(message, retry_count, function (err, message) {
        if (!err) {
            this.log("Setting %s switch with ID %s to: %s", this.name, this.id, (on ? "ON" : "OFF"));
        }
        callback(err, null);
    }.bind(this));

}

EcoPlug.prototype.getStatus = function (callback) {

    var status = false;

    var message = this.createMessage('get', this.id);
    var retry_count = 3;

    this.sendMessage(message, retry_count, function (err, message) {
        if (!err) {
            status = this.readState(message);
            this.log("Status of %s switch with ID %s is: %s", this.name, this.id, (status ? "ON" : "OFF"));
        }
        callback(err, status);
    }.bind(this));

}

EcoPlug.prototype.createMessage = function (command, id, state) {

    var bufferLength;
    var command1;
    var command2;
    var new_state;

    if (command == 'set') {
        bufferLength = 130;
        command1 = 0x16000500;
        command2 = 0x0200;
        if (state) {
            new_state = 0x0101;
        } else {
            new_state = 0x0100;
        }
    }
    else if (command == 'get') {
        bufferLength = 128;
        command1 = 0x17000500;
        command2 = 0x0000;
    }
    else {
        throw err;
    }

    var buffer = new Buffer(bufferLength);

    buffer.fill(0);

    // Byte 0:3 - Command 0x16000500 = Write, 0x17000500 = Read
    buffer.writeUInt32BE(command1, 0);
    
    // Byte 4:7 - Command sequence num - looks random
    buffer.writeUInt32BE(Math.floor(Math.random() * 0xFFFF), 4);

    // Byte 8:9 - Not sure what this field is - 0x0200 = Write, 0x0000 = Read
    buffer.writeUInt16BE(command2, 8);

    // Byte 10:14 - ASCII encoded FW Version - Set in readback only?
    
    // Byte 15 - Always 0x0
    
    // Byte 16:31 - ECO Plugs ID ASCII Encoded - <ECO-xxxxxxxx>
    buffer.write(id, 16, 16);

    // Byte 32:47 - 0's - Possibly extension of Plug ID
    
    // Byte 48:79 - ECO Plugs name as set in app
    
    // Byte 80:95 - ECO Plugs ID without the 'ECO-' prefix - ASCII Encoded
    
    // Byte 96:111 - 0's
    
    // Byte 112:115 - Something gets returned here during readback - not sure
    
    // Byte 116:119 - The current epoch time in Little Endian
    buffer.writeUInt32LE((Math.floor(new Date() / 1000)), 116);
    
    // Byte 120:123 - 0's
    
    // Byte 124:127 - Not sure what this field is - this value works, but i've seen others 0xCDB8422A
    buffer.writeUInt32BE(0xCDB8422A, 124);
    
    // Byte 128:129 - Power state (only for writes)
    if (buffer.length == 130) {
        buffer.writeUInt16BE(new_state, 128);
    }

    return buffer;
}

EcoPlug.prototype.sendMessage = function (message, retry_count, callback) {

    var socket = dgram.createSocket('udp4');
    var timeout;

    socket.on('message', function (message) {
        clearTimeout(timeout);
        socket.close();
        callback(null, message);
    }.bind(this));

    socket.send(message, 0, message.length, this.port, this.host, function (err, bytes) {
        if (err) {
            callback(err);
        } else {
            timeout = setTimeout(function () {
                socket.close();
                if (retry_count > 0) {
                    this.log("Timeout connecting to %s - Retrying....", this.host);
                    var cnt = retry_count - 1;
                    this.sendMessage(message, cnt, callback);
                } else {
                    this.log("Timeout connecting to %s - Failing", this.host);
                    callback(true);
                }
            }.bind(this), 500);
        }
    }.bind(this));

}

EcoPlug.prototype.readState = function (message) {
    return (message.readUInt8(129)) ? true : false;
}

EcoPlug.prototype.readName = function (message) {
    return (message.toString('ascii', 48, 79));
}
