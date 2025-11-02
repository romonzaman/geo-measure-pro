/**
 * OpenStreetMap Component using Leaflet
 * Works on both native (WebView) and web
 */

import React, {useEffect, useRef} from 'react';
import {Platform, StyleSheet, View, ViewStyle} from 'react-native';

interface Location {
  latitude: number;
  longitude: number;
}

interface OpenStreetMapProps {
  location: Location | null;
  style?: ViewStyle;
}

// HTML content with Leaflet map for WebView (native)
const createLeafletHTML = (lat: number, lng: number): string => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        function initMap() {
            try {
                console.log('Initializing map at:', ${lat}, ${lng});
                
                if (typeof L === 'undefined') {
                    console.error('Leaflet library not loaded');
                    return;
                }
                
                var map = L.map('map', {
                    center: [${lat}, ${lng}],
                    zoom: 15,
                    zoomControl: true
                });
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '? OpenStreetMap contributors',
                    maxZoom: 19,
                    tileSize: 256,
                    zoomOffset: 0
                }).addTo(map);
                
                var marker = L.marker([${lat}, ${lng}]).addTo(map)
                    .bindPopup('Your Location<br>You are here')
                    .openPopup();
                
                console.log('Map initialized successfully');
                
                setTimeout(function() {
                    map.invalidateSize();
                }, 300);
            } catch (error) {
                console.error('Error initializing map:', error);
            }
        }
        
        if (typeof L !== 'undefined') {
            initMap();
        } else {
            window.addEventListener('load', function() {
                setTimeout(initMap, 500);
            });
        }
    </script>
</body>
</html>
  `;
};

// Web component using Leaflet directly
const WebMap: React.FC<OpenStreetMapProps> = ({location, style}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    console.log('WebMap useEffect - location:', location, 'mapRef.current:', mapRef.current);
    if (!mapRef.current || !location) {
      console.log('WebMap: Missing mapRef or location', {hasRef: !!mapRef.current, hasLocation: !!location});
      return;
    }

    // Ensure map div has dimensions
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      console.log('Map div dimensions:', rect.width, 'x', rect.height);
      if (rect.height === 0) {
        console.warn('Map div has zero height!');
      }
    }

    // Load Leaflet CSS and JS dynamically
    const loadLeaflet = () => {
      console.log('Loading Leaflet...');
      // Check if CSS is already loaded
      const existingCSS = document.querySelector('link[href*="leaflet"]');
      if (!existingCSS) {
        console.log('Adding Leaflet CSS');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Check if Leaflet is already loaded
      if ((window as any).L && leafletLoadedRef.current) {
        console.log('Leaflet already loaded, initializing map');
        initializeMap();
        return;
      }

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        console.log('Leaflet JS loaded successfully');
        leafletLoadedRef.current = true;
        initializeMap();
      };
      script.onerror = () => {
        console.error('Failed to load Leaflet library');
      };
      document.body.appendChild(script);
    };

    const initializeMap = () => {
      const L = (window as any).L;
      console.log('initializeMap - L:', !!L, 'mapRef:', !!mapRef.current, 'location:', location);
      
      if (!L) {
        console.error('Leaflet library (L) not available');
        return;
      }
      
      if (!mapRef.current) {
        console.error('Map ref not available');
        return;
      }
      
      if (!location) {
        console.error('Location not available');
        return;
      }

      // Remove existing map if any
      if (mapInstanceRef.current) {
        console.log('Removing existing map');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      try {
        console.log('Creating map at:', location.latitude, location.longitude);
        // Initialize map
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [location.latitude, location.longitude],
          zoom: 15,
        });

        console.log('Map created, adding tile layer');
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '? OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        console.log('Adding marker');
        // Add marker
        L.marker([location.latitude, location.longitude])
          .addTo(mapInstanceRef.current)
          .bindPopup('Your Location<br>You are here')
          .openPopup();
        
        console.log('Map initialized successfully!');
        // Force map to invalidate size in case container wasn't ready
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('Map size invalidated');
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location]);

  if (!location) {
    return null;
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        ...(style as any),
      }}
    />
  );
};

// Native component using WebView
const NativeMap: React.FC<OpenStreetMapProps> = ({location, style}) => {
  if (!location) {
    console.log('NativeMap: No location provided');
    return null;
  }

  console.log('NativeMap: Creating map with location:', location);
  const WebView = require('react-native-webview').WebView;
  const htmlContent = createLeafletHTML(
    location.latitude,
    location.longitude,
  );

  return (
    <WebView
      source={{html: htmlContent}}
      style={[styles.map, style]}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      androidHardwareAccelerationDisabled={false}
      androidLayerType="hardware"
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error: ', nativeEvent);
      }}
      onLoadEnd={() => {
        console.log('WebView loaded successfully');
      }}
      onMessage={(event) => {
        console.log('WebView message:', event.nativeEvent.data);
      }}
    />
  );
};

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  location,
  style,
}) => {
  if (Platform.OS === 'web') {
    return <WebMap location={location} style={style} />;
  }
  return <NativeMap location={location} style={style} />;
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
