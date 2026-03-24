import { Module } from '@nestjs/common';
import { TokenController } from './controllers/token.controller';
import { TokenService } from './services/token.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
