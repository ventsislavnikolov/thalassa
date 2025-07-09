import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, parse, addDays } from 'date-fns';
import { SearchParams, PriceInfo, RoomOption, CalendarResponse } from './types';
import { HotelConfig, getHotelConfig, getDefaultHotels } from './hotels';

// Store for last raw HTML (using a Map for state management)
const lastRawHtmlCache = new Map<string, string>();

export async function fetchCalendarData(params: SearchParams, hotelId: string): Promise<CalendarResponse> {
	const hotel = getHotelConfig(hotelId);
	const formData = buildFormData(params);

	try {
		console.log(`🌐 Fetching data from ${hotel.name} (${hotel.baseUrl})`);

		const response = await axios.post(`${hotel.baseUrl}/calendar`, formData, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			},
			timeout: 30000, // Increased timeout to 30 seconds for slower servers
		});

		console.log(`✅ Successfully fetched data from ${hotel.name}`);
		console.log(`📄 Response size: ${response.data.length} characters`);

		lastRawHtmlCache.set(hotelId, response.data);

		// Save raw HTML for debugging (commented out for now)
		if (process.env.NODE_ENV === 'development') {
			const fs = await import('fs');
			const path = await import('path');
			const debugDir = path.join(process.cwd(), 'debug');
			if (!fs.existsSync(debugDir)) {
				fs.mkdirSync(debugDir);
			}
			const filename = path.join(debugDir, `${hotel.id}-${Date.now()}.html`);
			fs.writeFileSync(filename, response.data);
			console.log(`💾 Saved raw HTML to: ${filename}`);
		}

		return parseCalendarHTML(response.data, params, hotel);
	} catch (error) {
		console.error(`❌ Error fetching ${hotel.name}:`, error);

		// Log more details about the error
		if (axios.isAxiosError(error)) {
			console.error(`🔍 Axios error details:`, {
				message: error.message,
				code: error.code,
				status: error.response?.status,
				statusText: error.response?.statusText,
				url: error.config?.url,
				timeout: error.config?.timeout,
			});
		}

		throw new Error(`Failed to fetch calendar data for ${hotel.name}: ${error}`);
	}
}

export async function fetchAllHotels(params: SearchParams, hotelIds?: string[]): Promise<CalendarResponse[]> {
	const hotels = hotelIds ? hotelIds.map(getHotelConfig) : getDefaultHotels();
	const responses: CalendarResponse[] = [];

	for (const hotel of hotels) {
		try {
			const response = await fetchCalendarData(params, hotel.id);
			responses.push(response);
		} catch (error) {
			console.error(`Error fetching ${hotel.name}:`, error);
		}
	}

	return responses;
}

