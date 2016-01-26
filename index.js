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
    this._info_service.setCharacteristic(Characteristic.Model, this.name)
        .setCharacteristic(Characteristic.Manufacturer, "ECO Plugs")
        .setCharacteristic(Characteristic.SerialNumber, this.id);

}

EcoPlug.prototype.getServices = function () {
    return [this._service, this._info_service];
}

EcoPlug.prototype.setStatus = function (on, callback) {

    this.log("Setting %s switch with ID %s to %s", this.name, this.id, (on ? "ON" : "OFF"));

    var message = this.createMessage('set', this.id, on);

    this.sendMessage( message, function(err, message){
        callback(err,null);
    }.bind(this));

}

EcoPlug.prototype.getStatus = function (callback) {

    var status = false;
    
    var message = this.createMessage('get', this.id);
    
    this.sendMessage( message, function (err, message){
        status = this.readState(message);
        callback(err, status);
    }.bind(this));
    
}

EcoPlug.prototype.createMessage = function (command, id, state) {
    var that = this;
    
    var bufferLength;
    var command1;
    var command2;
    var new_state;
        
    if (command == 'set') {
        bufferLength = 130;
        command1 = 0x16000500;
        command2 = 0x0200;
        if(state) {
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
    buffer.writeUInt32LE( (Math.floor(new Date() / 1000)), 116);
    
    // Byte 120:123 - 0's
    
    // Byte 124:127 - Not sure what this field is - this value works, but i've seen others 0xCDB8422A
    buffer.writeUInt32BE(0xCDB8422A, 124);
    
    // Byte 128:129 - Power state (only for writes)
    if (buffer.length == 130) {
        buffer.writeUInt16BE(new_state, 128);
    }
    
    return buffer;
}

EcoPlug.prototype.sendMessage = function (message, callback) {

    var socket = dgram.createSocket('udp4');

    socket.on('message', function (message) {
        socket.close();
        callback(null, message);
    }.bind(this));

    socket.on('error', function (error) {
        socket.close();
        this.log("Error connection to %s switch with ID %s. Error Code = %s", this.name, this.id, error);
        callback(true);
    }.bind(this));
    
    // TODO: Check if there is a response from the plug and re-send message. If no reply, callback with error
    socket.send(message, 0, message.length, this.port, this.host, function (err, bytes) {
        if (err) callback(err);
    }.bind(this));

}

EcoPlug.prototype.readState = function (message) {
    return (message.readUInt8(129)) ? true : false;
}

EcoPlug.prototype.readName = function (message) {
    return (message.toString('ascii', 48, 79));    
}