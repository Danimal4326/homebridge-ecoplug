# homebridge-ecoplug
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for Eco and WION Wi-Fi modules and switches

This plugin allows you to remotely control the state of your Eco Plug.  It allows
you to set the on/off state.  This plugin supports device auto discovery, and
will scan the network for new devices every 60 seconds and add new devices.  To
remove devices that are no longer responding, use the 'Identify Accessory' button
on the accessory page of settings on Eve.  It will remove non-responding accessories.

# Tested devices

- ECO Plugs CT-65W Wi-Fi Controlled Outlet
- Woods WiOn 50052 WiFi In-Wall Light Switch
- WiOn Outdoor Outlet 50049

# Installation

1. Install homebridge using: sudo npm install -g homebridge
2. Install this plugin using: sudo npm install -g homebridge-ecoplug
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

- None

#Credits

- Danimal4326   - Initial Code and ECOPlug protocol
- NorthernMan54 - Added device auto discovery
- askovi - Tested WiOn Outdoor Outlet 50049
