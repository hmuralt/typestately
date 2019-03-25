import { scan } from "rxjs/operators";
import { ReducersMapObject } from "redux";
import { StateReportNotification, StateReportType } from "./Hub";

export default function createReducerNotificationScan(initialReducers: ReducersMapObject = {}) {
  return scan<StateReportNotification, ReducersMapObject>((reducers, notification) => {
    const newReducers = { ...reducers };

    if (notification.type === StateReportType.registration && notification.reducer !== undefined) {
      newReducers[notification.key] = notification.reducer;
    } else if (notification.type === StateReportType.deregistration) {
      delete newReducers[notification.key];
    }

    return newReducers;
  }, initialReducers);
}
