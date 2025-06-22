import axios from 'axios';
import { format, parse, differenceInDays } from 'date-fns';
// chalk removed - no longer needed for web API

export interface WeatherData {
  date: string;
  temperature: {
    min: number;
    max: number;
    avg: number;
  };
  precipitation: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  weatherCode: number;
  description: string;
  seaTemperature?: number;
  beachConditions: string;
  recommendation: string;
  score: number; // 0-100 score for beach vacation suitability
}

export class WeatherAnalyzer {
  // Pefkohori, Greece coordinates (both hotels are in same location)
  private latitude = 40.0083;
  private longitude = 23.5236;
  
  async getWeatherForDates(dates: string[]): Promise<Map<string, WeatherData>> {
    const weatherMap = new Map<string, WeatherData>();
    
    // Group dates by proximity to use fewer API calls
    const today = new Date();
    const historicalDates: string[] = [];
    const forecastDates: string[] = [];
    
    dates.forEach(date => {
      const dateObj = parse(date, 'yyyy-MM-dd', new Date());
      const daysFromToday = differenceInDays(dateObj, today);
      
      if (daysFromToday < -365 || daysFromToday > 15) {
        // Use historical averages for dates too far in past or future
        historicalDates.push(date);
      } else {
        // Use forecast API for near-term dates
        forecastDates.push(date);
      }
    });
    
    // Get forecast data
    if (forecastDates.length > 0) {
      const forecastData = await this.getForecastData(forecastDates);
      forecastData.forEach((data, date) => weatherMap.set(date, data));
    }
    
    // Get historical averages
    if (historicalDates.length > 0) {
      const historicalData = await this.getHistoricalAverages(historicalDates);
      historicalData.forEach((data, date) => weatherMap.set(date, data));
    }
    
    return weatherMap;
  }
  