export async function findLowestPricesAllHotels(
	params: SearchParams,
	monthsToCheck: number = 3,
	hotelIds?: string[],
): Promise<PriceInfo[]> {
	const hotels = hotelIds ? hotelIds.map(getHotelConfig) : getDefaultHotels();
	const priceMap = new Map<string, PriceInfo>(); // date + hotel as key

	console.log(`Scanning ${monthsToCheck} months across ${hotels.length} hotels...`);

	for (const hotel of hotels) {
		console.log(`\n${hotel.displayName}:`);
		console.log(`🔍 Starting scraping for ${hotel.name} (${hotel.baseUrl})`);

		// First, get prices from the initial search
		try {
			console.log(`📅 Fetching initial month for ${hotel.name}...`);
			const initialResponse = await fetchCalendarData(params, hotel.id);
			console.log(`✅ Initial month fetched for ${hotel.name}, found ${initialResponse.prices.length} prices`);
			
			initialResponse.prices.forEach((price) => {
				const key = `${price.date}_${hotel.id}`;
				priceMap.set(key, price);
			});
		} catch (error) {
			console.error(`❌ Error fetching initial month for ${hotel.name}:`, error);
			console.error(`🔍 Error details:`, {
				message: error instanceof Error ? error.message : 'Unknown error',
				hotelId: hotel.id,
				hotelName: hotel.name,
				baseUrl: hotel.baseUrl
			});
		}

		// Then check additional months
		const startDate = parse(params.checkin, 'yyyy-MM-dd', new Date());
		const daysToSkip = monthsToCheck > 6 ? 25 : 30;

		for (let i = 1; i < monthsToCheck; i++) {
			const currentDate = addDays(startDate, i * daysToSkip);
			const searchParams: SearchParams = {
				...params,
				checkin: format(currentDate, 'yyyy-MM-dd'),
				checkout: format(addDays(currentDate, params.nights), 'yyyy-MM-dd'),
			};

			try {
				console.log(`📅 Fetching month ${i + 1}/${monthsToCheck} for ${hotel.name} (${searchParams.checkin})...`);
				const response = await fetchCalendarData(searchParams, hotel.id);
				
				let newPrices = 0;
				response.prices.forEach((price) => {
					const key = `${price.date}_${hotel.id}`;
					if (!priceMap.has(key)) {
						priceMap.set(key, price);
						newPrices++;
					}
				});
				
				console.log(`✅ Month ${i + 1} fetched successfully for ${hotel.name}, found ${response.prices.length} prices (${newPrices} new)`);
			} catch (error) {
				console.error(`❌ Error fetching month ${i + 1} for ${hotel.name}:`, error);
				console.error(`🔍 Month ${i + 1} error details:`, {
					message: error instanceof Error ? error.message : 'Unknown error',
					checkin: searchParams.checkin,
					hotelId: hotel.id,
					hotelName: hotel.name
				});
			}

			// Add a small delay to avoid hammering the server
			if (monthsToCheck > 6) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
		
		console.log(`🏁 Completed scraping for ${hotel.name}`);
	}

	console.log('\n✅ Complete!');
	console.log(`Found prices for ${priceMap.size} date-hotel combinations\n`);

	// Convert map to array and sort by total price
	return Array.from(priceMap.values()).sort((a, b) => a.stayTotal - b.stayTotal);
}

function buildFormData(params: SearchParams): URLSearchParams {
	const checkinDate = parse(params.checkin, 'yyyy-MM-dd', new Date());

	const formData = new URLSearchParams({
		voucher: '',
		room: params.room || '',
		bk_code: '',
		offerid: '',
		checkin: params.checkin,
		checkout: params.checkout,
		cur_iso: params.currency || 'BGN',
		fromd: format(checkinDate, 'dd/MM/yyyy'),
		nights: params.nights.toString(),
		rooms: '1',
		adults: params.adults.toString(),
		children: (params.children || 0).toString(),
		infants: (params.infants || 0).toString(),
	});

	return formData;
}

function parseCalendarHTML(html: string, params: SearchParams, hotel: HotelConfig): CalendarResponse {
	const $ = cheerio.load(html);
	const prices: PriceInfo[] = [];
	const roomOptions: RoomOption[] = [];

	console.log(`🔍 Parsing HTML for ${hotel.name}`);
	console.log(`📏 HTML length: ${html.length} characters`);

	// Extract month and year
	const monthYearText = $('.calendar-controls h2').text().trim();
	const [month, year] = monthYearText.split(' ');
	console.log(`📅 Month/Year: ${monthYearText}`);

	// Extract room options
	$('select[name="room"] option').each((_, el) => {
		const $option = $(el);
		const value = $option.attr('value');
		const name = $option.text().trim();
		if (value && !$option.hasClass('empty')) {
			roomOptions.push({ value, name });
		}
	});
	console.log(`🏨 Found ${roomOptions.length} room options`);

	// Check if calendar exists
	const calendarCount = $('.calendar').length;
	const availableCells = $('.calendar .avl').length;
	console.log(`📊 Calendar elements: ${calendarCount}, Available cells: ${availableCells}`);
	
	// Save first available cell HTML for debugging
	if (availableCells > 0) {
		const firstAvailableCell = $('.calendar .avl').first();
		console.log('🔍 First available cell sample:');
		console.log('   HTML:', firstAvailableCell.html()?.slice(0, 500) || 'NO HTML');
		console.log('   Attributes:', {
			'data-date': firstAvailableCell.attr('data-date'),
			'data-title': firstAvailableCell.attr('data-title'),
			'class': firstAvailableCell.attr('class'),
		});
	}

	// Extract price data
	$('.calendar .avl').each((_, el) => {
		const $cell = $(el);
		const date = $cell.attr('data-date');
		const title = $cell.attr('data-title') || '';
		const cellHtml = $cell.html() || '';

		if (date) {
			// const cellHtml = $cell.html() || "";
			const cellText = $cell.text() || '';
			
			// Debug logging
			console.log(`📅 Processing cell for ${date}`);
			console.log(`   Title: ${title}`);
			console.log(`   Text: ${cellText.slice(0, 100)}...`);
			console.log(`   HTML: ${cellHtml.slice(0, 200)}...`);

			// Updated regex patterns to handle both US and European number formats
			// US format: "Stay total:BGN 5,106.67" (comma = thousands, dot = decimal)
			// European format: "Общ престой:лв 1 382,77" (space = thousands, comma = decimal)
			// Handle various Unicode whitespace characters for better compatibility
			const totalPricePatterns = [
				// US format with comma as thousands separator and dot as decimal
				/(?:Stay total:|Общ престой:)\s*(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d,]+\.\d{2})/i,
				/(?:Stay total:|Общ престой:).*?([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
				/(?:Stay total:|Общ престой:).*?<b>([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)?<\/b>/i,
				// European format with space as thousands separator and comma as decimal
				/(?:Stay total:|Общ престой:)\s*(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})/i,
				/(?:Stay total:|Общ престой:).*?([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
				/(?:Stay total:|Общ престой:).*?<b>([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)?<\/b>/i,
			];
			
			// Pattern 2: General patterns for both formats
			const generalPricePatterns = [
				// US format
				/(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d,]+\.\d{2})/i,
				/([\d,]+\.\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
				// European format
				/(?:BGN|лв)[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})/i,
				/([\d\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+,\d{2})[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]*(?:BGN|лв)/i,
			];

			// Try to match total price first
			let totalPriceMatch = null;
			for (const pattern of totalPricePatterns) {
				totalPriceMatch = cellText.match(pattern);
				if (totalPriceMatch) break;
			}

			// Try to match any price in title
			let perNightMatch = null;
			for (const pattern of generalPricePatterns) {
				perNightMatch = title.match(pattern);
				if (perNightMatch) break;
			}

			// Use total price if available, otherwise use per-night price
			let priceMatch = totalPriceMatch || perNightMatch;

			// If still no match, try any price pattern in the cell text
			if (!priceMatch) {
				for (const pattern of generalPricePatterns) {
					priceMatch = cellText.match(pattern);
					if (priceMatch) break;
				}
			}
			
			console.log(`   Price match: ${priceMatch ? priceMatch[0] : 'NO MATCH'}`);
			console.log(`   ---`)

			if (priceMatch) {
				// Price is in index 1 because index 0 is the full match
				let priceString = priceMatch[1];
				
				// Remove all Unicode whitespace characters (including regular spaces, non-breaking spaces, etc.)
				const allWhitespace = /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
				
				// Determine format based on pattern
				if (priceString.includes(',') && priceString.includes('.')) {
					// Could be either format - determine by position
					const commaIndex = priceString.indexOf(',');
					const dotIndex = priceString.indexOf('.');
					
					if (commaIndex < dotIndex) {
						// US format: "5,106.67" (comma = thousands, dot = decimal)
						priceString = priceString.replace(/,/g, '');
						// Already has dot as decimal separator
					} else {
						// European format: "1.382,77" (dot = thousands, comma = decimal)
						priceString = priceString.replace(/\./g, '').replace(',', '.');
					}
				} else if (priceString.includes(',') && !priceString.includes('.')) {
					// European format with comma as decimal: "1 382,77" or "2 464,35"
					priceString = priceString.replace(allWhitespace, '').replace(',', '.');
				} else if (priceString.includes('.') && !priceString.includes(',')) {
					// US format with dot as decimal: "5106.67"
					priceString = priceString.replace(allWhitespace, '');
					// Already has dot as decimal separator
				} else {
					// No decimal separator, just remove whitespace
					priceString = priceString.replace(allWhitespace, '');
				}
				
				const priceValue = parseFloat(priceString);

				let stayTotal: number;
				let avgPerNight: number;

				// If we found "Общ престой:" it's the total price
				if (totalPriceMatch) {
					stayTotal = priceValue;
					avgPerNight = stayTotal / params.nights;
				} else if (perNightMatch && !totalPriceMatch) {
					// Price from title is per night - need to multiply
					avgPerNight = priceValue;
					stayTotal = avgPerNight * params.nights;
				} else {
					// Assume it's total if no specific match
					stayTotal = priceValue;
					avgPerNight = stayTotal / params.nights;
				}

				const isLowestRate = $cell.find('.fa-star').length > 0;
				const dateObj = parse(date, 'yyyy-MM-dd', new Date());
				const dayOfWeek = format(dateObj, 'EEEE');

				prices.push({
					date,
					dayOfWeek,
					averagePerNight: avgPerNight,
					stayTotal: stayTotal,
					isLowestRate,
					nights: params.nights,
					currency: params.currency || 'BGN',
					hotelId: hotel.id,
					hotelName: hotel.name,
				});
			}
		}
	});

	console.log(`✅ Parsing complete: Found ${prices.length} prices`);

	return {
		month,
		year: parseInt(year),
		prices,
		roomOptions,
		hotelId: hotel.id,
		hotelName: hotel.name,
	};
}

export function getLastRawHtml(hotelId: string): string {
	return lastRawHtmlCache.get(hotelId) || '';
}
