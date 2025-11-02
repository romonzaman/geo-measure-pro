/**
 * React Native App with OpenStreetMap and Current Location
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import {OpenStreetMap} from './components/OpenStreetMap';

interface Location {
  latitude: number;
  longitude: number;
}

function App(): React.JSX.Element {
  const [location, setLocation] = useState<Location | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show it on the map',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          getCurrentLocation();
        } else {
          Alert.alert('Permission denied', 'Location permission is required');
          setLoading(false);
        }
      } catch (err) {
        console.warn(err);
        setLoading(false);
      }
    } else if (Platform.OS === 'web') {
      // Web - browser handles permission natively via Geolocation API
      setHasPermission(true);
      getCurrentLocation();
    } else {
      // iOS - permissions are handled in Info.plist
      setHasPermission(true);
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        console.log('Location received:', position.coords);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      error => {
        console.error('Error getting location:', error);
        let errorMessage = 'Could not get your location.';
        
        if (error.code === 1) {
          // PERMISSION_DENIED
          errorMessage = 'Location permission denied. Please enable location access in settings.';
        } else if (error.code === 2) {
          // POSITION_UNAVAILABLE
          errorMessage = 'Location unavailable. Please check your location settings.';
        } else if (error.code === 3) {
          // TIMEOUT
          errorMessage = 'Location request timed out. Please try again or enable location services.';
        }
        
        if (Platform.OS === 'web') {
          alert(errorMessage);
        } else {
          Alert.alert('Location Error', errorMessage);
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {location && (
        <OpenStreetMap location={location} style={styles.map} />
      )}
      {!location && (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Loading map...</Text>
        </View>
      )}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}
      {location && !loading && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Lat: {location.latitude.toFixed(6)}
          </Text>
          <Text style={styles.infoText}>
            Lng: {location.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666666',
  },
  loadingContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginVertical: 2,
  },
});

export default App;
