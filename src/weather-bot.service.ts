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
      console.error(`Error fetching weather by coordinates (${lat}, ${lon}):`, error);
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
        console.error(`Error fetching weather for city (${location}):`, error);
        return 'Unable to retrieve the weather data. Please try again later.';
      }
  }

  private initBot() {
    bot.start((ctx) => {
      console.log(`User ${ctx.chat.id} started bot.`);
      ctx.reply('Hi! Send me your location or type the name of a city, and I’ll send you the weather forecast.');
    });
    

    bot.on('location', async (ctx) => {
      try {
        const lat = ctx.message.location.latitude;
        const lon = ctx.message.location.longitude;
        console.log(`Received location from user ${ctx.chat.id}: (${lat}, ${lon})`);

        userLocations[ctx.chat.id] = { lat, lon };

        const weather = await this.getWeatherByCoordinates(lat, lon);
        ctx.reply(weather);
      } catch (error) {
        console.error(`Error handling location for user ${ctx.chat.id}:`, error);
        ctx.reply('There was an error retrieving the weather for your location. Please try again.');
      }
    });

    bot.on('text', async (ctx) => {
      try {
        const city = ctx.message.text;
        console.log(`Received city from user ${ctx.chat.id}: ${city}`);

        userLocations[ctx.chat.id] = { city };

        const weather = await this.getWeather(city);
        ctx.reply(weather);
      } catch (error) {
        console.error(`Error handling city input for user ${ctx.chat.id}:`, error);
        ctx.reply('There was an error retrieving the weather for the city you provided. Please try again.');
      }
    });

    bot.launch();
    console.log('Bot launched successfully.');
  }
  
  @Cron('0 9 * * *', { timeZone: 'Asia/Almaty' })
  async scheduleDailyWeather() {
    console.log('Running scheduled daily weather update...');
  
    for (const chatId in userLocations) {
      try {
        const locationData = userLocations[chatId];
        let weather;
  
        if (locationData.city) {
          console.log(`Fetching daily weather for city for user ${chatId}`);
          weather = await this.getWeather(locationData.city);
        } else if (locationData.lat && locationData.lon) {
          console.log(`Fetching daily weather for coordinates for user ${chatId}`);
          weather = await this.getWeatherByCoordinates(locationData.lat, locationData.lon);
        } else {
          console.log(`No location data for user ${chatId}, skipping.`);
          continue;
        }
  
        console.log(`Sending weather update to user ${chatId}`);
        await bot.telegram.sendMessage(chatId, weather);
        console.log(`Weather sent to user ${chatId}`);
      } catch (error) {
        console.error(`Error processing weather for user ${chatId}:`, error);
      }
    }
  }
}