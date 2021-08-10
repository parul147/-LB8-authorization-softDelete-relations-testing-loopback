
import {HttpCachingProxy} from '@loopback/http-caching-proxy';
import {merge} from 'lodash';
import path from 'path';
import {GeocoderDataSource} from '../datasources/geocoder.datasource';
import {Info} from '../models/info.model';
import {Geocoder, GeoPoint} from '../services/geocoder.service';


export function givenInfo(info?: Partial<Info>) {
  const data = Object.assign(
    {

      title: 'do a thing',
      desc: 'There are some things that need doing',
      isComplete: false,

    },
    info,
  );

  return new Info(data);
}

export const aLocation = {
  address: '1 New Orchard Road, Armonk, 10504',
  geopoint: <GeoPoint>{y: 41.109653, x: -73.72467},
  get geostring() {
    return `${this.geopoint.y},${this.geopoint.x}`;
  },
};

export function getProxiedGeoCoderConfig(proxy: HttpCachingProxy) {
  return merge({}, GeocoderDataSource.defaultConfig, {
    options: {
      proxy: proxy.url,
      tunnel: false,
    },
  });
}

export {HttpCachingProxy};
export async function givenCachingProxy() {
  const proxy = new HttpCachingProxy({
    cachePath: path.resolve(__dirname, '.http-cache'),
    logError: false,
    timeout: 5000,
  });
  await proxy.start();
  return proxy;
}

export async function isGeoCoderServiceAvailable(service: Geocoder) {
  try {
    await service.geocode(aLocation.address);
    return true;
  } catch (err) {
    if (err.statusCode === 502) {
      return false;
    }
    throw err;
  }
}
