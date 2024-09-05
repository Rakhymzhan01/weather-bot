import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WeatherBotService } from './weather-bot.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [WeatherBotService],
})
export class AppModule {}
