import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const userLocations: { [chatId: string]: { lat?: number, lon?: number, city?: string } } = {};

@Injectable()
export class WeatherBotService {
  constructor() {
    this.initBot();
  }

  private async getWeatherByCoordinates(lat: number, lon: number): Promise<string> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
    try {
      const response = await axios.get(url);
      const data = response.data;
      return `Weather in ${data.name}: ${data.weather[0].description}, temperature: ${data.main.temp}°C`;
    } catch (error) {
      return 'Unable to retrieve the weather data. Please try again later.';
    }
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
      ctx.reply('Hi! Send me your location or type the name of a city, and I’ll send you the weather forecast.');
    });

    bot.on('location', async (ctx) => {
      const lat = ctx.message.location.latitude;
      const lon = ctx.message.location.longitude;

      userLocations[ctx.chat.id] = { lat, lon };

      const weather = await this.getWeatherByCoordinates(lat, lon);
      ctx.reply(weather);
    });

    bot.on('text', async (ctx) => {
      const city = ctx.message.text;

      userLocations[ctx.chat.id] = { city };

      const weather = await this.getWeather(city);
      ctx.reply(weather);
    });

    bot.launch();
  }

  
  @Cron('0 8 * * *')
  async scheduleDailyWeather() {
    
    for (const chatId in userLocations) {
      const locationData = userLocations[chatId];
      let weather;
      if (locationData.city) {
        weather = await this.getWeather(locationData.city);
      } 
      else if (locationData.lat && locationData.lon) {
        weather = await this.getWeatherByCoordinates(locationData.lat, locationData.lon);
      } 
      else {
        continue;
      }
      bot.telegram.sendMessage(chatId, weather);
    }
  }
}
