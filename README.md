# Homebridge CREATE Windcalm

Add your CREATE Windcalm DC ceiling fan to Homebridge.


## Configuration

**Example config**
```json
{
    "accessory": "CREATEWindcalm",
    "name": "My Ceiling Fan",
    "id": "bf********************",
    "key": "****************",
}
```

**NOTE:** *You need to have the device connected to your Wi-Fi network before you can use it with Homebridge. You can do that with the [CREATE app](https://apps.apple.com/app/id1479200310) or any other Tuya compatible app.*


## Tuya Device Preparation

**Controlling and monitoring Tuya device on your network requires the following:**

- *Device ID* (`id`) - The unique identifier for the Tuya device
- *Local Key* (`key`) - The security key required to access the Tuya device.


## Assisting tools

This tool can help to find your device's *Local Key*.

[GitHub > TinyTuya](https://github.com/jasonacox/tinytuya)
