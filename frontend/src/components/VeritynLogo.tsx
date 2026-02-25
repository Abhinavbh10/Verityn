import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface VeritynLogoProps {
  size?: number;
  color?: string;
}

export default function VeritynLogo({ size = 48, color }: VeritynLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3B82F6" />
            <Stop offset="50%" stopColor="#8B5CF6" />
            <Stop offset="100%" stopColor="#06B6D4" />
          </LinearGradient>
        </Defs>
        
        {/* Outer circle - represents global/European coverage */}
        <Circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="none" 
          stroke="url(#logoGradient)" 
          strokeWidth="3"
        />
        
        {/* Inner V shape - represents Verityn and checkmark/verification */}
        <Path
          d="M30 35 L50 70 L70 35"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* News lines - representing news feeds */}
        <Path
          d="M25 25 L40 25"
          fill="none"
          stroke={color || "#3B82F6"}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
        <Path
          d="M60 25 L75 25"
          fill="none"
          stroke={color || "#06B6D4"}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
        
        {/* Dot accent - truth/verification point */}
        <Circle 
          cx="50" 
          cy="20" 
          r="4" 
          fill="url(#logoGradient)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
