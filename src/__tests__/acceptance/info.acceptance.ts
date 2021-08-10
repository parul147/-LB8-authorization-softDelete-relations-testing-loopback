// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: @loopback/example-Info
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {EntityNotFoundError} from '@loopback/repository';
import {Request, Response, RestBindings} from '@loopback/rest';
import {
  Client,
  createRestAppClient,
  expect,
  givenHttpServerConfig,
  toJSON
} from '@loopback/testlab';
import morgan from 'morgan';
import {AppApplication} from '../../application';
import {Info} from '../../models';
import {InfoRepository} from '../../repositories';
import {Geocoder} from '../../services/geocoder.service';
import {
  aLocation,
  getProxiedGeoCoderConfig,
  givenCachingProxy,
  givenInfo,
  HttpCachingProxy,
  isGeoCoderServiceAvailable
} from '../helpers';

describe('InfoApplication', () => {
  let app: AppApplication;
  let client: Client;
  let InfoRepo: InfoRepository;

  let cachingProxy: HttpCachingProxy;
  before(async () => (cachingProxy = await givenCachingProxy()));
  after(() => cachingProxy.stop());

  before(givenRunningApplicationWithCustomConfiguration);
  after(() => app.stop());

  let available = true;

  before(async function (this: Mocha.Context) {
    this.timeout(30 * 1000);
    const service = await app.get<Geocoder>('services.Geocoder');
    available = await isGeoCoderServiceAvailable(service);
  });

  before(givenInfoRepository);
  before(() => {
    client = createRestAppClient(app);
  });

  beforeEach(async () => {
    await InfoRepo.deleteAll();
  });

  it('creates a info', async function (this: Mocha.Context) {
    // Set timeout to 30 seconds as `post /Info` triggers geocode look up
    // over the internet and it takes more than 2 seconds
    this.timeout(30000);
    const Info = givenInfo();
    const response = await client.post('/Infos').send(Info).expect(200);
    expect(response.body).to.containDeep(Info);
    const result = await InfoRepo.findById(response.body.id);
    expect(result).to.containDeep(Info);
  });

  it('creates a Info with arbitrary property', async function () {
    const Info = givenInfo({tag: {random: 'random'}});
    const response = await client.post('/Infos').send(Info).expect(200);
    expect(response.body).to.containDeep(Info);
    const result = await InfoRepo.findById(response.body.id);
    expect(result).to.containDeep(Info);
  });

  it('rejects requests to create a Info with no title', async () => {
    const Info: Partial<Info> = givenInfo();
    delete Info.title;
    await client.post('/Infos').send(Info).expect(422);
  });

  it('rejects requests with input that contains excluded properties', async () => {
    const Info = givenInfo();
    Info.id = 1;
    await client.post('/Infos').send(Info).expect(422);
  });

  it('creates an address-based reminder', async function (this: Mocha.Context) {
    if (!available) return this.skip();
    // Increase the timeout to accommodate slow network connections
    this.timeout(30000);

    const Info = givenInfo({remindAtAddress: aLocation.address});
    const response = await client.post('/Infos').send(Info).expect(200);
    Info.remindAtGeo = aLocation.geostring;

    expect(response.body).to.containEql(Info);

    const result = await InfoRepo.findById(response.body.id);
    expect(result).to.containEql(Info);
  });

  it('returns 400 if it cannot find an address', async function (this: Mocha.Context) {
    if (!available) return this.skip();
    // Increase the timeout to accommodate slow network connections
    this.timeout(30000);

    const Info = givenInfo({remindAtAddress: 'this address does not exist'});
    const response = await client.post('/Infos').send(Info).expect(400);

    expect(response.body.error.message).to.eql(
      'Address not found: this address does not exist',
    );
  });

  context('when dealing with a single persisted Info', () => {
    let persistedInfo: Info;

    beforeEach(async () => {
      persistedInfo = await givenInfoInstance();
    });

    it('gets a Info by ID', () => {
      return client
        .get(`/Infos/${persistedInfo.id}`)
        .send()
        .expect(200, toJSON(persistedInfo));
    });

    it('returns 404 when getting a Info that does not exist', () => {
      return client.get('/Infos/99999').expect(404);
    });

    it('replaces the Info by ID', async () => {
      const updatedInfo = givenInfo({
        title: 'DO SOMETHING AWESOME',
        desc: 'It has to be something ridiculous',
        isComplete: true,
      });
      await client
        .put(`/Infos/${persistedInfo.id}`)
        .send(updatedInfo)
        .expect(204);
      const result = await InfoRepo.findById(persistedInfo.id);
      expect(result).to.containEql(updatedInfo);
    });

    it('returns 404 when replacing a Info that does not exist', () => {
      return client.put('/Infos/99999').send(givenInfo()).expect(404);
    });

    it('updates the Info by ID ', async () => {
      const updatedInfo = givenInfo({
        isComplete: true,
      });
      await client
        .patch(`/Infos/${persistedInfo.id}`)
        .send(updatedInfo)
        .expect(204);
      const result = await InfoRepo.findById(persistedInfo.id);
      expect(result).to.containEql(updatedInfo);
    });

    it('returns 404 when updating a Info that does not exist', () => {
      return client
        .patch('/Infos/99999')
        .send(givenInfo({isComplete: true}))
        .expect(404);
    });

    it('deletes the Info', async () => {
      await client.del(`/Infos/${persistedInfo.id}`).send().expect(204);
      await expect(InfoRepo.findById(persistedInfo.id)).to.be.rejectedWith(
        EntityNotFoundError,
      );
    });

    it('returns 404 when deleting a Info that does not exist', async () => {
      await client.del(`/Infos/99999`).expect(404);
    });

    it('rejects request with invalid keys - constructor.prototype', async () => {
      const res = await client
        .get(
          '/Infos?filter={"offset":0,"limit":100,"skip":0,' +
          '"where":{"constructor.prototype":{"toString":"def"}},' +
          '"fields":{"title":true,"id":true}}',
        )
        .expect(400);
      expect(res.body?.error).to.containEql({
        statusCode: 400,
        name: 'BadRequestError',
        code: 'INVALID_PARAMETER_VALUE',
        details: {
          syntaxError:
            'JSON string cannot contain "constructor.prototype" key.',
        },
      });
    });

    it('rejects request with invalid keys - __proto__', async () => {
      const res = await client
        .get(
          '/Infos?filter={"offset":0,"limit":100,"skip":0,' +
          '"where":{"__proto__":{"toString":"def"}},' +
          '"fields":{"title":true,"id":true}}',
        )
        .expect(400);
      expect(res.body?.error).to.containEql({
        statusCode: 400,
        name: 'BadRequestError',
        code: 'INVALID_PARAMETER_VALUE',
        details: {
          syntaxError: 'JSON string cannot contain "__proto__" key.',
        },
      });
    });

    it('rejects request with prohibited keys - badKey', async () => {
      const res = await client
        .get(
          '/Infos?filter={"offset":0,"limit":100,"skip":0,' +
          '"where":{"badKey":{"toString":"def"}},' +
          '"fields":{"title":true,"id":true}}',
        )
        .expect(400);
      expect(res.body?.error).to.containEql({
        statusCode: 400,
        name: 'BadRequestError',
        code: 'INVALID_PARAMETER_VALUE',
        details: {
          syntaxError: 'JSON string cannot contain "badKey" key.',
        },
      });
    });
  });

 
  it('queries Info with a filter', async () => {
    await givenInfoInstance({title: 'wake up', isComplete: true});

    const InfoInProgress = await givenInfoInstance({
      title: 'go to sleep',
      isComplete: false,
    });

    await client
      .get('/Infos')
      .query({filter: {where: {isComplete: false}}})
      .expect(200, [toJSON(InfoInProgress)]);
  });

  it('exploded filter conditions work', async () => {
    await givenInfoInstance({title: 'wake up', isComplete: true});
    await givenInfoInstance({
      title: 'go to sleep',
      isComplete: false,
    });

    const response = await client.get('/Infos').query('filter[limit]=2');
    expect(response.body).to.have.length(2);
  });

  it('queries Info with string-based order filter', async () => {
    const InfoInProgress = await givenInfoInstance({
      title: 'go to sleep',
      isComplete: false,
    });

    const InfoCompleted = await givenInfoInstance({
      title: 'wake up',
      isComplete: true,
    });

    const InfoCompleted2 = await givenInfoInstance({
      title: 'go to work',
      isComplete: true,
    });

    await client
      .get('/Infos')
      .query({filter: {order: 'title DESC'}})
      .expect(200, toJSON([InfoCompleted, InfoCompleted2, InfoInProgress]));
  });

  it('queries Info with array-based order filter', async () => {
    const InfoInProgress = await givenInfoInstance({
      title: 'go to sleep',
      isComplete: false,
    });

    const InfoCompleted = await givenInfoInstance({
      title: 'wake up',
      isComplete: true,
    });

    const InfoCompleted2 = await givenInfoInstance({
      title: 'go to work',
      isComplete: true,
    });

    await client
      .get('/Infos')
      .query({filter: {order: ['title DESC']}})
      .expect(200, toJSON([InfoCompleted, InfoCompleted2, InfoInProgress]));
  });

  it('queries Info with exploded string-based order filter', async () => {
    const InfoInProgress = await givenInfoInstance({
      title: 'go to sleep',
      isComplete: false,
    });

    const InfoCompleted = await givenInfoInstance({
      title: 'wake up',
      isComplete: true,
    });

    const InfoCompleted2 = await givenInfoInstance({
      title: 'go to work',
      isComplete: true,
    });

    await client
      .get('/Infos')
      .query('filter[order]=title%20DESC')
      .expect(200, [
        toJSON(InfoCompleted),
        toJSON(InfoCompleted2),
        toJSON(InfoInProgress),
      ]);
  });

  it('queries Info with exploded array-based fields filter', async () => {
    await givenInfoInstance({
      title: 'go to sleep',
      isComplete: false,
    });
    await client
      .get('/Infos')
      .query('filter[fields][0]=title')
      .expect(200, toJSON([{title: 'go to sleep'}]));
  });

  it('queries Info with exploded array-based order filter', async () => {
    const InfoInProgress = await givenInfoInstance({
      title: 'go to sleep',
      isComplete: false,
    });

    const InfoCompleted = await givenInfoInstance({
      title: 'wake up',
      isComplete: true,
    });

    const InfoCompleted2 = await givenInfoInstance({
      title: 'go to work',
      isComplete: true,
    });

    await client
      .get('/Infos')
      .query('filter[order][0]=title+DESC')
      .expect(200, toJSON([InfoCompleted, InfoCompleted2, InfoInProgress]));
  });

  /*
   ============================================================================
   TEST HELPERS
   These functions help simplify setup of your test fixtures so that your tests
   can:
   - operate on a "clean" environment each time (a fresh in-memory database)
   - avoid polluting the test with large quantities of setup logic to keep
   them clear and easy to read
   - keep them DRY (who wants to write the same stuff over and over?)
   ============================================================================
   */

  async function givenRunningApplicationWithCustomConfiguration() {
    app = new AppApplication({
      rest: givenHttpServerConfig(),
    });

    app.bind(RestBindings.REQUEST_BODY_PARSER_OPTIONS).to({
      validation: {
        prohibitedKeys: ['badKey'],
      },
    });

    await app.boot();

    /**
     * Override default config for DataSource for testing so we don't write
     * test data to file when using the memory connector.
     */
    app.bind('datasources.config.db').to({
      name: 'db',
      connector: 'memory',
    });

    // Override Geocoder datasource to use a caching proxy to speed up tests.
    app
      .bind('datasources.config.geocoder')
      .to(getProxiedGeoCoderConfig(cachingProxy));

     // app.bind('repositories.InfoRepository').to(InfoRepository);
    // Start Application
    await app.start();
  }

  async function givenInfoRepository() {
    InfoRepo = await app.getRepository(InfoRepository);
  }

  async function givenInfoInstance(Info?: Partial<Info>) {
    return InfoRepo.create(givenInfo(Info));
  }
});
