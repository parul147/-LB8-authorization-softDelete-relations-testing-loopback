
import {
  Client,
  createRestAppClient,
  givenHttpServerConfig
} from '@loopback/testlab';
import {AppApplication} from '../..';

export async function setupApplication(): Promise<AppWithClient> {
  const app = new AppApplication({
    rest: givenHttpServerConfig(),
  });

  await app.boot();
  await app.start();

  const client = createRestAppClient(app);

  return {app, client};
}

export interface AppWithClient {
  app: AppApplication;
  client: Client;
}
