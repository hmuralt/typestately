import { scan } from "rxjs/operators";
import { ReducersMapObject } from "redux";
import { ReducerNotification, ReducerRegistrationNotification } from "./Hub";

export default function createReducerNotificationScan(initialReducers: ReducersMapObject = {}) {
  return scan<ReducerNotification, ReducersMapObject>((reducers, notification) => {
    const newReducers = { ...reducers };

    if (isReducerRegistrationNotification(notification)) {
      newReducers[notification.key] = notification.reducer;
    } else {
      delete newReducers[notification.key];
    }

    return newReducers;
  }, initialReducers);
}

function isReducerRegistrationNotification(
  notification: ReducerNotification
): notification is ReducerRegistrationNotification {
  return notification !== undefined && (notification as ReducerRegistrationNotification).reducer !== undefined;
}
