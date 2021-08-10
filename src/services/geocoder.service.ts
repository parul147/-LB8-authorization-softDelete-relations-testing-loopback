// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/example-todo
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {inject, Provider} from '@loopback/core';
import {getService, juggler} from '@loopback/service-proxy';
import {GeocoderDataSource} from '../datasources/geocoder.datasource';

export interface GeoPoint {
  /**
   * latitude
   */
  y: number;

  /**
   * longitude
   */
  x: number;
}

export interface Geocoder {
  geocode(address: string): Promise<GeoPoint[]>;
}

export class GeocoderProvider implements Provider<Geocoder> {
  constructor(
    @inject('datasources.geocoder')
    protected dataSource: juggler.DataSource = new GeocoderDataSource(),
  ) { }

  value(): Promise<Geocoder> {
    return getService(this.dataSource);
  }
}
