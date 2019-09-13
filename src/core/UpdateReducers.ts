import { ReducersMapObject } from "redux";
import { StateReportNotification, StateReportType } from "./Hub";

export default function updateReducers(reducers: ReducersMapObject, stateReportNotification: StateReportNotification) {
  const newReducers = { ...reducers };
  const { type, key, reducer } = stateReportNotification;

  if (type === StateReportType.Registration && reducer !== undefined) {
    newReducers[key] = reducer;
  } else if (type === StateReportType.Deregistration) {
    delete newReducers[key];
  }

  return newReducers;
}
