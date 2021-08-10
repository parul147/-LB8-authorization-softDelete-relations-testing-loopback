

import {Filter} from '@loopback/repository';
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor
} from '@loopback/testlab';
import {InfoController} from '../../controllers';
import {Info} from '../../models/index';
import {InfoRepository} from '../../repositories';
import {Geocoder} from '../../services/geocoder.service';
import {aLocation, givenInfo} from '../helpers';

describe('InfoController', () => {
  let InfoRepo: StubbedInstanceWithSinonAccessor<InfoRepository>;
  let geoService: Geocoder;

  let geocode: sinon.SinonStub;

  /*
  =============================================================================
  TEST VARIABLES
  Combining top-level objects with our resetRepositories method means we don't
  need to duplicate several variable assignments (and generation statements)
  in all of our test logic.

  NOTE: If you wanted to parallelize your test runs, you should avoid this
  pattern since each of these tests is sharing references.
  =============================================================================
  */
  let controller: InfoController;
  let aInfo: Info;
  let aInfoWithId: Info;
  let aChangedInfo: Info;
  let aListOfInfos: Info[];

  beforeEach(resetRepositories);

  describe('createInfo', () => {
    it('creates a Info', async () => {
      const create = InfoRepo.stubs.create;
      create.resolves(aInfoWithId);
      const result = await controller.create(aInfo);
      expect(result).to.eql(aInfoWithId);
      sinon.assert.calledWith(create, aInfo);
    });

    it('resolves remindAtAddress to a geocode', async () => {
      const create = InfoRepo.stubs.create;
      geocode.resolves([aLocation.geopoint]);

      const input = givenInfo({remindAtAddress: aLocation.address});

      const expected = new Info(input);
      Object.assign(expected, {
        remindAtAddress: aLocation.address,
        remindAtGeo: aLocation.geostring,
      });
      create.resolves(expected);

      const result = await controller.create(input);

      expect(result).to.eql(expected);
      sinon.assert.calledWith(create, input);
      sinon.assert.calledWith(geocode, input.remindAtAddress);
    });
  });

  describe('findInfoById', () => {
    it('returns a Info if it exists', async () => {
      const findById = InfoRepo.stubs.findById;
      findById.resolves(aInfoWithId);
      expect(await controller.findById(aInfoWithId.id as number)).to.eql(
        aInfoWithId,
      );
      sinon.assert.calledWith(findById, aInfoWithId.id);
    });
  });

  describe('findInfos', () => {
    it('returns multiple Infos if they exist', async () => {
      const find = InfoRepo.stubs.find;
      find.resolves(aListOfInfos);
      expect(await controller.find()).to.eql(aListOfInfos);
      sinon.assert.called(find);
    });

    it('returns empty list if no Infos exist', async () => {
      const find = InfoRepo.stubs.find;
      const expected: Info[] = [];
      find.resolves(expected);
      expect(await controller.find()).to.eql(expected);
      sinon.assert.called(find);
    });

    it('uses the provided filter', async () => {
      const find = InfoRepo.stubs.find;
      const filter: Filter<Info> = {where: {isComplete: false}};

      find.resolves(aListOfInfos);
      await controller.find(filter);
      sinon.assert.calledWith(find, filter);
    });
  });

  describe('replaceInfo', () => {
    it('successfully replaces existing items', async () => {
      const replaceById = InfoRepo.stubs.replaceById;
      replaceById.resolves();
      await controller.replaceById(aInfoWithId.id as number, aChangedInfo);
      sinon.assert.calledWith(replaceById, aInfoWithId.id, aChangedInfo);
    });
  });

  describe('updateInfo', () => {
    it('successfully updates existing items', async () => {
      const updateById = InfoRepo.stubs.updateById;
      updateById.resolves();
      await controller.updateById(aInfoWithId.id as number, aChangedInfo);
      sinon.assert.calledWith(updateById, aInfoWithId.id, aChangedInfo);
    });
  });

  describe('deleteInfo', () => {
    it('successfully deletes existing items', async () => {
      const deleteById = InfoRepo.stubs.deleteById;
      deleteById.resolves();
      await controller.deleteById(aInfoWithId.id as number);
      sinon.assert.calledWith(deleteById, aInfoWithId.id);
    });
  });

  function resetRepositories() {
    InfoRepo = createStubInstance(InfoRepository);
    aInfo = givenInfo();
    aInfoWithId = givenInfo({
      id: 1,
    });
    aListOfInfos = [
      aInfoWithId,
      givenInfo({
        id: 2,
        title: 'so many things to do',
      }),
    ] as Info[];
    aChangedInfo = givenInfo({
      id: aInfoWithId.id,
      title: 'Do some important things',
    });

    geoService = {geocode: sinon.stub()};
    geocode = geoService.geocode as sinon.SinonStub;

    controller = new InfoController(InfoRepo, geoService);
  }
});
