import { Subject } from "rxjs";
import {
  DispatchedActionNotification,
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
  const mockDispatchedActionPublisher = createDirigiblePublisherMock<DispatchedActionNotification>();
  const mockDestructionPublisher = createDirigiblePublisherMock<DestructionNotification>();
  const mockReducerRegistrationPublisher = createDirigiblePublisherMock<ReducerRegistrationNotification>();
  const mockReducerDeregistrationPublisher = createDirigiblePublisherMock<ReducerNotification>();
  const mockStatePublisher = createDirigiblePublisherMock<StateNotification>();

  const mockHub: Hub = {
    dispatchedActionPublisher: mockDispatchedActionPublisher,
    destructionPublisher: mockDestructionPublisher,
    reducerRegistrationPublisher: mockReducerRegistrationPublisher,
    reducerDeregistrationPublisher: mockReducerDeregistrationPublisher,
    statePublisher: mockStatePublisher
  };

  return {
    mockHub,
    mockDispatchedActionPublisher,
    mockDestructionPublisher,
    mockReducerRegistrationPublisher,
    mockReducerDeregistrationPublisher,
    mockStatePublisher,
    resetMocks() {
      mockDispatchedActionPublisher.publish.mockClear();
      mockDispatchedActionPublisher.hookIn.mockClear();
      mockDispatchedActionPublisher.destroy.mockClear();

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
