import { filter } from "rxjs/operators";
import { createDirigiblePublisher } from "../src/DirigiblePublisher";

describe("createDirigiblePublisher", () => {
    describe("publish", () => {
        it("publishes notification on notification$ stream", (done) => {
            // Arrange
            const testNotification = "notification";
            const dirigiblePublisher = createDirigiblePublisher<string>();
            dirigiblePublisher.notification$.subscribe((notification) => {
                // Assert
                expect(notification).toBe(testNotification);
                done();
            });

            // Act
            dirigiblePublisher.publish(testNotification);
        });

        it("hooks in operator functions", (done) => {
            // Arrange
            const testNotification1 = "notification1";
            const testNotification2 = "notification2";
            const dirigiblePublisher = createDirigiblePublisher<string>();
            dirigiblePublisher.hookIn(filter((notification) => notification !== testNotification1));
            dirigiblePublisher.notification$.subscribe((notification) => {
                // Assert
                expect(notification).toBe(testNotification2);
                done();
            });

            // Act
            dirigiblePublisher.publish(testNotification1);
            dirigiblePublisher.publish(testNotification2);
        });
    });
});