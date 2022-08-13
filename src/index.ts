import { API } from 'homebridge';

import { CREATEWindcalm } from './accessory';

export = (api: API) => {
  api.registerAccessory('homebridge-create-windcalm', CREATEWindcalm);
};
