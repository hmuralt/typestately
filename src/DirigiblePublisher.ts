import { Observable, OperatorFunction, Subject } from "rxjs";

export default interface DirigiblePublisher<TNotification> {
    notification$: Observable<TNotification>;
    publish(notification: TNotification): void;
    hookIn(operatorFunction: OperatorFunction<TNotification, TNotification>): void;
}

export function createDirigiblePublisher<TNotification>(): DirigiblePublisher<TNotification> {
    const initialNotificationSubject = new Subject<TNotification>();
    let initialNotification$ = initialNotificationSubject.asObservable();
    const notificationSubject = new Subject<TNotification>();
    const notification$ = notificationSubject.asObservable();
    let initialNotificationSubscription = initialNotification$.subscribe(notificationSubject);

    return {
        notification$,
        publish: (notification: TNotification) => {
            initialNotificationSubject.next(notification);
        },
        hookIn: (operatorFunction: OperatorFunction<TNotification, TNotification>) => {
            initialNotification$ = initialNotification$.pipe(operatorFunction);
            initialNotificationSubscription.unsubscribe();
            initialNotificationSubscription = initialNotification$.subscribe(notificationSubject);
        }
    };

}