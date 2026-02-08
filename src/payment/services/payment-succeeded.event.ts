export class PaymentSucceededEvent {
  constructor(
    public readonly payment: any,
    public readonly webhook: any,
    public readonly orderId: string,
    public readonly subscriptionId: string,
    public readonly amount: number,
    public readonly paymentMode: string,
  ) {}
}
