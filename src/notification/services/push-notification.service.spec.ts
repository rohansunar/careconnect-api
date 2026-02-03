import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PushNotificationService } from './push-notification.service';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationPayload } from '../dto/notification-payload.dto';
import { UserType } from '../dto/user-type.enum';
import { FcmSendResult } from '../dto/fcm-send-result.dto';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  messaging: jest.fn(() => ({
    sendEachForMulticast: jest.fn(),
  })),
  apps: [],
}));

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockPrisma: any;
  let mockConfigService: any;
  let mockMessaging: { sendEachForMulticast: jest.Mock };

  const mockNotificationPayload: NotificationPayload = {
    title: 'Test Title',
    body: 'Test Body',
    data: { key: 'value' },
    imageUrl: 'https://example.com/image.png',
    sound: 'default',
    badge: 1,
  };

  beforeEach(async () => {
    mockPrisma = {
      deviceToken: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string | undefined> = {
          FIREBASE_PROJECT_ID: 'test-project-id',
          FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
            type: 'service_account',
            project_id: 'test-project-id',
            private_key_id: 'test-key-id',
            private_key:
              '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
            client_email: 'test@test-project.iam.gserviceaccount.com',
            client_id: '123456789',
          }),
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);

    // Get the mock messaging instance
    mockMessaging = (service as any).messaging;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when FIREBASE_PROJECT_ID is missing', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'FIREBASE_PROJECT_ID') return undefined;
        if (key === 'FIREBASE_SERVICE_ACCOUNT') return '{}';
        return undefined;
      });

      expect(() => {
        new PushNotificationService(mockConfigService, mockPrisma);
      }).toThrow('Missing required configuration: FIREBASE_PROJECT_ID');
    });

    it('should throw error when FIREBASE_SERVICE_ACCOUNT is missing', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
        if (key === 'FIREBASE_SERVICE_ACCOUNT') return undefined;
        return undefined;
      });

      expect(() => {
        new PushNotificationService(mockConfigService, mockPrisma);
      }).toThrow('Missing required configuration: FIREBASE_SERVICE_ACCOUNT');
    });
  });

  describe('sendToUser', () => {
    it('should return 0 when no active tokens found', async () => {
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.sendToUser(
        'user-123',
        UserType.CUSTOMER,
        mockNotificationPayload,
      );

      expect(result).toBe(0);
      expect(mockPrisma.deviceToken.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          user_type: UserType.CUSTOMER,
          is_active: true,
        },
        select: { device_token: true },
      });
    });

    it('should send notification to all user tokens', async () => {
      const mockTokens = [
        { device_token: 'token-1' },
        { device_token: 'token-2' },
      ];

      mockPrisma.deviceToken.findMany.mockResolvedValue(mockTokens);
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        responses: [
          { success: true, error: null },
          { success: true, error: null },
        ],
      });

      const result = await service.sendToUser(
        'user-123',
        UserType.CUSTOMER,
        mockNotificationPayload,
      );

      expect(result).toBe(2);
    });
  });

  describe('sendToDevice', () => {
    it('should return true on successful send', async () => {
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        responses: [{ success: true, error: null }],
      });

      const result = await service.sendToDevice(
        'device-token',
        mockNotificationPayload,
      );

      expect(result).toBe(true);
    });

    it('should return false on send failure', async () => {
      jest.useFakeTimers();
      mockMessaging.sendEachForMulticast.mockRejectedValue(
        new Error('FCM error'),
      );

      const resultPromise = service.sendToDevice(
        'device-token',
        mockNotificationPayload,
      );

      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const result = await resultPromise;
      expect(result).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('sendWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockResults: FcmSendResult[] = [
        { success: true, token: 'token-1' },
        { success: true, token: 'token-2' },
      ];

      mockMessaging.sendEachForMulticast.mockResolvedValue({
        responses: [
          { success: true, error: null },
          { success: true, error: null },
        ],
      });

      const result = await service.sendWithRetry(
        ['token-1', 'token-2'],
        mockNotificationPayload,
        3,
      );

      expect(result).toEqual(mockResults);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      mockMessaging.sendEachForMulticast
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue({
          responses: [{ success: true, error: null }],
        });

      const result = await service.sendWithRetry(
        ['token-1'],
        mockNotificationPayload,
        3,
      );

      expect(result).toHaveLength(1);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exceeded', async () => {
      mockMessaging.sendEachForMulticast.mockRejectedValue(
        new Error('Persistent error'),
      );

      await expect(
        service.sendWithRetry(['token-1'], mockNotificationPayload, 2),
      ).rejects.toThrow('Persistent error');

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    });
  });

  describe('token invalidation', () => {
    it('should deactivate invalid tokens after failed sends', async () => {
      mockPrisma.deviceToken.findMany.mockResolvedValue([
        { device_token: 'valid-token' },
        { device_token: 'invalid-token' },
      ]);

      mockMessaging.sendEachForMulticast.mockResolvedValue({
        responses: [
          { success: true, error: null },
          { success: false, error: { message: 'Invalid token' } },
        ],
      });

      await service.sendToUser(
        'user-123',
        UserType.CUSTOMER,
        mockNotificationPayload,
      );

      expect(mockPrisma.deviceToken.updateMany).toHaveBeenCalledWith({
        where: {
          device_token: { in: ['invalid-token'] },
        },
        data: {
          is_active: false,
          updated_at: expect.any(Date),
        },
      });
    });
  });
});
