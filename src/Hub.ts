import { Action, Reducer } from "redux";
import { createDirigiblePublisher } from "./DirigiblePublisher";

export interface ActionNotification {
  parentcontextId: string;
  action: Action;
}

export interface DestructionNotification {
  contextId: string;
}

export interface ReducerNotification {
  parentcontextId: string;
  key: string;
}

export interface ReducerRegistrationNotification extends ReducerNotification {
  reducer: Reducer;
}

export interface StateNotification {
  contextId: string;
  state: {};
}

export const dispatchedActionPublisher = createDirigiblePublisher<ActionNotification>();
export const destructionPublisher = createDirigiblePublisher<DestructionNotification>();
export const reducerRegistrationPublisher = createDirigiblePublisher<ReducerRegistrationNotification>();
export const reducerDeregistrationPublisher = createDirigiblePublisher<ReducerNotification>();
export const statePublisher = createDirigiblePublisher<StateNotification>();
