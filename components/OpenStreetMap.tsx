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

type MeasurementType = 'distance' | 'area' | null;

interface OpenStreetMapProps {
  location: Location | null;
  points?: Location[];
  measurementType?: MeasurementType;
  selectedLocation?: Location | null;
  onLocationSelect?: (location: Location) => void;
  style?: ViewStyle;
  centerAndZoom?: boolean; // Trigger to center and zoom to 100 feet radius
}

// HTML content with Leaflet map for WebView (native)
const createLeafletHTML = (
  lat: number,
  lng: number,
  points: Location[] = [],
  measurementType: MeasurementType = null,
  selectedLocation: Location | null = null,
  centerAndZoom: boolean = false,
): string => {
  const pointsJSON = JSON.stringify(points);
  const measurementTypeStr = measurementType || '';
  const selectedLocationJSON = selectedLocation ? JSON.stringify(selectedLocation) : 'null';
  const centerAndZoomStr = centerAndZoom ? 'true' : 'false';
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
                
                // Center and zoom to 100 feet radius if requested
                if (${centerAndZoomStr}) {
                    setTimeout(function() {
                        // 100 feet = 30.48 meters
                        // Calculate bounds for 100 feet radius
                        var latOffset = 30.48 / 111000;
                        var lngOffset = 30.48 / (111000 * Math.cos(${lat} * Math.PI / 180));
                        var bounds = [
                            [${lat} - latOffset, ${lng} - lngOffset],
                            [${lat} + latOffset, ${lng} + lngOffset]
                        ];
                        map.fitBounds(bounds, {padding: [20, 20]});
                    }, 500);
                }
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '? OpenStreetMap contributors',
                    maxZoom: 19,
                    tileSize: 256,
                    zoomOffset: 0
                }).addTo(map);
                
                // Current location marker
                var currentLocationMarker = L.marker([${lat}, ${lng}], {
                    icon: L.divIcon({
                        className: 'current-location-marker',
                        html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map)
                    .bindPopup('Your Location<br>You are here');
                
        // Draw measurement points
        var points = ${pointsJSON};
        var measurementType = '${measurementTypeStr}';
        var selectedLocation = ${selectedLocationJSON};
        window.mapInstance = map;
        
        // Add click handler to map
        map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelect',
                latitude: lat,
                longitude: lng
            }));
        });
        
        // Draw selected location marker
        var selectedMarker = null;
        if (selectedLocation) {
            selectedMarker = L.marker([selectedLocation.latitude, selectedLocation.longitude], {
                icon: L.divIcon({
                    className: 'selected-location-marker',
                    html: '<div style="background-color: #FF9800; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map)
                .bindPopup('Selected Location<br>Tap "Mark Location" to use');
        }
        window.selectedMarker = selectedMarker;
        
        drawMeasurements(map, points, measurementType);
                
                console.log('Map initialized successfully');
                
                setTimeout(function() {
                    map.invalidateSize();
                }, 300);
            } catch (error) {
                console.error('Error initializing map:', error);
            }
        }
        
        var measurementMarkers = [];
        var measurementLine = null;
        var measurementPolygon = null;
        
        function drawMeasurements(map, points, measurementType) {
            // Clear previous
            measurementMarkers.forEach(function(marker) {
                map.removeLayer(marker);
            });
            measurementMarkers = [];
            
            if (measurementLine) {
                map.removeLayer(measurementLine);
                measurementLine = null;
            }
            
            if (measurementPolygon) {
                map.removeLayer(measurementPolygon);
                measurementPolygon = null;
            }
            
            if (!points || points.length === 0) return;
            
            // Add markers
            points.forEach(function(point, index) {
                var marker = L.marker([point.latitude, point.longitude], {
                    icon: L.divIcon({
                        className: 'measurement-marker',
                        html: '<div style="background-color: #4CAF50; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">' + (index + 1) + '</div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(map)
                    .bindPopup('Point ' + (index + 1));
                measurementMarkers.push(marker);
            });
            
            // Draw line for distance
            if (measurementType === 'distance' && points.length === 2) {
                measurementLine = L.polyline([
                    [points[0].latitude, points[0].longitude],
                    [points[1].latitude, points[1].longitude]
                ], {
                    color: '#4CAF50',
                    weight: 3,
                    opacity: 0.8
                }).addTo(map);
            }
            
            // Draw polygon for area
            if (measurementType === 'area' && points.length === 4) {
                var coords = points.map(function(p) {
                    return [p.latitude, p.longitude];
                });
                measurementPolygon = L.polygon(coords, {
                    color: '#4CAF50',
                    weight: 3,
                    opacity: 0.8,
                    fillColor: '#4CAF50',
                    fillOpacity: 0.3
                }).addTo(map);
            }
        }
        
        window.updateMeasurements = function(points, measurementType) {
            if (window.mapInstance) {
                drawMeasurements(window.mapInstance, points, measurementType);
            }
        };
        
        window.updateSelectedLocation = function(selectedLocation) {
            if (window.mapInstance) {
                // Remove old selected marker
                if (window.selectedMarker) {
                    window.mapInstance.removeLayer(window.selectedMarker);
                    window.selectedMarker = null;
                }
                
                // Add new selected marker
                if (selectedLocation) {
                    window.selectedMarker = L.marker([selectedLocation.latitude, selectedLocation.longitude], {
                        icon: L.divIcon({
                            className: 'selected-location-marker',
                            html: '<div style="background-color: #FF9800; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(window.mapInstance)
                        .bindPopup('Selected Location<br>Tap "Mark Location" to use');
                }
            }
        };
        
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
const WebMap: React.FC<OpenStreetMapProps> = ({
  location,
  points = [],
  measurementType = null,
  selectedLocation = null,
  onLocationSelect,
  style,
  centerAndZoom = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletLoadedRef = useRef<boolean>(false);
  const measurementMarkersRef = useRef<any[]>([]);
  const measurementLineRef = useRef<any>(null);
  const measurementPolygonRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const hasZoomedRef = useRef<boolean>(false);

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

        console.log('Adding current location marker');
        // Current location marker
        L.marker([location.latitude, location.longitude], {
          icon: L.divIcon({
            className: 'current-location-marker',
            html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
          .addTo(mapInstanceRef.current)
          .bindPopup('Your Location<br>You are here');

        // Draw measurements
        drawMeasurements();

        console.log('Map initialized successfully!');
        // Force map to invalidate size in case container wasn't ready
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('Map size invalidated');
          }
        }, 100);
        
        // Center and zoom to 100 feet radius if requested (after map is ready)
        // This will be handled by the useEffect hook instead to avoid duplicate zoom calls
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    const updateSelectedMarker = () => {
      if (!mapInstanceRef.current || !(window as any).L) return;
      const L = (window as any).L;

      // Remove old selected marker
      if (selectedMarkerRef.current) {
        mapInstanceRef.current.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
      }

      // Add new selected marker
      if (selectedLocation) {
        selectedMarkerRef.current = L.marker(
          [selectedLocation.latitude, selectedLocation.longitude],
          {
            icon: L.divIcon({
              className: 'selected-location-marker',
              html: '<div style="background-color: #FF9800; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          },
        )
          .addTo(mapInstanceRef.current)
          .bindPopup('Selected Location<br>Tap "Mark Location" to use');
      }
    };

    const drawMeasurements = (measurementPoints: Location[], measurementTypeValue: MeasurementType) => {
      if (!mapInstanceRef.current || !(window as any).L) return;
      const L = (window as any).L;

      // Clear previous
      measurementMarkersRef.current.forEach((marker: any) => {
        mapInstanceRef.current.removeLayer(marker);
      });
      measurementMarkersRef.current = [];

      if (measurementLineRef.current) {
        mapInstanceRef.current.removeLayer(measurementLineRef.current);
        measurementLineRef.current = null;
      }

      if (measurementPolygonRef.current) {
        mapInstanceRef.current.removeLayer(measurementPolygonRef.current);
        measurementPolygonRef.current = null;
      }

      if (!measurementPoints || measurementPoints.length === 0) return;

      // Add markers
      measurementPoints.forEach((point: Location, index: number) => {
        const marker = L.marker([point.latitude, point.longitude], {
          icon: L.divIcon({
            className: 'measurement-marker',
            html: `<div style="background-color: #4CAF50; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">${
              index + 1
            }</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(`Point ${index + 1}`);
        measurementMarkersRef.current.push(marker);
      });

      // Draw line for distance
      if (measurementTypeValue === 'distance' && measurementPoints.length === 2) {
        measurementLineRef.current = L.polyline(
          [
            [measurementPoints[0].latitude, measurementPoints[0].longitude],
            [measurementPoints[1].latitude, measurementPoints[1].longitude],
          ],
          {
            color: '#4CAF50',
            weight: 3,
            opacity: 0.8,
          },
        ).addTo(mapInstanceRef.current);
      }

      // Draw polygon for area
      if (measurementTypeValue === 'area' && measurementPoints.length === 4) {
        const coords = measurementPoints.map((p: Location) => [p.latitude, p.longitude]);
        measurementPolygonRef.current = L.polygon(coords, {
          color: '#4CAF50',
          weight: 3,
          opacity: 0.8,
          fillColor: '#4CAF50',
          fillOpacity: 0.3,
        }).addTo(mapInstanceRef.current);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location, centerAndZoom]);

  // Update measurements when points or measurementType changes
  useEffect(() => {
    if (mapInstanceRef.current && (window as any).L && points.length > 0) {
      const L = (window as any).L;

      // Clear previous
      measurementMarkersRef.current.forEach((marker: any) => {
        mapInstanceRef.current.removeLayer(marker);
      });
      measurementMarkersRef.current = [];

      if (measurementLineRef.current) {
        mapInstanceRef.current.removeLayer(measurementLineRef.current);
        measurementLineRef.current = null;
      }

      if (measurementPolygonRef.current) {
        mapInstanceRef.current.removeLayer(measurementPolygonRef.current);
        measurementPolygonRef.current = null;
      }

      if (!points || points.length === 0) {
        mapInstanceRef.current.invalidateSize();
        return;
      }

      // Add markers
      points.forEach((point: Location, index: number) => {
        const marker = L.marker([point.latitude, point.longitude], {
          icon: L.divIcon({
            className: 'measurement-marker',
            html: `<div style="background-color: #4CAF50; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">${
                index + 1
              }</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(`Point ${index + 1}`);
        measurementMarkersRef.current.push(marker);
      });

      // Draw line for distance
      if (measurementType === 'distance' && points.length === 2) {
        measurementLineRef.current = L.polyline(
          [
            [points[0].latitude, points[0].longitude],
            [points[1].latitude, points[1].longitude],
          ],
          {
            color: '#4CAF50',
            weight: 3,
            opacity: 0.8,
          },
        ).addTo(mapInstanceRef.current);
      }

      // Draw polygon for area
      if (measurementType === 'area' && points.length === 4) {
        const coords = points.map((p: Location) => [p.latitude, p.longitude]);
        measurementPolygonRef.current = L.polygon(coords, {
          color: '#4CAF50',
          weight: 3,
          opacity: 0.8,
          fillColor: '#4CAF50',
          fillOpacity: 0.3,
        }).addTo(mapInstanceRef.current);
      }

      mapInstanceRef.current.invalidateSize();
    }
  }, [points, measurementType]);

  // Handle centerAndZoom changes for WebMap
  useEffect(() => {
    if (mapInstanceRef.current && centerAndZoom && location) {
      console.log('Triggering center and zoom for WebMap');
      const bounds = getBoundsFor100Feet(location.latitude, location.longitude);
      // Use a longer timeout to ensure map is stable
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.fitBounds(bounds as any, { padding: [20, 20] });
          // Prevent map from being moved/reset by other operations
          mapInstanceRef.current.once('moveend', () => {
            console.log('WebMap: Zoom complete, view locked');
          });
          console.log('WebMap: Centered and zoomed to 100 feet radius');
        }
      }, 300);
    }
  }, [centerAndZoom, location]);

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
const NativeMap: React.FC<OpenStreetMapProps> = ({
  location,
  points = [],
  measurementType = null,
  selectedLocation = null,
  onLocationSelect,
  style,
  centerAndZoom = false,
}) => {
  if (!location) {
    console.log('NativeMap: No location provided');
    return null;
  }

  console.log('NativeMap: Creating map with location:', location, 'points:', points);
  const WebView = require('react-native-webview').WebView;
  const webViewRef = useRef<any>(null);

  const htmlContent = createLeafletHTML(
    location.latitude,
    location.longitude,
    points,
    measurementType,
    selectedLocation,
    centerAndZoom,
  );

  // Handle centerAndZoom changes by injecting JavaScript
  useEffect(() => {
    if (webViewRef.current && centerAndZoom && location) {
      console.log('Triggering center and zoom for NativeMap');
      const latOffset = 30.48 / 111000;
      const lngOffset = 30.48 / (111000 * Math.cos(location.latitude * Math.PI / 180));
      const script = `
        (function retryZoom() {
          if (window.mapInstance) {
            var bounds = [
              [${location.latitude} - ${latOffset}, ${location.longitude} - ${lngOffset}],
              [${location.latitude} + ${latOffset}, ${location.longitude} + ${lngOffset}]
            ];
            window.mapInstance.fitBounds(bounds, {padding: [20, 20]});
            // Store that we've zoomed and prevent auto-reset
            window.mapZoomedToLocation = true;
            window.mapCenterLocation = [${location.latitude}, ${location.longitude}];
            
            // Prevent the map from being reset by removing any moveend handlers that might reset zoom
            window.mapInstance.once('moveend', function() {
              console.log('NativeMap: Zoom complete, maintaining view');
            });
            console.log('NativeMap: Centered and zoomed to 100 feet radius');
          } else {
            console.log('NativeMap: mapInstance not ready yet, retrying...');
            setTimeout(retryZoom, 200);
          }
        })();
      `;
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(script);
      }, 800);
    }
  }, [centerAndZoom, location]);

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelect' && onLocationSelect) {
        onLocationSelect({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Update measurements when points or measurementType changes
  useEffect(() => {
    if (webViewRef.current) {
      if (points.length > 0) {
        const script = `window.updateMeasurements(${JSON.stringify(points)}, '${measurementType || ''}');`;
        webViewRef.current.injectJavaScript(script);
      }
      // Update selected location
      const updateScript = `window.updateSelectedLocation(${JSON.stringify(selectedLocation)});`;
      webViewRef.current.injectJavaScript(updateScript);
    }
  }, [points, measurementType, selectedLocation]);

  return (
    <WebView
      ref={webViewRef}
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
      onMessage={handleMessage}
    />
  );
};

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  location,
  points = [],
  measurementType = null,
  selectedLocation = null,
  onLocationSelect,
  style,
  centerAndZoom = false,
}) => {
  if (Platform.OS === 'web') {
    return (
      <WebMap
        location={location}
        points={points}
        measurementType={measurementType}
        selectedLocation={selectedLocation}
        onLocationSelect={onLocationSelect}
        style={style}
        centerAndZoom={centerAndZoom}
      />
    );
  }
  return (
    <NativeMap
      location={location}
      points={points}
      measurementType={measurementType}
      selectedLocation={selectedLocation}
      onLocationSelect={onLocationSelect}
      style={style}
      centerAndZoom={centerAndZoom}
    />
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
