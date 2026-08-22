import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Defs, ClipPath, Image as SvgImage } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  color?: string;
  style?: StyleProp<ViewStyle>;
  width?: number | string;
}

export function FloralDivider({ color = colors.accent, style, width = '100%' }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Svg height="40" width={width} viewBox="0 0 200 40" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        
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

        <Defs>
          <ClipPath id="logoClip">
            <Circle cx="100" cy="20" r="28" />
          </ClipPath>
        </Defs>

        {/* Center Logo */}
        <SvgImage 
          href={require('../../assets/images/logo.jpg')} 
          x="72" 
          y="-8" 
          width="56" 
          height="56" 
          clipPath="url(#logoClip)"
          preserveAspectRatio="xMidYMid slice"
        />
        
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
