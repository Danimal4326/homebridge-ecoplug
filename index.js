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

    this._service = new Service.Outlet(this.name);
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

    message.fill(0);
    message.write('16000500', 0, 4, 'hex');
    message.write('02', 8, 1, 'hex');
    message.write(this.id, 16, 16);

    // This should be a unix timestamp in reverse (FCABA256)
    message.write('00000000FCABA25600000000CDB8422A', 112, 16, 'hex');

    // Add random sequence num
    message.writeUInt16BE(Math.floor(Math.random() * 0xFFFF), 6);

    this.log("Setting %s switch with ID %s to %s", this.name, this.id, (on ? "ON" : "OFF"));

    if (on) {
        message.write('0101', 128, 2, 'hex');
    } else {
        message.write('0100', 128, 2, 'hex');
    }
    var socket = dgram.createSocket('udp4');

    socket.on('message', function (message) {
        console.log(message.toString('hex'));
        socket.close();
        callback(null, true);
    });

    socket.send(message, 0, message.length, this.port, this.host, function (err, bytes) {
        if (err) callback(err);
        console.log('UDP message sent to ' + this.host + ':' + this.port);
    }.bind(this));

}

EcoPlug.prototype.getStatus = function (callback) {

    var message = new Buffer(128);
    var status = false;
    
    message.fill(0);
    message.write('17000500', 0, 4, 'hex');
    message.write(this.id, 16, 16);

    // This should be a unix timestamp in reverse (FCABA256)
    message.write('00000000FCABA25600000000CDB8422A', 112, 16, 'hex');

    // Add random sequence num
    message.writeUInt16BE(Math.floor(Math.random() * 0xFFFF), 6);

    var socket = dgram.createSocket('udp4');

    socket.on('message', function (message) {
        console.log(message.toString('hex'));
        status = message.readUInt8(129) ? true : false;
        this.log("Status of %s switch with ID %s is %s", this.name, this.id, (status ? "On" : "Off"));
        socket.close();
        callback(null, status);
    }.bind(this));

    socket.send(message, 0, message.length, this.port, this.host, function (err, bytes) {
        if (err) callback(err);
        console.log('UDP message sent to ' + this.host + ':' + this.port);
    }.bind(this));

}
