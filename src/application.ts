import {AuthenticationComponent, registerAuthenticationStrategy} from '@loopback/authentication';
import {AuthorizationComponent} from '@loopback/authorization';
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {Request, Response, RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import morgan from 'morgan';
import path from 'path';
import {JWTStrategy} from './authenticationStrategy/jwt-strategy';
import {PasswordHasherBinding, TokenServiceBindings, TokenServiceConstants, UserServiceBindings} from './keys';
import { InfoRepository } from './repositories';
import {MySequence} from './sequence';
import {BcryptHasher} from './services/hasher.password.bcrypt';
import {JWTService} from './services/jwt-service';
import {MyuserService} from './services/user-service';

export {ApplicationConfig};

export class AppApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);
    //set up binding
    this.setupBinding();

    //register authentication component
    this.component(AuthenticationComponent);
    registerAuthenticationStrategy(this, JWTStrategy)

    //register authorization component
    this.component(AuthorizationComponent);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);


    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
    this.setupLogging();
  }
  private setupLogging() {
    // Register `morgan` express middleware
    // Create a middleware factory wrapper for `morgan(format, options)`
    const morganFactory = (config?: morgan.Options<Request, Response>) => {
      this.debug('Morgan configuration', config);
      return morgan('combined', config);
    };

    // Print out logs using `debug`
    const defaultConfig: morgan.Options<Request, Response> = {
      stream: {
        write: str => {
          this._debug(str);
        },
      },
    };
    this.expressMiddleware(morganFactory, defaultConfig, {
      injectConfiguration: 'watch',
      key: 'middleware.morgan',
    });
  }

  setupBinding(): void {
    this.bind(PasswordHasherBinding.PASSWORD_HASHER).toClass(BcryptHasher);
    this.bind(PasswordHasherBinding.ROUNDS).to(10);
    this.bind(UserServiceBindings.USER_SERVICE).toClass(MyuserService);
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(TokenServiceConstants.TOKEN_SECRET_VALUE);
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(TokenServiceConstants.TOKEN_EXPIRES_IN_VALUE);
    this.bind('repositories.Inforepository').toClass(InfoRepository);

  }
}
