# homebridge-ecoplug
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for Eco smart plugs

This plugin allows you to remotely control the state of your Eco Plug.  It allows you to set the on/off state.

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
                "name": "EcoPlug",
                "plugs": [
                    {
                        "name": "EcoPlug1",
                        "host": "192.168.0.xxx",
                        "id": "ECO-xxxxxxxx"
                    },
                    {
                        "name": "EcoPlug2",
                        "host": "192.168.0.yyy",
                        "id": "ECO-yyyyyyyy"                        
                    }
                ]
            }
        ]
```

| Fields   | Description | Required |
|----------|--------------------------------------------------------------------|:---:|
| platform | Must always be `EcoPlug`                                           | Yes |
| name     | The name of your platform. Shows up in the logs                    | Yes |
| plugs    | Subsection to define individual plugs                              | Yes |
|          | *Fields for plugs subsection*                                      |     |
| name     | The name of your plug                                              | Yes |
| host     | The hostname or ip of the EcoPlug                                  | Yes |
| id       | The id of the Eco Plug as shown in the ECO app under settings      | Yes |
