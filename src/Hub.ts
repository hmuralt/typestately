import { Action, Reducer } from "redux";
import DirigiblePublisher, { createDirigiblePublisher } from "./DirigiblePublisher";
import { DestructibleResource } from "./Destructible";

export interface DispatchingActionNotification {
  parentContextId: string;
  action: Action;
}

export interface DestructionNotification {
  contextId: string;
}

export enum StateReportType {
  Registration,
  Deregistration
}

export interface StateReportNotification {
  type: StateReportType;
  parentContextId: string;
  key: string;
  reducer?: Reducer;
}

export interface StateNotification {
  contextId: string;
  state: {};
}

export interface Hub {
  dispatchingActionPublisher: DirigiblePublisher<DispatchingActionNotification>;
  destructionPublisher: DirigiblePublisher<DestructionNotification>;
  stateReportPublisher: DirigiblePublisher<StateReportNotification>;
  statePublisher: DirigiblePublisher<StateNotification>;
}

export function createHub(): DestructibleResource<Hub> {
  const dispatchingActionPublisher = createDirigiblePublisher<DispatchingActionNotification>();
  const destructionPublisher = createDirigiblePublisher<DestructionNotification>();
  const stateReportPublisher = createDirigiblePublisher<StateReportNotification>();
  const statePublisher = createDirigiblePublisher<StateNotification>();

  const hub = {
    dispatchingActionPublisher: dispatchingActionPublisher.object,
    destructionPublisher: destructionPublisher.object,
    stateReportPublisher: stateReportPublisher.object,
    statePublisher: statePublisher.object
  };

  return {
    object: hub,
    destroy() {
      dispatchingActionPublisher.destroy();
      destructionPublisher.destroy();
      stateReportPublisher.destroy();
      statePublisher.destroy();
    }
  };
}
