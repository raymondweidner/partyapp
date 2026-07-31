import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  color?: string;
  style?: StyleProp<ViewStyle>;
  width?: number | string;
}

export function FloralDivider({ color = colors.accent, style, width = '100%' }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Svg height="40" width={width} viewBox="0 0 200 40" preserveAspectRatio="xMidYMid meet">
        
        {/* Left Curling Vine (tapering filled path) */}
        <Path 
          d="M35,21 C20,30 5,20 15,10 C35,0 60,20 90,20 C60,18 40,5 20,13 C12,19 25,27 35,21 Z" 
          fill={color} 
        />
        
        {/* Right Curling Vine (Mirrored) */}
        <Path 
          d="M35,21 C20,30 5,20 15,10 C35,0 60,20 90,20 C60,18 40,5 20,13 C12,19 25,27 35,21 Z" 
          fill={color} 
          transform="translate(200, 0) scale(-1, 1)"
        />

        {/* Center Tree Motif */}
        {/* Stem */}
        <Path d="M100,31 L100,12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Top Leaf */}
        <Path d="M100,7 C103,10 103,13 100,15 C97,13 97,10 100,7 Z" fill={color} />
        
        {/* Top Left Leaf */}
        <Path d="M99.5,18 C95,18 91,15 91,11 C95,13.5 98,16 99.5,18 Z" fill={color} />
        
        {/* Top Right Leaf */}
        <Path d="M100.5,18 C105,18 109,15 109,11 C105,13.5 102,16 100.5,18 Z" fill={color} />
        
        {/* Bottom Left Leaf */}
        <Path d="M99.5,25 C95,25 92,22 92,18 C95,20.5 98,23 99.5,25 Z" fill={color} />
        
        {/* Bottom Right Leaf */}
        <Path d="M100.5,25 C105,25 108,22 108,18 C105,20.5 102,23 100.5,25 Z" fill={color} />
        
        {/* Base Dot */}
        <Circle cx="100" cy="34" r="1.5" fill={color} />
        
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    width: '100%',
  },
});
