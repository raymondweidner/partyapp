import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, DimensionValue, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export interface HintItem {
  text: string;
  targetRef?: React.RefObject<any>;
  arrowPosition?: 'front' | 'back';
}

export interface HintBoxProps {
  title: string;
  hints: HintItem[];
  style?: StyleProp<ViewStyle>;
  width?: DimensionValue;
  height?: DimensionValue;
  onClose?: () => void;
}

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

export function HintBox({ title, hints, style, width, height, onClose }: HintBoxProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [listWidth, setListWidth] = useState(0);
  
  const containerRef = useRef<View>(null);
  const hintRefs = useRef<Record<number, View | null>>({});
  
  const [containerLayout, setContainerLayout] = useState<LayoutRect | null>(null);
  const [hintsLayouts, setHintsLayouts] = useState<Record<number, LayoutRect>>({});
  const [targetsLayouts, setTargetsLayouts] = useState<Record<number, LayoutRect>>({});
  const [listContainerLayout, setListContainerLayout] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    
    // Poll for layout measurements to catch dynamic rendering of targets
    const interval = setInterval(() => {
      containerRef.current?.measure((x, y, w, h, pageX, pageY) => {
        if (pageX !== undefined && pageY !== undefined) {
          setContainerLayout(prev => {
            if (!prev || Math.abs(prev.pageX - pageX) > 1 || Math.abs(prev.pageY - pageY) > 1 || Math.abs(prev.width - w) > 1 || Math.abs(prev.height - h) > 1) {
              return { x, y, width: w, height: h, pageX, pageY };
            }
            return prev;
          });
        }
      });

      hints.forEach((hint, index) => {
        // Measure hint texts
        if (hintRefs.current[index]) {
          hintRefs.current[index]?.measure((x, y, w, h, pageX, pageY) => {
            if (pageX !== undefined && pageY !== undefined) {
              setHintsLayouts(prev => {
                const current = prev[index];
                if (!current || Math.abs(current.pageX - pageX) > 1 || Math.abs(current.pageY - pageY) > 1 || Math.abs(current.width - w) > 1 || Math.abs(current.height - h) > 1) {
                  return { ...prev, [index]: { x, y, width: w, height: h, pageX, pageY } };
                }
                return prev;
              });
            }
          });
        }
        
        // Measure target components
        if (hint.targetRef?.current) {
          hint.targetRef.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
            if (pageX !== undefined && pageY !== undefined) {
              setTargetsLayouts(prev => {
                const current = prev[index];
                if (!current || Math.abs(current.pageX - pageX) > 1 || Math.abs(current.pageY - pageY) > 1 || Math.abs(current.width - w) > 1 || Math.abs(current.height - h) > 1) {
                  return { ...prev, [index]: { x, y, width: w, height: h, pageX, pageY } };
                }
                return prev;
              });
            }
          });
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible, hints]);

  if (!isVisible) return null;

  const buildRoundedPath = (points: {x: number, y: number}[], radius: number): string => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.abs(dx1) + Math.abs(dy1); // orthogonal distance
      
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.abs(dx2) + Math.abs(dy2);
      
      const r = Math.min(radius, len1 / 2, len2 / 2);
      
      if (r <= 0.1) {
        d += ` L ${curr.x},${curr.y}`;
        continue;
      }
      
      const p1x = curr.x - Math.sign(dx1) * r;
      const p1y = curr.y - Math.sign(dy1) * r;
      const p2x = curr.x + Math.sign(dx2) * r;
      const p2y = curr.y + Math.sign(dy2) * r;
      
      d += ` L ${p1x},${p1y} Q ${curr.x},${curr.y} ${p2x},${p2y}`;
    }
    
    const last = points[points.length - 1];
    d += ` L ${last.x},${last.y}`;
    return d;
  };

  const renderArrows = () => {
    if (!containerLayout) return null;
    
    return hints.map((hint, index) => {
      if (index !== currentHintIndex) return null;
      if (!hint.targetRef) return null;
      const hLayoutCache = hintsLayouts[index];
      const tLayout = targetsLayouts[index];
      if (!hLayoutCache || !tLayout || !listContainerLayout) return null;

      const isFront = hint.arrowPosition === 'front';
      
      const listAbsoluteX = containerLayout.pageX + listContainerLayout.x;
      const listAbsoluteY = containerLayout.pageY + listContainerLayout.y;

      const hPageX = listAbsoluteX + (listContainerLayout.width - hLayoutCache.width) / 2;
      const hPageY = listAbsoluteY + (listContainerLayout.height - hLayoutCache.height) / 2;

      // Starting point logic
      const startX = hPageX - containerLayout.pageX + (isFront ? 0 : hLayoutCache.width) + 1000;
      const startY = hPageY - containerLayout.pageY + (hLayoutCache.height / 2) + 1000;
      
      // Target bounding box logic
      const tLeft = tLayout.pageX - containerLayout.pageX + 1000;
      const tRight = tLeft + tLayout.width;
      const tCenter = tLeft + tLayout.width / 2;
      const tTop = tLayout.pageY - containerLayout.pageY + 1000;
      const tBottom = tTop + tLayout.height;
      const tCenterY = tTop + tLayout.height / 2;

      let waypoints: {x: number, y: number}[] = [{x: startX, y: startY}];

      let destX = 0, destY = 0;
      let finalDirX = 0, finalDirY = 0;

      // 1. If component is vertically aligned (close to the same x-dimension)
      if (Math.abs(tCenter - startX) < (tLayout.width / 2 + 40)) {
        const isTargetAbove = tCenterY < startY;
        destX = tCenter;
        destY = isTargetAbove ? tBottom + 8 : tTop - 8;
        finalDirX = 0;
        finalDirY = isTargetAbove ? -1 : 1;
        
        // Go horizontally straight to tCenter, then vertically to the target.
        // This ensures the vertical line perfectly aligns with the arrowhead.
        waypoints.push({ x: destX, y: startY });
        waypoints.push({ x: destX, y: destY });
      } else {
        // Extend horizontally outside the hintbox by the distance to the edge
        let distToEdge = isFront ? (startX - 1000) : (1000 + containerLayout.width - startX);
        distToEdge = Math.max(distToEdge, 10);
        const midX = isFront ? (1000 - distToEdge / 2) : (1000 + containerLayout.width + distToEdge / 2);

        // 2 & 3. Horizontal routing (Standard or Wrap-around)
        const isTargetRight = tCenter > startX;
        destX = isTargetRight ? tLeft - 8 : tRight + 8;
        destY = tCenterY;
        finalDirX = isTargetRight ? 1 : -1;
        finalDirY = 0;

        waypoints.push({ x: midX, y: startY });
        waypoints.push({ x: midX, y: destY });
        waypoints.push({ x: destX, y: destY });
      }

      let pathStr = buildRoundedPath(waypoints, 15);

      // Arrowhead
      const arrowSize = 10;
      if (finalDirX !== 0) {
        pathStr += ` M ${destX - finalDirX * arrowSize},${destY - arrowSize} L ${destX},${destY} L ${destX - finalDirX * arrowSize},${destY + arrowSize}`;
      } else {
        pathStr += ` M ${destX - arrowSize},${destY - finalDirY * arrowSize} L ${destX},${destY} L ${destX + arrowSize},${destY - finalDirY * arrowSize}`;
      }

      return (
        <Path
          key={index}
          d={pathStr}
          fill="none"
          stroke="#87CEFA"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6, 6"
          strokeOpacity="0.7"
        />
      );
    });
  };

  return (
    <View ref={containerRef} style={[styles.container, style, { width, height }]} pointerEvents="box-none">
      <Svg style={styles.svgOverlay} pointerEvents="none" viewBox="0 0 3000 3000">
        {renderArrows()}
      </Svg>

      <BlurView intensity={20} tint="light" style={styles.blurContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View 
          style={styles.hintsListContainer}
          onLayout={(e) => {
            setListWidth(e.nativeEvent.layout.width);
            setListContainerLayout(e.nativeEvent.layout);
          }}
        >
          {listWidth > 0 ? (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={{ width: listWidth }}
            >
              {hints.map((hint, index) => (
                <View key={index} style={[styles.hintRow, { width: listWidth }]}>
                  <View 
                    style={styles.hintTextWrapper}
                    ref={(el) => { hintRefs.current[index] = el; }}
                    collapsable={false}
                  >
                    <Text style={styles.text}>{hint.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ opacity: 0 }}>
               <Text style={styles.text}>{hints[0]?.text || ' '}</Text>
            </View>
          )}
        </View>

        {hints.length > 1 && (
          <Text style={styles.progressText}>
            {currentHintIndex + 1} of {hints.length}
          </Text>
        )}

        <View style={[styles.footer, hints.length > 1 ? { justifyContent: 'space-between' } : { justifyContent: 'center' }]}>
          {hints.length > 1 && (
            <TouchableOpacity 
              onPress={() => {
                if (currentHintIndex > 0) {
                  const nextIdx = currentHintIndex - 1;
                  setCurrentHintIndex(nextIdx);
                  scrollViewRef.current?.scrollTo({ x: nextIdx * listWidth, animated: true });
                }
              }}
              style={[styles.iconButton, currentHintIndex === 0 && { opacity: 0 }]}
              disabled={currentHintIndex === 0}
            >
              <Ionicons name="play-back" size={24} color="#87CEFA" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.gotItButton}
            onPress={() => {
              setIsVisible(false);
              onClose?.();
            }}
          >
            <Text style={styles.gotItText}>Got it!</Text>
          </TouchableOpacity>

          {hints.length > 1 && (
            <TouchableOpacity 
              onPress={() => {
                if (currentHintIndex < hints.length - 1) {
                  const nextIdx = currentHintIndex + 1;
                  setCurrentHintIndex(nextIdx);
                  scrollViewRef.current?.scrollTo({ x: nextIdx * listWidth, animated: true });
                }
              }}
              style={[styles.iconButton, currentHintIndex === hints.length - 1 && { opacity: 0 }]}
              disabled={currentHintIndex === hints.length - 1}
            >
              <Ionicons name="play-forward" size={24} color="#87CEFA" />
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    overflow: 'visible',
  },
  svgOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 3000,
    height: 3000,
    zIndex: 1001,
  },
  blurContainer: {
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(100, 149, 237, 0.3)', 
    borderStyle: 'dashed',
    overflow: 'visible',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Extremely translucent
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  title: {
    fontFamily: "Lobster_400Regular",
    fontSize: 22,
    color: '#a85c69',
    textAlign: 'center',
    flex: 1,
  },
  hintsListContainer: {
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    color: '#87CEFA',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'Nunito_400Regular',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  iconButton: {
    padding: 8,
  },
  gotItButton: {
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#87CEFA',
  },
  gotItText: {
    color: '#a85c69',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Nunito_600SemiBold',
  },
  hintsList: {
    gap: 12,
  },
  hintRow: {
    overflow: 'visible',
    paddingVertical: 4,
    alignItems: 'center',
  },
  hintTextWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#87CEFA',
    borderStyle: 'dashed',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 14,
    color: '#a85c69',
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  }
});
