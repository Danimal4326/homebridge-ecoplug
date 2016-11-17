"use strict";

var eco = require('./lib/eco.js');
var Accessory, Service, Characteristic, UUIDGen;
//var dgram = require('dgram');

module.exports = function(homebridge) {

    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-ecoplugs", "EcoPlug", EcoPlugPlatform);
}

function EcoPlugPlatform(log, config, api) {
    this.log = log;
    this.config = config;
    this.plugs = this.config.plugs || [];
    this.accessories = [];


    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}

EcoPlugPlatform.prototype.configureAccessory = function(accessory) {
    var accessoryId = accessory.context.id;

    this.setService(accessory);
    this.accessories[accessoryId] = accessory;
}

EcoPlugPlatform.prototype.didFinishLaunching = function() {

    var that = this;

    eco.discovery(that, function(err, devices) {

        this.log("Adding discovered devices");

        for (var i in devices) {
            this.log("Adding EcoPlug: ", devices[i].name);
            this.addAccessory(devices[i]);
        }

        for (var id in this.accessories) {
            var plug = this.accessories[id];
            if (!plug.reachable) {
                this.removeAccessory(plug);
            }
        }

        this.log("Adding complete");

    }.bind(that));

    //    if (!this.plugs.length) {
    //        this.log.error("No plugs configured. Please check your 'config.json' file!");
    //    }

    //    for (var i in this.plugs) {
    //        var data = this.plugs[i];
    //        this.log("Adding EcoPlug: " + data.name);
    //        this.addAccessory(data);
    //    }


}

EcoPlugPlatform.prototype.addAccessory = function(data) {
    if (!this.accessories[data.id]) {
        var uuid = UUIDGen.generate(data.id);

        var newAccessory = new Accessory(data.id, uuid, 8);

        newAccessory.reachable = true;

        newAccessory.context.name = data.name;
        newAccessory.context.host = data.host;
        newAccessory.context.port = 80;
        newAccessory.context.id = data.id;

        newAccessory.addService(Service.Switch, data.name);

        this.setService(newAccessory);

        this.api.registerPlatformAccessories("homebridge-ecoplugs", "EcoPlug", [newAccessory]);
    } else {
        var newAccessory = this.accessories[data.id];

        newAccessory.updateReachability(true);
    }

    this.getInitState(newAccessory, data);

    this.accessories[data.id] = newAccessory;
}

EcoPlugPlatform.prototype.removeAccessory = function(accessory) {
    if (accessory) {
        var name = accessory.context.name;
        var id = accessory.context.id;
        this.log.warn("Removing EcoPlug: " + name + ". No longer reachable or configured.");
        this.api.unregisterPlatformAccessories("homebridge-ecoplugs", "EcoPlug", [accessory]);
        delete this.accessories[id];
    }
}

EcoPlugPlatform.prototype.setService = function(accessory) {
    accessory.getService(Service.Switch)
        .getCharacteristic(Characteristic.On)
        .on('set', this.setPowerState.bind(this, accessory.context))
        .on('get', this.getPowerState.bind(this, accessory.context));

    accessory.on('identify', this.identify.bind(this, accessory.context));
}

EcoPlugPlatform.prototype.getInitState = function(accessory, data) {
    var info = accessory.getService(Service.AccessoryInformation);

    accessory.context.manufacturer = "ECO Plugs";
    info.setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer);

    accessory.context.model = "CT-065W";
    info.setCharacteristic(Characteristic.Model, accessory.context.model);

    info.setCharacteristic(Characteristic.SerialNumber, accessory.context.id);

    accessory.getService(Service.Switch)
        .getCharacteristic(Characteristic.On)
        .getValue();
}

EcoPlugPlatform.prototype.setPowerState = function(thisPlug, powerState, callback) {
    var that = this;

    var message = eco.createMessage('set', thisPlug.id, powerState);
    var retry_count = 3;

    eco.sendMessage(that,message, thisPlug, retry_count, function(err, message) {
        if (!err) {
            this.log("Setting %s switch with ID %s to: %s", thisPlug.name, thisPlug.id, (powerState ? "ON" : "OFF"));
        }
        callback(err, null);
    }.bind(this));

}

