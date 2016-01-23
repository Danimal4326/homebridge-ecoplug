# homebridge-ecoplug
[Homebridge](https://github.com/nfarina/homebridge) accessory plugin for Eco smart plugs

This plugin allows you to remotely control the state of your Eco Plug.  It allows you to set the on/off state.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-ecoplug
3. Update your configuration file. See below for a sample.

# Configuration

Configuration sample:

 ```
        "accessories": [
            {
                "accessory": "EcoPlug",
                "name": "Eco plug name",
                "host": "192.168.0.xxx",
                "id": "ECO-xxxxxxxx"
            }
        ]
```

Fields:

* "accessory": Must always be "EcoPlug" (required)
* "name": Can be anything (required)
* "host": The hostname or ip of the Eco Plug (required)
* "id": The id of the Eco Plug as shown in the ECO app under settings (required)
