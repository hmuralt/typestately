import { Subject } from "rxjs";
import {
  DispatchingActionNotification,
  DestructionNotification,
  ReducerRegistrationNotification,
  ReducerNotification,
  StateNotification,
  Hub
} from "../src/Hub";

export function createDirigiblePublisherMock<TNotification>() {
  const helperSubject = new Subject<TNotification>();

  return {
    notification$: helperSubject,
    publish: jest.fn((notification: TNotification) => helperSubject.next(notification)),
    hookIn: jest.fn(),
    destroy: jest.fn(() => helperSubject.complete())
  };
}

export function createHubMocks() {
  const mockDispatchingActionPublisher = createDirigiblePublisherMock<DispatchingActionNotification>();
  const mockDestructionPublisher = createDirigiblePublisherMock<DestructionNotification>();
  const mockReducerRegistrationPublisher = createDirigiblePublisherMock<ReducerRegistrationNotification>();
  const mockReducerDeregistrationPublisher = createDirigiblePublisherMock<ReducerNotification>();
  const mockStatePublisher = createDirigiblePublisherMock<StateNotification>();

  const mockHub: Hub = {
    dispatchingActionPublisher: mockDispatchingActionPublisher,
    destructionPublisher: mockDestructionPublisher,
    reducerRegistrationPublisher: mockReducerRegistrationPublisher,
    reducerDeregistrationPublisher: mockReducerDeregistrationPublisher,
    statePublisher: mockStatePublisher
  };

  return {
    mockHub,
    mockDispatchingActionPublisher,
    mockDestructionPublisher,
    mockReducerRegistrationPublisher,
    mockReducerDeregistrationPublisher,
    mockStatePublisher,
    resetMocks() {
      mockDispatchingActionPublisher.publish.mockClear();
      mockDispatchingActionPublisher.hookIn.mockClear();
      mockDispatchingActionPublisher.destroy.mockClear();

      mockDestructionPublisher.publish.mockClear();
      mockDestructionPublisher.hookIn.mockClear();
      mockDestructionPublisher.destroy.mockClear();

      mockReducerRegistrationPublisher.publish.mockClear();
      mockReducerRegistrationPublisher.hookIn.mockClear();
      mockReducerRegistrationPublisher.destroy.mockClear();

      mockReducerDeregistrationPublisher.publish.mockClear();
      mockReducerDeregistrationPublisher.hookIn.mockClear();
      mockReducerDeregistrationPublisher.destroy.mockClear();

      mockStatePublisher.publish.mockClear();
      mockStatePublisher.hookIn.mockClear();
      mockStatePublisher.destroy.mockClear();
    }
  };
}
