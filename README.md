# homebridge-ecoplug
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for Eco smart plugs

This plugin allows you to remotely control the state of your Eco Plug.  It allows
you to set the on/off state.  This plugin supports device auto discovery, and
will scan the network during startup for 1.5 seconds and add all discovered devices.
It will also remove any devices not responding during startup.

# Tested devices

- ECO Plugs CT-65W Wi-Fi Controlled Outlet
- Woods WiOn 50052 WiFi In-Wall Light Switch

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-ecoplug
3. Update your configuration file. See below for a sample.

# Configuration

Configuration sample:

 ```
        "platforms": [
            {
                "platform": "EcoPlug",
                "name": "EcoPlug"

            }
        ]
```

#Credits

- NorthernMan54 - Added device auto discovery
