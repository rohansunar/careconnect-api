import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ToggleIsProviderDto } from '../../src/user/dto/toggle-is-provider.dto';

describe('ToggleIsProviderDto', () => {
  it('passes validation with isProvider set to true', async () => {
    const dto = plainToInstance(ToggleIsProviderDto, {
      isProvider: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation with isProvider set to false', async () => {
    const dto = plainToInstance(ToggleIsProviderDto, {
      isProvider: false,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation when isProvider is missing', async () => {
    const dto = plainToInstance(ToggleIsProviderDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('isProvider');
  });

  it('fails validation when isProvider is not a boolean', async () => {
    const dto = plainToInstance(ToggleIsProviderDto, {
      isProvider: 'true',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('isProvider');
  });
});
