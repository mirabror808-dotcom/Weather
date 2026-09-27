import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Weather = () => {
    const [searchTerm, setSearchTerm] = useState('London');
    const [photos, setPhotos] = useState([]);
    const [currentBgIndex, setCurrentBgIndex] = useState(0);
    const [weatherData, setWeatherData] = useState(null);
    const [forecastData, setForecastData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const CLIENT_ID = import.meta.env.VITE_UNSPLASH_CLIENT_ID || 'dfMfobgAcZ7lbHlNWS7DCYIkPCq88orHMqIrOVwHsYw';
    const CURRENT_URL = import.meta.env.VITE_WEATHER_CURRENT_URL || 'https://api.openweathermap.org/data/2.5/weather';
    const FORECAST_URL = import.meta.env.VITE_WEATHER_FORECAST_URL || 'https://api.openweathermap.org/data/2.5/forecast';
    const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

    useEffect(() => {
        const query = searchTerm.trim();
        if (!query) return;

        const controller = new AbortController();

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            setError('');

            try {
                // Parallel so'rovlar (Unsplash, Current Weather, Forecast)
                const [unsplashRes, currentRes, forecastRes] = await Promise.all([
                    axios.get(`https://api.unsplash.com/search/photos`, {
                        params: { query: `${query} city skyline`, orientation: 'landscape', client_id: CLIENT_ID },
                        signal: controller.signal
                    }).catch(err => ({ error: err })),
                    
                    axios.get(CURRENT_URL, {
                        params: { q: query, units: 'metric', appid: API_KEY },
                        signal: controller.signal
                    }),
                    
                    axios.get(FORECAST_URL, {
                        params: { q: query, units: 'metric', appid: API_KEY },
                        signal: controller.signal
                    })
                ]);

                // 1. Unsplash rasmlari
                if (unsplashRes.data?.results?.length > 0) {
                    const fetchedPhotos = unsplashRes.data.results.map((item) => ({
                        id: item.id,
                        url: item.urls.small,
                        fullUrl: item.urls.regular
                    }));
                    setPhotos(fetchedPhotos);
                    setCurrentBgIndex(0);
                }

                // 2. Joriy ob-havo
                setWeatherData({
                    name: currentRes.data.name,
                    temp: currentRes.data.main.temp,
                    humidity: currentRes.data.main.humidity,
                    wind: currentRes.data.wind.speed * 3.6, // m/s -> km/h
                    cloud: currentRes.data.clouds.all
                });

                // 3. 5 kunlik prognoz (Har bir kungi min/max haroratni guruhlash)
                const list = forecastRes.data.list || [];
                const dailyData = {};

                list.forEach((item) => {
                    const date = item.dt_txt.split(' ')[0];
                    if (!dailyData[date]) {
                        dailyData[date] = {
                            dt: item.dt,
                            temp_max: item.main.temp_max,
                            temp_min: item.main.temp_min,
                            date: item.dt_txt
                        };
                    } else {
                        dailyData[date].temp_max = Math.max(dailyData[date].temp_max, item.main.temp_max);
                        dailyData[date].temp_min = Math.min(dailyData[date].temp_min, item.main.temp_min);
                    }
                });

                setForecastData(Object.values(dailyData).slice(0, 5));

            } catch (err) {
                if (axios.isCancel(err)) return;

                console.error("API Xatosi:", err.response?.data || err.message);
                setWeatherData(null);
                setForecastData([]);

                if (err.response?.status === 404) {
                    setError("Shahar topilmadi!");
                } else if (err.response?.status === 401) {
                    setError("API kaliti noto'g'ri!");
                } else {
                    setError("Ma'lumotlarni yuklashda xatolik!");
                }
            } finally {
                setLoading(false);
            }
        }, 600);

        return () => {
            clearTimeout(delayDebounceFn);
            controller.abort();
        };
    }, [searchTerm, CURRENT_URL, FORECAST_URL, API_KEY, CLIENT_ID]);

    // Avtomatik background almashinuvi
    useEffect(() => {
        if (photos.length === 0) return;

        const interval = setInterval(() => {
            setCurrentBgIndex((prevIndex) => (prevIndex + 1) % photos.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [photos]);

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            position: 'relative',
            backgroundColor: '#0f172a',
            overflow: 'hidden',
            display: 'flex',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            color: '#fff',
            boxSizing: 'border-box'
        }}>
            {/* Fon rasmlari */}
            {photos.map((photo, index) => (
                <div
                    key={photo.id}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45)), url(${photo.fullUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: index === currentBgIndex ? 1 : 0,
                        transition: 'opacity 1.2s ease-in-out',
                        zIndex: 0
                    }}
                />
            ))}

            <div style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                width: '100%',
                minHeight: '100vh'
            }}>
                {/* Chap tomon: Harorat va shahar nomi */}
                <div style={{
                    flex: '1',
                    padding: '60px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px' }}>
                        W<span style={{ color: '#00d2ff' }}>V</span>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px' }}>
                            <h1 style={{ fontSize: '110px', margin: 0, fontWeight: '300', lineHeight: '1' }}>
                                {weatherData ? `${Math.round(weatherData.temp)}°` : '--°'}
                            </h1>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h2 style={{ fontSize: '48px', margin: 0, textTransform: 'capitalize', lineHeight: '1.1' }}>
                                    {weatherData ? weatherData.name : searchTerm}
                                </h2>
                                <span style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* O'ng tomon: Qidiruv paneli va ma'lumotlar */}
                <div style={{
                    width: '420px',
                    background: 'rgba(15, 23, 42, 0.45)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '40px 30px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    overflowY: 'auto',
                    maxHeight: '100vh'
                }}>
                    <div>
                        <input
                            type="text"
                            placeholder="Search Location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
                                color: '#fff',
                                fontSize: '16px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {loading && <p style={{ fontSize: '14px', color: '#00d2ff', margin: 0 }}>Yuklanmoqda...</p>}
                    {error && <p style={{ fontSize: '13px', color: '#ff6b6b', margin: 0 }}>{error}</p>}

                    <div style={{ fontSize: '14px', opacity: 0.8, fontWeight: 'bold', letterSpacing: '1px' }}>
                        WEATHER DETAILS
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
                            <span>Humidity</span>
                            <span>{weatherData ? `${weatherData.humidity}%` : '--'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
                            <span>Cloudy</span>
                            <span>{weatherData ? `${weatherData.cloud}%` : '--'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
                            <span>Wind</span>
                            <span>{weatherData ? `${Math.round(weatherData.wind)} km/h` : '--'}</span>
                        </div>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.15)', margin: '5px 0' }} />

                    {/* 5 kunlik prognoz */}
                    <div style={{ fontSize: '14px', opacity: 0.8, fontWeight: 'bold', letterSpacing: '1px' }}>
                        5-DAY FORECAST
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {forecastData.map((item, idx) => {
                            const dateObj = new Date(item.dt * 1000);
                            const dayName = idx === 0 ? 'Bugun' : dateObj.toLocaleDateString('uz-UZ', { weekday: 'short' });

                            return (
                                <div key={item.dt} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', opacity: 0.9 }}>
                                    <span style={{ textTransform: 'capitalize' }}>{dayName}</span>
                                    <span>
                                        <strong style={{ color: '#00d2ff' }}>{Math.round(item.temp_max)}°</strong> / {Math.round(item.temp_min)}°
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.15)', margin: '5px 0' }} />

                    <div style={{ fontSize: '14px', opacity: 0.8, fontWeight: 'bold', letterSpacing: '1px' }}>
                        CITY GALLERY
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px',
                        maxHeight: '150px',
                        overflowY: 'auto'
                    }}>
                        {photos.map((photo, index) => (
                            <img
                                key={photo.id}
                                src={photo.url}
                                alt="City thumbnail"
                                onClick={() => setCurrentBgIndex(index)}
                                style={{
                                    width: '100%',
                                    height: '70px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: index === currentBgIndex ? '2px solid #00d2ff' : '1px solid rgba(255, 255, 255, 0.2)',
                                    opacity: index === currentBgIndex ? 1 : 0.6,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Weather;