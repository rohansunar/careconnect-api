/*
  Warnings:

  - A unique constraint covering the columns `[eventId,eventType]` on the table `PaymentWebhookEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_eventType_key" ON "PaymentWebhookEvent"("eventId", "eventType");
