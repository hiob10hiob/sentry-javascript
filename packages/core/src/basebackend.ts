import { Event, EventHint, Options, Severity, Transport } from '@sentry/types';
import { SentryError } from '@sentry/utils/error';
import { logger } from '@sentry/utils/logger';
import { SyncPromise } from '@sentry/utils/syncpromise';
import { NoopTransport } from './transports/noop';

/**
 * Internal platform-dependent Sentry SDK Backend.
 *
 * While {@link Client} contains business logic specific to an SDK, the
 * Backend offers platform specific implementations for low-level operations.
 * These are persisting and loading information, sending events, and hooking
 * into the environment.
 *
 * Backends receive a handle to the Client in their constructor. When a
 * Backend automatically generates events, it must pass them to
 * the Client for validation and processing first.
 *
 * Usually, the Client will be of corresponding type, e.g. NodeBackend
 * receives NodeClient. However, higher-level SDKs can choose to instanciate
 * multiple Backends and delegate tasks between them. In this case, an event
 * generated by one backend might very well be sent by another one.
 *
 * The client also provides access to options via {@link Client.getOptions}.
 * @hidden
 */
export interface Backend {
  /** Creates a {@link Event} from an exception. */
  eventFromException(exception: any, hint?: EventHint): SyncPromise<Event>;

  /** Creates a {@link Event} from a plain message. */
  eventFromMessage(message: string, level?: Severity, hint?: EventHint): SyncPromise<Event>;

  /** Submits the event to Sentry */
  sendEvent(event: Event): void;

  /**
   * Returns the transport that is used by the backend.
   * Please note that the transport gets lazy initialized so it will only be there once the first event has been sent.
   *
   * @returns The transport.
   */
  getTransport(): Transport;
}

/**
 * A class object that can instanciate Backend objects.
 * @hidden
 */
export type BackendClass<B extends Backend, O extends Options> = new (options: O) => B;

/**
 * This is the base implemention of a Backend.
 * @hidden
 */
export abstract class BaseBackend<O extends Options> implements Backend {
  /** Options passed to the SDK. */
  protected readonly _options: O;

  /** Cached transport used internally. */
  protected _transport: Transport;

  /** Creates a new backend instance. */
  public constructor(options: O) {
    this._options = options;
    if (!this._options.dsn) {
      logger.warn('No DSN provided, backend will not do anything.');
    }
    this._transport = this._setupTransport();
  }

  /**
   * Sets up the transport so it can be used later to send requests.
   */
  protected _setupTransport(): Transport {
    return new NoopTransport();
  }

  /**
   * @inheritDoc
   */
  public eventFromException(_exception: any, _hint?: EventHint): SyncPromise<Event> {
    throw new SentryError('Backend has to implement `eventFromException` method');
  }

  /**
   * @inheritDoc
   */
  public eventFromMessage(_message: string, _level?: Severity, _hint?: EventHint): SyncPromise<Event> {
    throw new SentryError('Backend has to implement `eventFromMessage` method');
  }

  /**
   * @inheritDoc
   */
  public sendEvent(event: Event): void {
    this._transport.sendEvent(event).catch(reason => {
      logger.error(`Error while sending event: ${reason}`);
    });
  }

  /**
   * @inheritDoc
   */
  public getTransport(): Transport {
    return this._transport;
  }
}
