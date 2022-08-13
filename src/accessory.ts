import { API, AccessoryPlugin, AccessoryConfig, Logging, Service, CharacteristicValue } from 'homebridge'
import TuyAPI from 'tuyapi'


export class CREATEWindcalm implements AccessoryPlugin {

  log: Logging;
  config: AccessoryConfig;
  api: API;
  device: TuyAPI;
  connected = false;

  fanService: Service;
  lightService: Service;
  informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.config = config;
    this.api = api;

    if (!config.id || !config.key) {
      throw new Error('Please provide a Tuya device ID and Tuya device key in your config.json!');
    }

    this.device = new TuyAPI({
      id: config.id,
      key: config.key
    });
    this.device.find().then(() => {
      log.debug(`Found '${this.config.name}'`);
      this.device.connect();
    });
    this.device.on('connected', () => {
      this.connected = true;
      log.info(`Connected to '${this.config.name}'`);
    });
    this.device.on('disconnected', () => {
      this.connected = false;
      log.debug(`Disconnected from '${this.config.name}'`);
    });
    this.device.on('error', error => {
      log.error(`Error from '${this.config.name}':`, error);
    });


    // Fan service

    this.fanService = new this.api.hap.Service.Fan(this.config.name);
    this.fanService.getCharacteristic(this.api.hap.Characteristic.On)
      .onGet(this.fetchFanOn.bind(this))
      .onSet(this.handleFanOn.bind(this));
    this.fanService.getCharacteristic(this.api.hap.Characteristic.RotationSpeed)
      .onGet(this.fetchFanSpeed.bind(this))
      .onSet(this.handleFanSpeed.bind(this));
    this.fanService.getCharacteristic(this.api.hap.Characteristic.RotationDirection)
      .onGet(this.fetchFanDirection.bind(this))
      .onSet(this.handleFanDirection.bind(this));


    // Light service

    this.lightService = new this.api.hap.Service.Lightbulb(this.config.name)
    this.lightService.getCharacteristic(api.hap.Characteristic.On)
      .onGet(this.fetchLightPower.bind(this))
      .onSet(this.handleLightPower.bind(this));
    this.lightService.getCharacteristic(api.hap.Characteristic.ColorTemperature)
      .onGet(this.fetchLightTemperature.bind(this))
      .onSet(this.handleLightTemperature.bind(this));


    // Information service

    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'CREATE')
      .setCharacteristic(this.api.hap.Characteristic.Model, 'Windcalm DC')
      .setCharacteristic(this.api.hap.Characteristic.Name, config.name)
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, config.id);

  }

  async fetchFanOn(): Promise<boolean> {
    if (!this.connected) throw Error('Not connected');
    const state = await this._getDataPoint(60) as boolean
    return state;
  }

  async handleFanOn(value: CharacteristicValue) {
    await this._setDataPoint(60, value.valueOf() as boolean);
  }

  async fetchFanSpeed(): Promise<number> {
    if (!this.connected) throw Error('Not connected');
    return 100 / 6 * (await this._getDataPoint(62) as number);
  }

  async handleFanSpeed(value: CharacteristicValue) {
    var speed = Math.floor(6 / 100 * (value.valueOf() as number));
    if (speed == 0) speed = 1; // NOTE: Speed may never be 0, use On characteristic to stop the fan.
    await this._setDataPoint(62, speed);
  }

  async fetchFanDirection(): Promise<number> {
    if (!this.connected) throw Error('Not connected');
    return (await this._getDataPoint(63) as string) == 'forward' ? this.api.hap.Characteristic.RotationDirection.CLOCKWISE : this.api.hap.Characteristic.RotationDirection.COUNTER_CLOCKWISE;
  }

  async handleFanDirection(value: CharacteristicValue) {
    await this._setDataPoint(63, (value.valueOf() as number) == this.api.hap.Characteristic.RotationDirection.COUNTER_CLOCKWISE ? 'forward' : 'reverse');
  }

  async fetchLightPower(): Promise<boolean> {
    if (!this.connected) throw Error('Not connected');
    return await this._getDataPoint(20) as boolean;
  }

  async handleLightPower(value: CharacteristicValue) {
    await this._setDataPoint(20, value.valueOf() as boolean);
  }

  async handleLightTemperature(value: CharacteristicValue) {
    await this._setDataPoint(23, this._convertRange(value.valueOf() as number, [140, 500], [30, 1000]));
  }

  async fetchLightTemperature(): Promise<number> {
    if (!this.connected) throw Error('Not connected');
    var value = await this._getDataPoint(23) as number;
    if (value < 30) value = 30; // NOTE: There is a bug in the Windcalm DC's firmware causing 30 to be equal to 0, but unfortunately it can still be set to the value 0.
    return this._convertRange(value, [30, 1000], [140, 500]);
  }

  async _getDataPoint(index: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.log.debug(`GET ${index}`);
      var resolved = false;
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        this._getDataPoint(index)
          .then((data) => {
            resolve(data);
          })
          .catch((reason) => {
            reject(reason);
          })
      }, 500);
      this.device.get({ dps: index })
        .then((data) => {
          this.log.debug(`GET SUCCESS ${index}: ${data}`);
          if (resolved) return;
          resolved = true;
          resolve(data);
        })
        .catch((reason) => {
          reject(reason);
        });
    });
  }

  async _setDataPoint(index: number, value: number | string | boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log.debug(`SET ${index}: ${value}`);
      var resolved = false;
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        this._setDataPoint(index, value)
          .then(() => {
            resolve();
          })
          .catch((reason) => {
            reject(reason);
          })
      }, 250);
      this.device.set({ dps: index, set: value })
        .then(() => {
          this.log.debug(`SET SUCCESS ${index}: ${value}`);
          if (resolved) return;
          resolved = true;
          resolve();
        })
        .catch((reason) => {
          reject(reason);
        });
    });
  }

  _convertRange(value, r1, r2) { 
    return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
  }

  getServices(): Service[] {
    return [
      this.fanService,
      this.lightService,
      this.informationService
    ];
  }

}
