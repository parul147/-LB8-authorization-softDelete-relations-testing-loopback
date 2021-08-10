
import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody
} from '@loopback/rest';
import {Info} from '../models';
import {InfoRepository} from '../repositories/';
import {Geocoder} from '../services/geocoder.service';

export class InfoController {
  constructor(
    @repository(InfoRepository)
    public InfoRepository: InfoRepository,
    @inject('services.Geocoder') protected geoService: Geocoder,
  ) { }

  @post('/Infos', {
    responses: {
      '200': {
        description: 'Info model instance',
        content: {'application/json': {schema: getModelSchemaRef(Info)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Info, {
            title: 'NewInfo',
            exclude: ['id'],
          }),
        },
      },
    })
    Info: Omit<Info, 'id'>,
  ): Promise<Info> {
    if (Info.remindAtAddress) {
      const geo = await this.geoService.geocode(Info.remindAtAddress);

      // ignoring because if the service is down, the following section will
      // not be covered
      /* istanbul ignore next */
      if (!geo[0]) {
        // address not found
        throw new HttpErrors.BadRequest(
          `Address not found: ${Info.remindAtAddress}`,
        );
      }
      // Encode the coordinates as "lat,lng" (Google Maps API format). See also
      // https://stackoverflow.com/q/7309121/69868
      // https://gis.stackexchange.com/q/7379
      Info.remindAtGeo = `${geo[0].y},${geo[0].x}`;
    }
    return this.InfoRepository.create(Info);
  }

  @get('/Infos/{id}', {
    responses: {
      '200': {
        description: 'Info model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Info, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Info, {exclude: 'where'}) filter?: FilterExcludingWhere<Info>,
  ): Promise<Info> {
    return this.InfoRepository.findById(id, filter);
  }

  @get('/Infos', {
    responses: {
      '200': {
        description: 'Array of Info model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Info, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(@param.filter(Info) filter?: Filter<Info>): Promise<Info[]> {
    return this.InfoRepository.find(filter);
  }

  @put('/Infos/{id}', {
    responses: {
      '204': {
        description: 'Info PUT success',
      },
    },
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() Info: Info,
  ): Promise<void> {
    await this.InfoRepository.replaceById(id, Info);
  }

  @patch('/Infos/{id}', {
    responses: {
      '204': {
        description: 'Info PATCH success',
      },
    },
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Info, {partial: true}),
        },
      },
    })
    Info: Info,
  ): Promise<void> {
    await this.InfoRepository.updateById(id, Info);
  }

  @del('/Infos/{id}', {
    responses: {
      '204': {
        description: 'Info DELETE success',
      },
    },
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.InfoRepository.deleteById(id);
  }

  @get('/Infos/count', {
    responses: {
      '200': {
        description: 'Info model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(@param.where(Info) where?: Where<Info>): Promise<Count> {
    return this.InfoRepository.count(where);
  }

  @patch('/Infos', {
    responses: {
      '200': {
        description: 'Info PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Info, {partial: true}),
        },
      },
    })
    Info: Info,
    @param.where(Info) where?: Where<Info>,
  ): Promise<Count> {
    return this.InfoRepository.updateAll(Info, where);
  }
}
