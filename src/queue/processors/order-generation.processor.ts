import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderGenerationService } from '../../order/services/order-generation.service';

@Injectable()
@Processor('order-generation')
export class OrderGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderGenerationProcessor.name);

  constructor(private orderGenerationService: OrderGenerationService) {
    super();
  }

  async process(job: Job<{ subscriptionId: string }>): Promise<void> {
    const { subscriptionId } = job.data;
    this.logger.log(`Processing order generation for subscription ${subscriptionId}`);

    try {
      await this.orderGenerationService.createOrderFromSubscription(subscriptionId);
    } catch (error) {
      this.logger.error(`Failed to generate order for subscription ${subscriptionId}: ${error.message}`);
      throw error; // Let Bull handle retries
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed for subscription ${job.data.subscriptionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job ${job.id} failed for subscription ${job.data.subscriptionId}`);
  }
}