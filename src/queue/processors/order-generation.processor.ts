import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderGenerationService } from 'src/order/services/order-generation.service';
import { ORDER_GENERATION } from '../queue.constants';

/**
 * OrderGenerationProcessor is a BullMQ processor responsible for handling order generation jobs.
 * It processes jobs that contain subscription IDs and uses the OrderGenerationService to create orders from subscriptions.
 * This processor is designed to handle asynchronous order generation tasks in a queue-based system,
 * ensuring that order creation is decoupled from the main application flow for better scalability and reliability.
 * The processor extends WorkerHost to leverage BullMQ's worker functionality and listens to job events.
 */
@Injectable()
@Processor(ORDER_GENERATION)
export class OrderGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderGenerationProcessor.name);

  /**
   * Constructor for OrderGenerationProcessor.
   * Injects the OrderGenerationService dependency, which is used to perform the actual order generation logic.
   * Calls super() to initialize the WorkerHost base class.
   */
  constructor(private orderGenerationService: OrderGenerationService) {
    super();
  }

  /**
   * Processes an order generation job.
   * Extracts the subscriptionId from the job data.
   * Logs the start of processing.
   * Calls the OrderGenerationService to create an order from the subscription.
   * If an error occurs, logs the error and re-throws it to allow BullMQ to handle retries.
   * Steps:
   * 1. Extract subscriptionId from job.data
   * 2. Log processing start
   * 3. Invoke createOrderFromSubscription
   * 4. Handle errors by logging and re-throwing
   */
  async process(job: Job<{ subscriptionId: string }>): Promise<void> {
    const { subscriptionId } = job.data;
    this.logger.log(
      `Processing order generation for subscription ${subscriptionId}`,
    );

    try {
      await this.orderGenerationService.createOrderFromSubscription(
        subscriptionId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate order for subscription ${subscriptionId}: ${error.message}`,
      );
      throw error; // Let Bull handle retries
    }
  }

  /**
   * Event handler for when a job is completed.
   * Logs the completion of the job with its ID and subscription ID.
   * This is useful for monitoring and debugging the queue processing.
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `Job ${job.id} completed for subscription ${job.data.subscriptionId}`,
    );
  }

  /**
   * Event handler for when a job fails.
   * Logs the failure of the job with its ID and subscription ID.
   * This helps in identifying and troubleshooting failed order generations.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(
      `Job ${job.id} failed for subscription ${job.data.subscriptionId}`,
    );
  }
}
