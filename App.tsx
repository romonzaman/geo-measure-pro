/**
 * React Native App with OpenStreetMap and Measurement Tools
 *
 * @format
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import {OpenStreetMap} from './components/OpenStreetMap';
import {SettingsIcon} from './components/SettingsIcon';
import {loadLogs, saveLogs, clearLogs} from './utils/storage';

interface Location {
  latitude: number;
  longitude: number;
}

type MeasurementType = 'distance' | 'area' | null;

type DistanceUnit = 'ft' | 'm' | 'mi' | 'km';
type AreaUnit = 'sqft' | 'sqm' | 'acre' | 'hectare' | 'sqmi' | 'sqkm';

interface MeasurementLog {
  id: string;
  type: 'distance' | 'area';
  value: number;
  points: Location[];
  timestamp: Date;
  unit: DistanceUnit | AreaUnit; // Store the unit used when logging
}

function App(): React.JSX.Element {
  const [location, setLocation] = useState<Location | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [measurementType, setMeasurementType] = useState<MeasurementType>(null);
  const [points, setPoints] = useState<Location[]>([]);
  const [measurement, setMeasurement] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [measurementLogs, setMeasurementLogs] = useState<MeasurementLog[]>([]);
  const lastLoggedMeasurementRef = useRef<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('ft');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('sqft');
  const [centerAndZoom, setCenterAndZoom] = useState<boolean>(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    // Calculate measurement when points change
    if (measurementType === 'distance' && points.length === 2) {
      const dist = calculateDistance(points[0], points[1]);
      setMeasurement(dist);
      
      // Add to log when measurement is complete (only once per measurement)
      const logKey = `distance-${points[0].latitude}-${points[0].longitude}-${points[1].latitude}-${points[1].longitude}`;
      if (lastLoggedMeasurementRef.current !== logKey) {
        const logEntry: MeasurementLog = {
          id: Date.now().toString(),
          type: 'distance',
          value: dist,
          points: [...points],
          timestamp: new Date(),
          unit: distanceUnit,
        };
        setMeasurementLogs(prev => [logEntry, ...prev]);
        lastLoggedMeasurementRef.current = logKey;
      }
    } else if (measurementType === 'area' && points.length === 4) {
      const area = calculateArea(points);
      setMeasurement(area);
      
      // Add to log when measurement is complete (only once per measurement)
      const logKey = `area-${points.map(p => `${p.latitude}-${p.longitude}`).join('-')}`;
      if (lastLoggedMeasurementRef.current !== logKey) {
        const logEntry: MeasurementLog = {
          id: Date.now().toString(),
          type: 'area',
          value: area,
          points: [...points],
          timestamp: new Date(),
          unit: areaUnit,
        };
        setMeasurementLogs(prev => {
          const newLogs = [logEntry, ...prev];
          // Save to storage asynchronously
          saveLogsToStorage(newLogs);
          return newLogs;
        });
        lastLoggedMeasurementRef.current = logKey;
      }
    } else if (points.length === 0) {
      setMeasurement(null);
    } else {
      // Recalculate measurement if points changed but not complete yet
      if (measurementType === 'distance' && points.length < 2) {
        setMeasurement(null);
      } else if (measurementType === 'area' && points.length < 4) {
        setMeasurement(null);
      }
    }
  }, [points, measurementType]);

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
      setHasPermission(true);
      getCurrentLocation();
    } else {
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
        // Trigger center and zoom when location is first loaded
        // Use a small delay to ensure map is ready
        setTimeout(() => {
          setCenterAndZoom(true);
          // Don't reset immediately - let the zoom persist
          setTimeout(() => setCenterAndZoom(false), 2000);
        }, 500);
      },
      error => {
        console.error('Error getting location:', error);
        let errorMessage = 'Could not get your location.';

        if (error.code === 1) {
          errorMessage = 'Location permission denied. Please enable location access in settings.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable. Please check your location settings.';
        } else if (error.code === 3) {
          errorMessage = 'Location request timed out. Please try again or enable location services.';
        }

        if (Platform.OS === 'web') {
          // eslint-disable-next-line no-undef
          if (typeof globalThis !== 'undefined' && (globalThis as any).alert) {
            // eslint-disable-next-line no-undef
            (globalThis as any).alert(errorMessage);
          }
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

  // Calculate distance between two points in the selected unit
  const calculateDistance = (point1: Location, point2: Location): number => {
    const R_FEET = 20903520; // Earth's radius in feet
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceFeet = R_FEET * c;
    
    // Convert to selected unit
    switch (distanceUnit) {
      case 'm':
        return distanceFeet * 0.3048; // feet to meters
      case 'mi':
        return distanceFeet / 5280; // feet to miles
      case 'km':
        return (distanceFeet * 0.3048) / 1000; // feet to meters to kilometers
      case 'ft':
      default:
        return distanceFeet;
    }
  };

  // Calculate area of polygon in the selected unit
  const calculateArea = (polygonPoints: Location[]): number => {
    if (polygonPoints.length < 3) return 0;

    // Use shoelace formula for polygon area
    let area = 0;
    const R_FEET = 20903520; // Earth's radius in feet

    for (let i = 0; i < polygonPoints.length; i++) {
      const j = (i + 1) % polygonPoints.length;
      const lat1 = (polygonPoints[i].latitude * Math.PI) / 180;
      const lon1 = (polygonPoints[i].longitude * Math.PI) / 180;
      const lat2 = (polygonPoints[j].latitude * Math.PI) / 180;
      const lon2 = (polygonPoints[j].longitude * Math.PI) / 180;

      const x1 = R_FEET * Math.cos(lat1) * Math.cos(lon1);
      const y1 = R_FEET * Math.cos(lat1) * Math.sin(lon1);
      const x2 = R_FEET * Math.cos(lat2) * Math.cos(lon2);
      const y2 = R_FEET * Math.cos(lat2) * Math.sin(lon2);

      area += x1 * y2 - x2 * y1;
    }

    const areaSqFeet = Math.abs(area / 2);
    
    // Convert to selected unit
    switch (areaUnit) {
      case 'sqm':
        return areaSqFeet * 0.092903; // square feet to square meters
      case 'acre':
        return areaSqFeet / 43560; // square feet to acres
      case 'hectare':
        return (areaSqFeet * 0.092903) / 10000; // square feet to square meters to hectares
      case 'sqmi':
        return areaSqFeet / 27878400; // square feet to square miles
      case 'sqkm':
        return (areaSqFeet * 0.092903) / 1000000; // square feet to square meters to square kilometers
      case 'sqft':
      default:
        return areaSqFeet;
    }
  };
  
  // Get unit label for display
  const getDistanceUnitLabel = (): string => {
    return getDistanceUnitLabelForUnit(distanceUnit);
  };
  
  const getDistanceUnitLabelForUnit = (unit: DistanceUnit): string => {
    switch (unit) {
      case 'ft': return 'ft';
      case 'm': return 'm';
      case 'mi': return 'mi';
      case 'km': return 'km';
      default: return 'ft';
    }
  };
  
  const getAreaUnitLabel = (): string => {
    return getAreaUnitLabelForUnit(areaUnit);
  };
  
  const getAreaUnitLabelForUnit = (unit: AreaUnit): string => {
    switch (unit) {
      case 'sqft': return 'sqft';
      case 'sqm': return 'm?';
      case 'acre': return 'acre';
      case 'hectare': return 'hectare';
      case 'sqmi': return 'mi?';
      case 'sqkm': return 'km?';
      default: return 'sqft';
    }
  };

  const handleMeasurementTypeSelect = (type: MeasurementType) => {
    setMeasurementType(type);
    setPoints([]);
    setMeasurement(null);
  };

  const handleMarkLocation = () => {
    // Use selected location if available, otherwise use current GPS location
    const locationToMark = selectedLocation || location;

    if (!locationToMark) {
      Alert.alert('Error', 'No location available. Please select a location on the map or wait for GPS.');
      return;
    }

    if (measurementType === null) {
      Alert.alert('Select Type', 'Please select Distance or Area measurement type first');
      return;
    }

    // If measurement is already complete, don't allow adding more points
    if (measurementType === 'distance' && points.length >= 2) {
      Alert.alert('Measurement Complete', 'Distance measurement is complete. Use Clear to start a new measurement.');
      return;
    }

    if (measurementType === 'area' && points.length >= 4) {
      Alert.alert('Measurement Complete', 'Area measurement is complete. Use Clear to start a new measurement.');
      return;
    }

    setPoints([...points, {...locationToMark}]);
    setSelectedLocation(null); // Clear selection after marking
  };

  const handleMapLocationSelect = (selectedLoc: Location) => {
    setSelectedLocation(selectedLoc);
  };

  const saveLogsToStorage = async (logs: MeasurementLog[]) => {
    try {
      // Convert Date objects to ISO strings for storage
      const logsForStorage = logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      }));
      await saveLogs(logsForStorage);
    } catch (error) {
      console.error('Error saving logs to storage:', error);
    }
  };

  const handleClear = () => {
    setMeasurementType(null);
    setPoints([]);
    setMeasurement(null);
    setSelectedLocation(null);
    lastLoggedMeasurementRef.current = null; // Reset logged measurement tracker
    // Note: We keep the logs even after clearing
    // Trigger center and zoom when clear is pressed
    if (location) {
      // Use a unique trigger by toggling the state
      setCenterAndZoom(false); // Reset first
      // Then set to true after a tiny delay to trigger the useEffect
      setTimeout(() => {
        setCenterAndZoom(true);
        // Don't reset immediately - let the zoom persist
        // The zoom will maintain even after the flag resets
        setTimeout(() => setCenterAndZoom(false), 2000);
      }, 50);
    }
  };

  const handleClearLogs = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all measurement history? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMeasurementLogs([]);
            await clearLogs();
          },
        },
      ],
    );
  };

  const getRequiredPoints = (): number => {
    if (measurementType === 'distance') return 2;
    if (measurementType === 'area') return 4;
    return 0;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Section - 20% */}
      <View style={styles.topSection}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>GPS Measurement Pro</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}>
            <SettingsIcon size={22} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.measureButton,
              measurementType === 'distance' && styles.measureButtonActive,
            ]}
            onPress={() => handleMeasurementTypeSelect('distance')}>
            <Text
              style={[
                styles.measureButtonText,
                measurementType === 'distance' && styles.measureButtonTextActive,
              ]}>
              Distance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.measureButton,
              measurementType === 'area' && styles.measureButtonActive,
            ]}
            onPress={() => handleMeasurementTypeSelect('area')}>
            <Text
              style={[
                styles.measureButtonText,
                measurementType === 'area' && styles.measureButtonTextActive,
              ]}>
              Area
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Middle Section - 50% Map */}
      <View style={styles.mapSection}>
        {location ? (
          <OpenStreetMap
            location={location}
            points={points}
            measurementType={measurementType}
            selectedLocation={selectedLocation}
            onLocationSelect={handleMapLocationSelect}
            style={styles.map}
            centerAndZoom={centerAndZoom}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Bottom Section - 30% */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.markButton,
            ((!location && !selectedLocation) || loading || measurementType === null) && styles.markButtonDisabled,
          ]}
          onPress={handleMarkLocation}
          disabled={(!location && !selectedLocation) || loading || measurementType === null}>
          <Text style={styles.markButtonText}>Mark Location</Text>
        </TouchableOpacity>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={true}>
          
          {/* Current Measurement Info */}
          {measurementType !== null && (
            <View style={styles.currentMeasurementContainer}>
              <Text style={styles.sectionTitle}>Current Measurement</Text>
              <Text style={styles.pointsText}>
                Points: {points.length}/{getRequiredPoints()}
              </Text>
              {selectedLocation && (
                <Text style={styles.selectedText}>
                  Location selected on map ?
                </Text>
              )}
              {measurement !== null && (
                <Text style={styles.resultText}>
                  {measurementType === 'distance'
                    ? `Distance: ${measurement.toFixed(2)} ft`
                    : `Area: ${measurement.toFixed(2)} sqft`}
                </Text>
              )}
              {points.length < getRequiredPoints() && (
                <Text style={styles.hintText}>
                  {selectedLocation 
                    ? 'Tap "Mark Location" to add this point'
                    : `Tap on map to select location, or mark current GPS location`}
                </Text>
              )}
            </View>
          )}

          {/* Measurement Logs */}
          {measurementLogs.length > 0 && (
            <View style={styles.logsContainer}>
              <View style={styles.logsHeader}>
                <Text style={styles.logsHeaderTitle}>Measurement History</Text>
                <TouchableOpacity
                  style={styles.clearLogsButton}
                  onPress={handleClearLogs}>
                  <Text style={styles.clearLogsButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {measurementLogs.map((log) => (
                <View key={log.id} style={styles.logEntry}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logType}>
                      {log.type === 'distance' ? '?? Distance' : '?? Area'}
                    </Text>
                    <Text style={styles.logTimestamp}>
                      {log.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.logValue}>
                    {log.type === 'distance'
                      ? `${log.value.toFixed(2)} ${getDistanceUnitLabelForUnit(log.unit as DistanceUnit)}`
                      : `${log.value.toFixed(2)} ${getAreaUnitLabelForUnit(log.unit as AreaUnit)}`}
                  </Text>
                  <Text style={styles.logPoints}>
                    {log.points.length} point{log.points.length > 1 ? 's' : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {measurementType === null && measurementLogs.length === 0 && (
            <Text style={styles.infoText}>Select Distance or Area to start measuring</Text>
          )}
        </ScrollView>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSettings(false)}>
                <Text style={styles.modalCloseText}>?</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsContent}>
              {/* Distance Unit Selection */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Distance Unit</Text>
                {(['ft', 'm', 'mi', 'km'] as DistanceUnit[]).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      distanceUnit === unit && styles.unitOptionActive,
                    ]}
                    onPress={() => setDistanceUnit(unit)}>
                    <Text
                      style={[
                        styles.unitOptionText,
                        distanceUnit === unit && styles.unitOptionTextActive,
                      ]}>
                      {unit === 'ft'
                        ? 'Feet (ft)'
                        : unit === 'm'
                        ? 'Meters (m)'
                        : unit === 'mi'
                        ? 'Miles (mi)'
                        : 'Kilometers (km)'}
                    </Text>
                    {distanceUnit === unit && (
                      <Text style={styles.unitOptionCheck}>?</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Area Unit Selection */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Area Unit</Text>
                {(['sqft', 'sqm', 'acre', 'hectare', 'sqmi', 'sqkm'] as AreaUnit[]).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      areaUnit === unit && styles.unitOptionActive,
                    ]}
                    onPress={() => setAreaUnit(unit)}>
                    <Text
                      style={[
                        styles.unitOptionText,
                        areaUnit === unit && styles.unitOptionTextActive,
                      ]}>
                      {unit === 'sqft'
                        ? 'Square Feet (sqft)'
                        : unit === 'sqm'
                        ? 'Square Meters (m?)'
                        : unit === 'acre'
                        ? 'Acres (acre)'
                        : unit === 'hectare'
                        ? 'Hectares (hectare)'
                        : unit === 'sqmi'
                        ? 'Square Miles (mi?)'
                        : 'Square Kilometers (km?)'}
                    </Text>
                    {areaUnit === unit && (
                      <Text style={styles.unitOptionCheck}>?</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topSection: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  measureButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  measureButtonActive: {
    backgroundColor: '#4CAF50',
  },
  measureButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  measureButtonTextActive: {
    color: '#fff',
  },
  clearButton: {
    backgroundColor: '#f44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mapSection: {
    flex: 1,
    width: '100%',
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
  bottomSection: {
    height: '40%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  markButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  markButtonDisabled: {
    backgroundColor: '#ccc',
  },
  markButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 10,
  },
  currentMeasurementContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  logsContainer: {
    marginTop: 5,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logsHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  clearLogsButton: {
    backgroundColor: '#f44336',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  clearLogsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logEntry: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  logType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  logValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  logPoints: {
    fontSize: 12,
    color: '#666',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  selectedText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 4,
  },
  loadingContainer: {
    position: 'absolute',
    top: '25%',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  settingsContent: {
    padding: 20,
  },
  settingsSection: {
    marginBottom: 30,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  unitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitOptionActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  unitOptionText: {
    fontSize: 15,
    color: '#666',
  },
  unitOptionTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  unitOptionCheck: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

export default App;
