

import {Entity, model, property} from '@loopback/repository';

@model()
export class Info extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: false,
  })
  id?: number;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
  })
  desc?: string;

  @property({
    type: 'boolean',
  })
  isComplete?: boolean;

  @property({
    type: 'string',
  })
  remindAtAddress?: string; // address,city,zipcode

  // User(bajtos) Use LoopBack's GeoPoint type here
  @property({
    type: 'string',
  })
  remindAtGeo?: string; // latitude,longitude

  @property({
    type: 'any',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tag?: any;

  constructor(data?: Partial<Info>) {
    super(data);
  }
}

export interface InfoRelations {
  // describe navigational properties here
}

export type InfoWithRelations = Info & InfoRelations;
