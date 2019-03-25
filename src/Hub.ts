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

export interface ReducerNotification {
  parentContextId: string;
  key: string;
}

export interface ReducerRegistrationNotification extends ReducerNotification {
  reducer: Reducer;
}

export interface StateNotification {
  contextId: string;
  state: {};
}

export interface Hub {
  dispatchingActionPublisher: DirigiblePublisher<DispatchingActionNotification>;
  destructionPublisher: DirigiblePublisher<DestructionNotification>;
  reducerRegistrationPublisher: DirigiblePublisher<ReducerRegistrationNotification>;
  reducerDeregistrationPublisher: DirigiblePublisher<ReducerNotification>;
  statePublisher: DirigiblePublisher<StateNotification>;
}

export function createHub(): DestructibleResource<Hub> {
  const dispatchingActionPublisher = createDirigiblePublisher<DispatchingActionNotification>();
  const destructionPublisher = createDirigiblePublisher<DestructionNotification>();
  const reducerRegistrationPublisher = createDirigiblePublisher<ReducerRegistrationNotification>();
  const reducerDeregistrationPublisher = createDirigiblePublisher<ReducerNotification>();
  const statePublisher = createDirigiblePublisher<StateNotification>();

  const hub = {
    dispatchingActionPublisher: dispatchingActionPublisher.object,
    destructionPublisher: destructionPublisher.object,
    reducerRegistrationPublisher: reducerRegistrationPublisher.object,
    reducerDeregistrationPublisher: reducerDeregistrationPublisher.object,
    statePublisher: statePublisher.object
  };

  return {
    object: hub,
    destroy() {
      dispatchingActionPublisher.destroy();
      destructionPublisher.destroy();
      reducerRegistrationPublisher.destroy();
      reducerDeregistrationPublisher.destroy();
      statePublisher.destroy();
    }
  };
}
