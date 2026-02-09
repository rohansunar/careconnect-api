import { IsString, IsNumber, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Product item in an order
 */
export class OrderProductDto {
    @IsString()
    name: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    price: number;

    @IsString()
    @IsOptional()
    unit?: string;
}

/**
 * DTO for order creation notifications
 * Used when sending notifications to customer, vendor, and admin about new orders
 */
export class OrderCreationNotificationDto {
    @IsString()
    orderId: string;

    @IsString()
    orderNumber: string;

    @IsString()
    customerName: string;

    @IsString()
    customerEmail: string;

    @IsString()
    @IsOptional()
    customerPhone?: string;

    @IsString()
    vendorName: string;

    @IsString()
    vendorEmail: string;

    @IsString()
    vendorId: string;

    @IsString()
    @IsOptional()
    adminEmail?: string;

    @IsNumber()
    totalAmount: number;

    @IsString()
    currency: string;

    @IsString()
    formattedAmount: string;

    @IsString()
    paymentMode: string;

    @IsString()
    deliveryAddress: string;

    @IsString()
    @IsOptional()
    estimatedDeliveryTime?: string;

    @IsString()
    orderDate: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderProductDto)
    products: OrderProductDto[];

    @IsNumber()
    @IsOptional()
    itemCount?: number;
}

/**
 * DTO for order cancellation notifications
 * Used when sending notifications about cancelled orders
 */
export class OrderCancellationNotificationDto {
    @IsString()
    orderId: string;

    @IsString()
    orderNumber: string;

    @IsString()
    customerName: string;

    @IsString()
    customerEmail: string;

    @IsString()
    @IsOptional()
    vendorEmail?: string;

    @IsString()
    @IsOptional()
    vendorId?: string;

    @IsString()
    cancellationReason: string;

    @IsNumber()
    @IsOptional()
    refundAmount?: number;

    @IsString()
    @IsOptional()
    refundTimeline?: string;

    @IsString()
    orderDate: string;

    @IsString()
    cancellationDate: string;

    @IsString()
    formattedCancellationDate: string;

    @IsNumber()
    totalAmount: number;

    @IsString()
    formattedAmount: string;
}

/**
 * Order status enum for delivery notifications
 */
export enum OrderDeliveryStatus {
    ASSIGNED = 'ASSIGNED',
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
    DELIVERED = 'DELIVERED',
}

/**
 * DTO for order delivery status notifications
 * Used for rider assignment, out for delivery, and delivered notifications
 */
export class DeliveryStatusNotificationDto {
    @IsString()
    orderId: string;

    @IsString()
    orderNumber: string;

    @IsString()
    customerId: string;

    @IsEnum(OrderDeliveryStatus)
    status: OrderDeliveryStatus;

    @IsString()
    @IsOptional()
    riderName?: string;

    @IsString()
    @IsOptional()
    riderPhone?: string;

    @IsString()
    @IsOptional()
    riderId?: string;

    @IsString()
    @IsOptional()
    estimatedDeliveryTime?: string;

    @IsString()
    @IsOptional()
    deliveryAddress?: string;

    @IsNumber()
    @IsOptional()
    totalAmount?: number;

    @IsString()
    @IsOptional()
    formattedAmount?: string;
}