  private async getForecastData(dates: string[]): Promise<Map<string, WeatherData>> {
    const weatherMap = new Map<string, WeatherData>();
    
    try {
      // Get min and max dates for API call
      const sortedDates = dates.sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];
      
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: this.latitude,
          longitude: this.longitude,
          start_date: startDate,
          end_date: endDate,
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relativehumidity_2m_mean,uv_index_max,weathercode',
          timezone: 'Europe/Athens'
        }
      });
      
      const daily = response.data.daily;
      
      daily.time.forEach((date: string, index: number) => {
        if (dates.includes(date)) {
          const weatherData = this.parseWeatherData(date, {
            tempMax: daily.temperature_2m_max[index],
            tempMin: daily.temperature_2m_min[index],
            precipitation: daily.precipitation_sum[index],
            windSpeed: daily.windspeed_10m_max[index],
            humidity: daily.relativehumidity_2m_mean[index],
            uvIndex: daily.uv_index_max[index],
            weatherCode: daily.weathercode[index]
          });
          weatherMap.set(date, weatherData);
        }
      });
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    }
    
    return weatherMap;
  }
  
  private async getHistoricalAverages(dates: string[]): Promise<Map<string, WeatherData>> {
    const weatherMap = new Map<string, WeatherData>();
    
    // For dates outside forecast range, use typical weather patterns
    dates.forEach(date => {
      const month = parseInt(date.substring(5, 7));
      const weatherData = this.getTypicalWeatherForMonth(date, month);
      weatherMap.set(date, weatherData);
    });
    
    return weatherMap;
  }
  
  private parseWeatherData(date: string, data: any): WeatherData {
    const tempAvg = (data.tempMax + data.tempMin) / 2;
    const { description, beachConditions } = this.interpretWeatherCode(data.weatherCode);
    const score = this.calculateBeachScore(data);
    const seaTemp = this.estimateSeaTemperature(date);
    
    return {
      date,
      temperature: {
        min: data.tempMin,
        max: data.tempMax,
        avg: tempAvg
      },
      precipitation: data.precipitation || 0,
      windSpeed: data.windSpeed || 0,
      humidity: data.humidity || 0,
      uvIndex: data.uvIndex || 0,
      weatherCode: data.weatherCode || 0,
      description,
      seaTemperature: seaTemp,
      beachConditions,
      recommendation: this.getRecommendation(score, data),
      score
    };
  }
  
  private getTypicalWeatherForMonth(date: string, month: number): WeatherData {
    // Typical weather data for Pefkohori by month
    const monthlyData: Record<number, any> = {
      1: { tempMin: 4, tempMax: 11, avgPrecip: 40, seaTemp: 14 },
      2: { tempMin: 5, tempMax: 13, avgPrecip: 38, seaTemp: 14 },
      3: { tempMin: 7, tempMax: 16, avgPrecip: 40, seaTemp: 14 },
      4: { tempMin: 10, tempMax: 20, avgPrecip: 35, seaTemp: 15 },
      5: { tempMin: 15, tempMax: 25, avgPrecip: 40, seaTemp: 18 },
      6: { tempMin: 19, tempMax: 30, avgPrecip: 30, seaTemp: 22 },
      7: { tempMin: 22, tempMax: 32, avgPrecip: 25, seaTemp: 25 },
      8: { tempMin: 22, tempMax: 32, avgPrecip: 20, seaTemp: 26 },
      9: { tempMin: 18, tempMax: 28, avgPrecip: 35, seaTemp: 24 },
      10: { tempMin: 14, tempMax: 22, avgPrecip: 50, seaTemp: 21 },
      11: { tempMin: 9, tempMax: 17, avgPrecip: 55, seaTemp: 18 },
      12: { tempMin: 6, tempMax: 13, avgPrecip: 50, seaTemp: 16 }
    };
    
    const data = monthlyData[month];
    const score = this.calculateBeachScore({
      tempMax: data.tempMax,
      tempMin: data.tempMin,
      precipitation: data.avgPrecip / 10, // Convert to daily estimate
      windSpeed: 15,
      humidity: 70,
      uvIndex: month >= 5 && month <= 9 ? 7 : 4,
      weatherCode: 0
    });
    
    return {
      date,
      temperature: {
        min: data.tempMin,
        max: data.tempMax,
        avg: (data.tempMax + data.tempMin) / 2
      },
      precipitation: data.avgPrecip / 30,
      windSpeed: 15,
      humidity: 70,
      uvIndex: month >= 5 && month <= 9 ? 7 : 4,
      weatherCode: 0,
      description: 'Historical average',
      seaTemperature: data.seaTemp,
      beachConditions: this.getBeachConditionsForMonth(month),
      recommendation: this.getRecommendationForMonth(month),
      score
    };
  }
  
  private interpretWeatherCode(code: number): { description: string; beachConditions: string } {
    const weatherCodes: Record<number, { description: string; beachConditions: string }> = {
      0: { description: 'Clear sky', beachConditions: 'Perfect beach day' },
      1: { description: 'Mainly clear', beachConditions: 'Excellent for beach' },
      2: { description: 'Partly cloudy', beachConditions: 'Good for beach' },
      3: { description: 'Overcast', beachConditions: 'Cooler but suitable' },
      45: { description: 'Foggy', beachConditions: 'Limited visibility' },
      48: { description: 'Foggy', beachConditions: 'Limited visibility' },
      51: { description: 'Light drizzle', beachConditions: 'Beach possible between showers' },
      61: { description: 'Light rain', beachConditions: 'Indoor activities recommended' },
      63: { description: 'Moderate rain', beachConditions: 'Not suitable for beach' },
      65: { description: 'Heavy rain', beachConditions: 'Stay indoors' },
      71: { description: 'Light snow', beachConditions: 'Too cold for beach' },
      80: { description: 'Rain showers', beachConditions: 'Intermittent beach time' },
      95: { description: 'Thunderstorm', beachConditions: 'Dangerous - avoid beach' }
    };
    
    return weatherCodes[code] || { description: 'Variable', beachConditions: 'Check local conditions' };
  }
  
  private calculateBeachScore(data: any): number {
    let score = 100;
    
    // Temperature scoring (ideal: 25-30°C)
    if (data.tempMax < 20) score -= 30;
    else if (data.tempMax < 25) score -= 10;
    else if (data.tempMax > 35) score -= 20;
    
    // Precipitation scoring
    if (data.precipitation > 0) score -= Math.min(30, data.precipitation * 3);
    
    // Wind scoring (ideal: < 20 km/h)
    if (data.windSpeed > 30) score -= 20;
    else if (data.windSpeed > 20) score -= 10;
    
    // UV Index (ideal: 5-7 for tanning with protection)
    if (data.uvIndex < 3) score -= 10;
    else if (data.uvIndex > 9) score -= 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private estimateSeaTemperature(date: string): number {
    const month = parseInt(date.substring(5, 7));
    const seaTemps: Record<number, number> = {
      1: 14, 2: 14, 3: 14, 4: 15, 5: 18, 6: 22,
      7: 25, 8: 26, 9: 24, 10: 21, 11: 18, 12: 16
    };
    return seaTemps[month] || 20;
  }
  
  private getBeachConditionsForMonth(month: number): string {
    if (month >= 6 && month <= 9) return 'Peak beach season';
    if (month === 5 || month === 10) return 'Good for beach, fewer crowds';
    if (month === 4 || month === 11) return 'Cool, suitable for walks';
    return 'Too cold for swimming';
  }
  
  private getRecommendationForMonth(month: number): string {
    if (month >= 6 && month <= 8) return 'High season - perfect beach weather but crowded';
    if (month === 9) return 'Excellent choice - warm weather, warm sea, fewer tourists';
    if (month === 10) return 'Good value - still warm enough for beach activities';
    if (month === 5) return 'Spring weather - pleasant but sea still cool';
    return 'Off-season - better for sightseeing than beach';
  }
  
  private getRecommendation(score: number, data: any): string {
    if (score >= 80) return '🏖️ Excellent beach weather';
    if (score >= 60) return '☀️ Good for outdoor activities';
    if (score >= 40) return '⛅ Mixed conditions - have backup plans';
    return '🌧️ Better for indoor activities';
  }
  
  static displayWeatherAnalysis(weatherData: WeatherData[]): void {
    console.log('\n🌤️  Weather Analysis for Top Price Dates:\n');
    
    weatherData.forEach((weather, index) => {
      const dateObj = parse(weather.date, 'yyyy-MM-dd', new Date());
      const monthDay = format(dateObj, 'MMM d');
      
      console.log(`${index + 1}. ${monthDay} (${weather.date})`);
      console.log(`   🌡️  Temperature: ${weather.temperature.min}°C - ${weather.temperature.max}°C`);
      console.log(`   🌊 Sea Temperature: ${weather.seaTemperature}°C`);
      console.log(`   ☔ Precipitation: ${weather.precipitation.toFixed(1)}mm`);
      console.log(`   💨 Wind: ${weather.windSpeed}km/h`);
      console.log(`   ☀️  UV Index: ${weather.uvIndex}`);
      console.log(`   📊 Beach Score: ${weather.score}/100`);
      console.log(`   ${weather.recommendation}`);
      console.log();
    });
  }
}