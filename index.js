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

    var message = new Buffer(130);
    var curr_date_reversed = Math.floor(new Date() / 1000).toString(16).match(/[a-fA-F0-9]{2}/g).reverse().join('');

    message.fill(0);
    // the first field is the command?  16 = Write, 17 = Read
    message.write('16000500', 0, 4, 'hex');

    // Add random sequence num
    message.writeUInt16BE(Math.floor(Math.random() * 0xFFFF), 6);
        
    // Not sure what this field is
    message.write('02', 8, 1, 'hex');

    // Add Socket ID
    message.write(this.id, 16, 16);

    // This field is the current date reversed bytewise
    message.write(curr_date_reversed, 116, 8, 'hex');
    
    // Not sure what this field is
    message.write('00000000CDB8422A', 120, 8, 'hex');

    // The last field is the on/off status
    if (on) {
        message.write('0101', 128, 2, 'hex');
    } else {
        message.write('0100', 128, 2, 'hex');
    }
    this.log("Setting %s switch with ID %s to %s", this.name, this.id, (on ? "ON" : "OFF"));

    var socket = dgram.createSocket('udp4');

    socket.on('message', function (message) {
        socket.close();
        callback(null, true);
    });
    
    // TODO: Check if there is a response from the plug and re-send message. If no reply, callback with error
    socket.send(message, 0, message.length, this.port, this.host, function (err, bytes) {
        if (err) callback(err);
    }.bind(this));

}

EcoPlug.prototype.getStatus = function (callback) {

    var message = new Buffer(128);
    var status = false;
    var curr_date_reversed = Math.floor(new Date() / 1000).toString(16).match(/[a-fA-F0-9]{2}/g).reverse().join('');

    message.fill(0);
    
    // the first field is the command?  16 = Write, 17 = Read
    message.write('17000500', 0, 4, 'hex');
    
    // Add random sequence num
    message.writeUInt16BE(Math.floor(Math.random() * 0xFFFF), 6);

    // Add Socket ID
    message.write(this.id, 16, 16);

    // This field is the current date reversed bytewise
    message.write(curr_date_reversed, 116, 8, 'hex');
    
    // Not sure what this field is
    message.write('00000000CDB8422A', 120, 8, 'hex');

    var socket = dgram.createSocket('udp4');

    socket.on('message', function (message) {
        status = message.readUInt8(129) ? true : false;
        this.log("Status of %s switch with ID %s is %s", this.name, this.id, (status ? "On" : "Off"));
        socket.close();
        callback(null, status);
    }.bind(this));

    socket.send(message, 0, message.length, this.port, this.host, function (err, bytes) {
        if (err) callback(err);
    }.bind(this));

}
