var dgram = require('dgram');
var Parser = require('binary-parser').Parser;

exports.discovery = function(that, callback) {

    var devices;

    sendDiscoveryMessage(createDiscoveryMessage(), function(err, devices) {
        if (!err) {

            callback(null, devices);
            //            that.log("Status of %s switch with ID %s is: %s", thisPlug.name, thisPlug.id, (status ? "ON" : "OFF"));
        } else {
            that.log("Error", err);
            callback(err);
        }

    }.bind(this));

}


sendDiscoveryMessage = function(message, callback) {

    var socket = dgram.createSocket('udp4');
    var timeout;

    var discovered = [];


    socket.bind(9000);

    socket.on('listening', function() {
        socket.setBroadcast(true);
    });

    socket.on('message', function(message) {
        device = parseDiscoveryResponse(message);
        //        console.log("Parsed device",device);
        discovered[device.id] = device;

    }.bind(this));


    socket.send(message, 0, 128, 25, "255.255.255.255", function(err, bytes) {
        if (err) {
            callback(err);
        } else {
            timeout = setTimeout(function() {
                socket.close();

                callback(null, discovered);

            }.bind(this), 1500);
        }
    }.bind(this));
}


exports.sendMessage = function(that, message, thisPlug, retry_count, callback) {

    var socket = dgram.createSocket('udp4');
    var timeout;

    socket.on('message', function(message) {
        clearTimeout(timeout);
        socket.close();
        callback(null, message);
    }.bind(this));

    socket.send(message, 0, message.length, thisPlug.port, thisPlug.host, function(err, bytes) {
        if (err) {
            callback(err);
        } else {
            timeout = setTimeout(function() {
                socket.close();
                if (retry_count > 0) {
                    that.log.warn("Timeout connecting to %s - Retrying....", thisPlug.host);
                    var cnt = retry_count - 1;
                    this.sendMessage(that, message, thisPlug, cnt, callback);
                } else {
                    that.log.error("Timeout connecting to %s - Failing", thisPlug.host);
                    callback(true);
                }
            }.bind(this), 500);
        }
    }.bind(this));

}

exports.createMessage = function(command, id, state) {

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
    } else if (command == 'get') {
        bufferLength = 128;
        command1 = 0x17000500;
        command2 = 0x0000;
    } else {
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

function parseDiscoveryResponse(message) {

    //    console.log(message);

    var discoveryResponse = new Parser()
        .skip(4)
        .string('version', {
            encoding: 'ascii',
            length: 6,
            stripNull: true
        })
        .string('id', {
            encoding: 'ascii',
            length: 32,
            stripNull: true
        })
        .string('name', {
            encoding: 'ascii',
            length: 32,
            stripNull: true
        })
        .string('shortid', {
            encoding: 'ascii',
            length: 34,
            stripNull: true
        })
        .array('time', {
            type: 'uint8',
            length: 12
        })
        .string('SSID', {
            encoding: 'ascii',
            length: 24,
            stripNull: true
        })
        .array('data2', {
            type: 'uint8',
            length: 16
        })
        .array('data3', {
            type: 'uint8',
            length: 16
        })
        .array('data3a', {
            type: 'uint8',
            length: 8
        })
        .string('password', {
            encoding: 'ascii',
            length: 24,
            stripNull: true
        })
        .array('data4', {
            type: 'uint8',
            length: 10
        })
        .array('data4a', {
            type: 'uint8',
            length: 4
        })
        .string('string2', {
            encoding: 'ascii',
            length: 18,
            stripNull: true
        })
        .array('data5', {
            type: 'uint8',
            length: 12
        })
        .string('region', {
            encoding: 'ascii',
            length: 8,
            stripNull: true
        })
        .string('areacode', {
            encoding: 'ascii',
            length: 4,
            stripNull: true
        })
        .string('a', {
            encoding: 'ascii',
            length: 8,
            stripNull: true
        })
        .string('ipa', {
            encoding: 'ascii',
            length: 16,
            stripNull: true
        })
        .string('ipb', {
            encoding: 'ascii',
            length: 16,
            stripNull: true
        })
        .string('ipc', {
            encoding: 'ascii',
            length: 16,
            stripNull: true
        })
        .array('data6', {
            type: 'uint8',
            length: 18
        })
        .string('string3', {
            encoding: 'ascii',
            length: 30,
            stripNull: true
        })
        .string('mac', {
            encoding: 'ascii',
            length: 18,
            stripNull: true
        })
        .string('host', {
            encoding: 'ascii',
            length: 18,
            stripNull: true
        })
        .array('data7', {
            type: 'uint8',
            length: 3
        })
        .buffer('remaining', {
            clone: true,
            readUntil: 'eof'
        });

    response = discoveryResponse.parse(message);

    if (response.name == "")
        response.name = response.id;
    return response;
}

function createDiscoveryMessage() {
    var message = new Buffer(128);

    message.fill(0);
    message.writeUInt32BE("0x00e0070b", 23);
    message.writeUInt32BE("0x11f79d00", 27);

    return message;
}
