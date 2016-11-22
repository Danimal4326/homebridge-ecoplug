# homebridge-ecoplug
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for Eco smart plugs

This plugin allows you to remotely control the state of your Eco Plug.  It allows
you to set the on/off state.  This plugin supports device auto discovery, and
will scan the network for new devices every 60 seconds and add new devices.  To
remove devices that are no longer responding, use the 'Identify Accessory' button
on the accessory page of settings on Eve.  It will remove non-responding accessories.

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
## Optional parameters

- debug, this will enable more logging information from the plugin

  "debug": "True"

#Credits

- NorthernMan54 - Added device auto discovery
