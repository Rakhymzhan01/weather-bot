import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const userLocations: { [chatId: string]: string } = {};

@Injectable()
export class WeatherBotService {
  constructor() {
    this.initBot();
  }

  private async getWeather(location: string): Promise<string> {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${WEATHER_API_KEY}&units=metric`;
    try {
        const response = await axios.get(url);
        const data = response.data;
        return `Weather in ${data.name}: ${data.weather[0].description}, temperature: ${data.main.temp}°C`;
      } catch (error) {
        return 'Unable to retrieve the weather data. Please try again later.';
      }
  }

  private initBot() {
    bot.start((ctx) => {
      ctx.reply('Hi! Send me your location (city name), and I’ll send you the weather forecast every day.');
    });

    bot.on('text', async (ctx) => {
      const location = ctx.message.text;

      
      userLocations[ctx.chat.id] = location;

      const weather = await this.getWeather(location);
      ctx.reply(weather);
    });

    bot.launch();
  }

  
  @Cron('0 9 * * *')
  async scheduleDailyWeather() {
    
    for (const chatId in userLocations) {
      const location = userLocations[chatId];
      const weather = await this.getWeather(location);
      bot.telegram.sendMessage(chatId, weather);
    }
  }
}
