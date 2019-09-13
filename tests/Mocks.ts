import { Subject } from "rxjs";
import {
  DispatchingActionNotification,
  DestructionNotification,
  StateReportNotification,
  StateNotification,
  Hub
} from "../src/core/Hub";

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
  const mockStateReportPublisher = createDirigiblePublisherMock<StateReportNotification>();
  const mockStatePublisher = createDirigiblePublisherMock<StateNotification>();

  const mockHub: Hub = {
    dispatchingActionPublisher: mockDispatchingActionPublisher,
    destructionPublisher: mockDestructionPublisher,
    stateReportPublisher: mockStateReportPublisher,
    statePublisher: mockStatePublisher
  };

  return {
    mockHub,
    mockDispatchingActionPublisher,
    mockDestructionPublisher,
    mockStateReportPublisher,
    mockStatePublisher,
    resetMocks() {
      mockDispatchingActionPublisher.publish.mockClear();
      mockDispatchingActionPublisher.hookIn.mockClear();
      mockDispatchingActionPublisher.destroy.mockClear();

      mockDestructionPublisher.publish.mockClear();
      mockDestructionPublisher.hookIn.mockClear();
      mockDestructionPublisher.destroy.mockClear();

      mockStateReportPublisher.publish.mockClear();
      mockStateReportPublisher.hookIn.mockClear();
      mockStateReportPublisher.destroy.mockClear();

      mockStatePublisher.publish.mockClear();
      mockStatePublisher.hookIn.mockClear();
      mockStatePublisher.destroy.mockClear();
    }
  };
}
