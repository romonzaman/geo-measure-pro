/**
 * Settings Icon Component
 * Uses react-native-vector-icons FontAwesome for native platforms
 * Falls back to a custom SVG-like view for web
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface SettingsIconProps {
  size?: number;
  color?: string;
}

export const SettingsIcon: React.FC<SettingsIconProps> = ({ 
  size = 22, 
  color = '#666' 
}) => {
  // For native platforms, try to use FontAwesome
  if (Platform.OS !== 'web') {
    try {
      const Icon = require('react-native-vector-icons/FontAwesome').default;
      return <Icon name="cog" size={size} color={color} />;
    } catch (e) {
      // Fallback if icon library not properly linked
      return <CustomGearIcon size={size} color={color} />;
    }
  }

  // For web, use custom drawn gear icon
  return <CustomGearIcon size={size} color={color} />;
};

// Custom gear icon drawn using View components (works on all platforms including web)
// Simplified version that uses a circle with border and inner circle to represent a gear
const CustomGearIcon: React.FC<SettingsIconProps> = ({ size = 22, color = '#666' }) => {
  const center = size / 2;
  const outerRadius = size * 0.4;
  const innerRadius = size * 0.25;
  const borderWidth = Math.max(2, size * 0.08);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer gear circle with border */}
      <View style={[styles.outerCircle, { 
        width: outerRadius * 2, 
        height: outerRadius * 2, 
        borderRadius: outerRadius,
        borderWidth: borderWidth,
        borderColor: color,
        top: center - outerRadius,
        left: center - outerRadius,
      }]} />
      
      {/* Inner circle */}
      <View style={[styles.innerCircle, {
        width: innerRadius * 2,
        height: innerRadius * 2,
        borderRadius: innerRadius,
        backgroundColor: color,
        top: center - innerRadius,
        left: center - innerRadius,
      }]} />
      
      {/* Top tooth */}
      <View style={[styles.tooth, {
        width: borderWidth * 1.5,
        height: outerRadius * 0.4,
        backgroundColor: color,
        top: center - outerRadius - outerRadius * 0.4,
        left: center - borderWidth * 0.75,
      }]} />
      
      {/* Bottom tooth */}
      <View style={[styles.tooth, {
        width: borderWidth * 1.5,
        height: outerRadius * 0.4,
        backgroundColor: color,
        top: center + outerRadius,
        left: center - borderWidth * 0.75,
      }]} />
      
      {/* Left tooth */}
      <View style={[styles.tooth, {
        width: outerRadius * 0.4,
        height: borderWidth * 1.5,
        backgroundColor: color,
        top: center - borderWidth * 0.75,
        left: center - outerRadius - outerRadius * 0.4,
      }]} />
      
      {/* Right tooth */}
      <View style={[styles.tooth, {
        width: outerRadius * 0.4,
        height: borderWidth * 1.5,
        backgroundColor: color,
        top: center - borderWidth * 0.75,
        left: center + outerRadius,
      }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  innerCircle: {
    position: 'absolute',
  },
  tooth: {
    position: 'absolute',
    borderRadius: 1,
  },
});
