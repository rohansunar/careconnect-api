import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RecalculateSubscriptionPreviewDto } from '../../src/subscription/dto/subscription-preview.dto';
import { SubscriptionFrequency } from '../../src/subscription/interfaces/delivery-frequency.interface';

describe('RecalculateSubscriptionPreviewDto', () => {
  it('requires productId and transforms custom_days to numbers', async () => {
    const dto = plainToInstance(RecalculateSubscriptionPreviewDto, {
      productId: 'product_1',
      frequency: SubscriptionFrequency.CUSTOM_DAYS,
      start_date: '2026-03-28',
      custom_days: ['1', '5', '0'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.custom_days).toEqual([1, 5, 0]);
  });

  it('rejects missing custom_days when frequency is CUSTOM_DAYS', async () => {
    const dto = plainToInstance(RecalculateSubscriptionPreviewDto, {
      productId: 'product_1',
      frequency: SubscriptionFrequency.CUSTOM_DAYS,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('custom_days');
  });

  it('rejects custom_days values outside the valid weekday range', async () => {
    const dto = plainToInstance(RecalculateSubscriptionPreviewDto, {
      productId: 'product_1',
      custom_days: [7],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('custom_days');
  });
});