EcoPlugPlatform.prototype.getPowerState = function(thisPlug, callback) {
    var that = this;

    var status = false;

    var message = eco.createMessage('get', thisPlug.id);
    var retry_count = 3;

    eco.sendMessage(that,message, thisPlug, retry_count, function(err, message) {
        if (!err) {
            status = this.readState(message);
            this.log("Status of %s switch with ID %s is: %s", thisPlug.name, thisPlug.id, (status ? "ON" : "OFF"));
        }
        callback(err, status);
    }.bind(this));

}

EcoPlugPlatform.prototype.identify = function(thisPlug, paired, callback) {
    this.log("Identify requested for " + thisPlug.name);
    callback();
}

//EcoPlugPlatform.prototype.createMessage = function (command, id, state) {

//    var bufferLength;
//    var command1;
//    var command2;
//    var new_state;

//    if (command == 'set') {
//        bufferLength = 130;
//        command1 = 0x16000500;
//        command2 = 0x0200;
//        if (state) {
//            new_state = 0x0101;
//        } else {
//            new_state = 0x0100;
//        }
//    }
//    else if (command == 'get') {
//        bufferLength = 128;
//        command1 = 0x17000500;
//        command2 = 0x0000;
//    }
//    else {
//        throw err;
//    }

//    var buffer = new Buffer(bufferLength);

//    buffer.fill(0);

// Byte 0:3 - Command 0x16000500 = Write, 0x17000500 = Read
//    buffer.writeUInt32BE(command1, 0);

// Byte 4:7 - Command sequence num - looks random
//    buffer.writeUInt32BE(Math.floor(Math.random() * 0xFFFF), 4);

// Byte 8:9 - Not sure what this field is - 0x0200 = Write, 0x0000 = Read
//    buffer.writeUInt16BE(command2, 8);

// Byte 10:14 - ASCII encoded FW Version - Set in readback only?

// Byte 15 - Always 0x0

// Byte 16:31 - ECO Plugs ID ASCII Encoded - <ECO-xxxxxxxx>
//    buffer.write(id, 16, 16);

// Byte 32:47 - 0's - Possibly extension of Plug ID

//    // Byte 48:79 - ECO Plugs name as set in app

//    // Byte 80:95 - ECO Plugs ID without the 'ECO-' prefix - ASCII Encoded

// Byte 96:111 - 0's

// Byte 112:115 - Something gets returned here during readback - not sure

// Byte 116:119 - The current epoch time in Little Endian
//    buffer.writeUInt32LE((Math.floor(new Date() / 1000)), 116);

// Byte 120:123 - 0's

// Byte 124:127 - Not sure what this field is - this value works, but i've seen others 0xCDB8422A
//    buffer.writeUInt32BE(0xCDB8422A, 124);

// Byte 128:129 - Power state (only for writes)
//    if (buffer.length == 130) {
//        buffer.writeUInt16BE(new_state, 128);
//    }

//    return buffer;
//}

//EcoPlugPlatform.prototype.sendMessage = function (message, thisPlug, retry_count, callback) {

//    var socket = dgram.createSocket('udp4');
//    var timeout;

//    socket.on('message', function (message) {
//        clearTimeout(timeout);
//        socket.close();
//        callback(null, message);
//    }.bind(this));

//    socket.send(message, 0, message.length, thisPlug.port, thisPlug.host, function (err, bytes) {
//        if (err) {
//            callback(err);
//        } else {
//            timeout = setTimeout(function () {
//                socket.close();
//                if (retry_count > 0) {
//                    this.log.warn("Timeout connecting to %s - Retrying....", thisPlug.host);
//                    var cnt = retry_count - 1;
//                    this.sendMessage(message, thisPlug, cnt, callback);
//                } else {
//                    this.log.error("Timeout connecting to %s - Failing", thisPlug.host);
//                    callback(true);
//                }
//            }.bind(this), 500);
//        }
//    }.bind(this));

//}

EcoPlugPlatform.prototype.readState = function(message) {
    return (message.readUInt8(129)) ? true : false;
}

EcoPlugPlatform.prototype.readName = function(message) {
    return (message.toString('ascii', 48, 79));
}
