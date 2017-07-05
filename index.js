"use strict";

var eco = require('./lib/eco.js');
var Accessory, Service, Characteristic, UUIDGen;

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
    //    this.plugs = this.config.plugs || [];
    this.accessories = [];
    this.cache_timeout = 10; // seconds
    this.debug = config['debug'] || false;


    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}

EcoPlugPlatform.prototype.configureAccessory = function(accessory) {
    var accessoryId = accessory.context.id;
    this.log("configureAccessory");
    this.setService(accessory);
    this.accessories[accessoryId] = accessory;
}

EcoPlugPlatform.prototype.didFinishLaunching = function() {
    var that = this;

    eco.startUdpServer(this, function(message) {
        // handle status messages received from devices
        if (that.debug)
            that.log("Status: %s %s is: %s", message.id, message.name, (message.status ? "ON" : "OFF"));
        var accessory = that.accessories[message.id];

        if (typeof accessory.context.cb === "function") {
            var cb = accessory.context.cb;
            accessory.context.cb = false;
            // this is the callback from the getPowerState
            cb(null, message.status);
        } else {
//            accessory.updateReachability(true);
            accessory.getService(Service.Outlet)
                .getCharacteristic(Characteristic.On)
                .updateValue(message.status);
        }
    });
    this.deviceDiscovery();
    setInterval(that.devicePolling.bind(that), this.cache_timeout * 1000);
    setInterval(that.deviceDiscovery.bind(that), this.cache_timeout * 6000);
}

EcoPlugPlatform.prototype.devicePolling = function() {
    // Send a return status message every interval
    for (var id in this.accessories) {
        var plug = this.accessories[id];
        if (plug.reachable) {
            if (this.debug)
                this.log("Poll:", id, plug.context.name);
            this.sendStatusMessage(plug.context);
        }
    }
}

EcoPlugPlatform.prototype.deviceDiscovery = function() {
    // Send a device discovery message every interval
    if (this.debug)
        this.log("Sending device discovery message");
    eco.discovery(this, function(err, devices) {

        if (err) {
            this.log("ERROR: deviceDisovery", err);
        } else {
            if (this.debug) this.log("Adding discovered devices");

            for (var i in devices) {
                var existing = this.accessories[devices[i].id];
                // existing devices are not reachable during a homebridge restart
                if (!existing || !existing.reachable) {
                    this.log("Adding:", devices[i].id, devices[i].name, devices[i].host);
                    this.addAccessory(devices[i]);
                } else {
                    if (this.debug) this.log("Skipping existing device", i);
                }
            }
            if (devices) {
                for (var id in this.accessories) {
                    var found = devices[id];
                    if (!found) {
                        this.log("Not found ", id);
                        this.accessories[id].reachable = false;
                        // If reachability is false, the identify accessory button doesn't work.
                        //                this.accessories[id].updateReachability(false);
                    }
                }
            }
        }
        if (this.debug) this.log("Discovery complete");
    }.bind(this));
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
        newAccessory.context.cb = false;

        newAccessory.addService(Service.Outlet, data.name);

        this.setService(newAccessory);

        this.api.registerPlatformAccessories("homebridge-ecoplugs", "EcoPlug", [newAccessory]);
    } else {
        var newAccessory = this.accessories[data.id];

//        newAccessory.updateReachability(true);
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
    accessory.getService(Service.Outlet)
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

    accessory.getService(Service.Outlet)
        .getCharacteristic(Characteristic.On)
        .getValue();
}

EcoPlugPlatform.prototype.setPowerState = function(thisPlug, powerState, callback) {
    var that = this;

    if (this.accessories[thisPlug.id] && this.accessories[thisPlug.id].reachable) {

        var message = eco.createMessage('set', thisPlug.id, powerState);
        var retry_count = 3;

        eco.sendMessage(that, message, thisPlug, retry_count, function(err, message) {
            if (!err) {
                this.log("Setting: %s %s to: %s", thisPlug.id, thisPlug.name, (powerState ? "ON" : "OFF"));
            }
            callback();
        }.bind(this));

    } else {
        callback(new Error("Device not reachable"));
    }

}


EcoPlugPlatform.prototype.getPowerState = function(thisPlug, callback) {

    // storing callback with the accessory so that the value can be updated with
    // the response message

    if (this.accessories[thisPlug.id] && this.accessories[thisPlug.id].reachable) {
        this.log("Getting Status: %s %s", thisPlug.id, thisPlug.name)
        thisPlug.cb = callback;
        this.sendStatusMessage(thisPlug);
    } else {
        callback(new Error("Device not reachable"));
    }

}

EcoPlugPlatform.prototype.sendStatusMessage = function(thisPlug) {
    // Send a return status message to a device
    var message = eco.createMessage('get', thisPlug.id);
    var retry_count = 3;

    eco.sendMessage(this, message, thisPlug, retry_count, function(err, message) {
        if (err) {
            this.log.error("Error: getPowerState", thisPlug.id, err)
            var cb = thisPlug.cb;
            if (cb) {
                thisPlug.cb = false;
                // this is the callback from the getPowerState
                cb(err);
            }
        }
    }.bind(this));
}

EcoPlugPlatform.prototype.identify = function(thisPlug, paired, callback) {
    this.log("Identify requested for " + thisPlug.name);
    if (this.accessories[thisPlug.id] && !this.accessories[thisPlug.id].reachable) {
        this.removeAccessory(this.accessories[thisPlug.id]);
    }
    callback();
}

EcoPlugPlatform.prototype.readState = function(message) {
    return (message.readUInt8(129)) ? true : false;
}

EcoPlugPlatform.prototype.readName = function(message) {
    return (message.toString('ascii', 48, 79));
}
