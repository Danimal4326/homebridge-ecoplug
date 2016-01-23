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
        .on('set', this._setOn.bind(this));
}

EcoPlug.prototype.getServices = function () {
    return [this._service];
}

EcoPlug.prototype._setOn = function (on, callback) {

    var message = new Buffer(130);

    message.fill(0);
    message.write('16000500', 0, 4, 'hex');
    message.write('02', 8, 1, 'hex');
    message.write(this.id, 16, 16);

    // This should be address  (FCABA256)
    message.write('00000000FCABA25600000000CDB8422A', 112, 16, 'hex');

    // Add random sequence num
    message.writeUInt16BE(Math.floor(Math.random() * 0xFFFF), 6);

    this.log("Setting %s switch to %s", this.id, (on ? "ON" : "OFF"));

    if (on) {
        message.write('0101', 128, 2, 'hex');
    } else {
        message.write('0100', 128, 2, 'hex');
    }
    var socket = dgram.createSocket('udp4');

    socket.on('message', function (message) {
        //console.log(message.toString('hex'));
        socket.close();
        callback(null, true);
    });

    socket.send(message, 0, message.length, this.port, this.host, function (err, bytes) {
        if (err) callback(err);
        //console.log('UDP message sent to ' + this.host + ':' + this.port);
    });

}

