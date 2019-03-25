import { Observable, OperatorFunction, Subject } from "rxjs";
import { DestructibleResource } from "./Destructible";

export default interface DirigiblePublisher<TNotification> {
  notification$: Observable<TNotification>;
  publish(notification: TNotification): void;
  hookIn(operatorFunction: OperatorFunction<TNotification, TNotification>): void;
}

export function createDirigiblePublisher<TNotification>(): DestructibleResource<DirigiblePublisher<TNotification>> {
  const initialNotificationSubject = new Subject<TNotification>();
  let initialNotification$ = initialNotificationSubject.asObservable();
  const notificationSubject = new Subject<TNotification>();
  const notification$ = notificationSubject.asObservable();
  let initialNotificationSubscription = initialNotification$.subscribe(notificationSubject);

  const dirigiblePublisher = {
    notification$,
    publish(notification: TNotification) {
      if (initialNotificationSubject.closed) {
        return;
      }

      initialNotificationSubject.next(notification);
    },
    hookIn(operatorFunction: OperatorFunction<TNotification, TNotification>) {
      if (initialNotificationSubject.closed) {
        return;
      }

      initialNotification$ = initialNotification$.pipe(operatorFunction);
      initialNotificationSubscription.unsubscribe();
      initialNotificationSubscription = initialNotification$.subscribe(notificationSubject);
    }
  };

  return {
    object: dirigiblePublisher,
    destroy() {
      initialNotificationSubscription.unsubscribe();
      notificationSubject.complete();
      initialNotificationSubject.complete();
    }
  };
}
