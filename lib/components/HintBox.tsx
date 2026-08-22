import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, DimensionValue, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export interface HintItem {
  text: string;
  targetRef?: React.RefObject<any>;
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
  const [isAnimating, setIsAnimating] = useState(false);
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

  const renderArrows = (offsetX: number, offsetY: number) => {
    if (!containerLayout || isAnimating) return null;
    
    return hints.map((hint, index) => {
      if (index !== currentHintIndex) return null;
      if (!hint.targetRef) return null;
      const hLayoutCache = hintsLayouts[index];
      const tLayout = targetsLayouts[index];
      if (!hLayoutCache || !tLayout || !listContainerLayout) return null;

      const hLeft = hLayoutCache.pageX - containerLayout.pageX + offsetX;
      const hRight = hLeft + hLayoutCache.width;
      const hCenter = hLeft + hLayoutCache.width / 2;
      const hCenterY = hLayoutCache.pageY - containerLayout.pageY + (hLayoutCache.height / 2) + offsetY;

      // Hintbox bounds
      const boxLeft = offsetX;
      const boxRight = offsetX + containerLayout.width;

      // Target bounding box logic
      const tLeft = tLayout.pageX - containerLayout.pageX + offsetX;
      const tRight = tLeft + tLayout.width;
      const tCenter = tLeft + tLayout.width / 2;
      const tTop = tLayout.pageY - containerLayout.pageY + offsetY;
      const tBottom = tTop + tLayout.height;
      const tCenterY = tTop + tLayout.height / 2;

      let waypoints: {x: number, y: number}[] = [];
      let destX = 0, destY = 0;
      let finalDirX = 0, finalDirY = 0;

      const PADDING = 24;

      if (tCenter > hCenter) {
        // Target is to the right
        if (tCenter > boxRight + PADDING) {
          // Far enough to the right to clear hintbox edge
          const startX = hRight;
          const startY = hCenterY;
          const isTargetAbove = tCenterY < startY;
          destX = tCenter;
          destY = isTargetAbove ? tBottom + 8 : tTop - 8;
          finalDirX = 0;
          finalDirY = isTargetAbove ? -1 : 1;
          waypoints = [
            { x: startX, y: startY },
            { x: tCenter, y: startY },
            { x: tCenter, y: destY }
          ];
        } else {
          // Not far enough right, route around the left
          const startX = hLeft;
          const startY = hCenterY;
          const midX = boxLeft - PADDING;
          destX = tLeft - 8;
          destY = tCenterY;
          finalDirX = 1;
          finalDirY = 0;
          waypoints = [
            { x: startX, y: startY },
            { x: midX, y: startY },
            { x: midX, y: tCenterY },
            { x: destX, y: destY }
          ];
        }
      } else {
        // Target is to the left
        if (tCenter < boxLeft - PADDING) {
          // Far enough to the left to clear hintbox edge
          const startX = hLeft;
          const startY = hCenterY;
          const isTargetAbove = tCenterY < startY;
          destX = tCenter;
          destY = isTargetAbove ? tBottom + 8 : tTop - 8;
          finalDirX = 0;
          finalDirY = isTargetAbove ? -1 : 1;
          waypoints = [
            { x: startX, y: startY },
            { x: tCenter, y: startY },
            { x: tCenter, y: destY }
          ];
        } else {
          // Not far enough left, route around the right
          const startX = hRight;
          const startY = hCenterY;
          const midX = boxRight + PADDING;
          destX = tRight + 8;
          destY = tCenterY;
          finalDirX = -1;
          finalDirY = 0;
          waypoints = [
            { x: startX, y: startY },
            { x: midX, y: startY },
            { x: midX, y: tCenterY },
            { x: destX, y: destY }
          ];
        }
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

  const scrollToHint = (nextIdx: number) => {
    setIsAnimating(true);
    setCurrentHintIndex(nextIdx);
    scrollViewRef.current?.scrollTo({ x: nextIdx * listWidth, animated: true });
    
    setTimeout(() => {
      const ref = hintRefs.current[nextIdx];
      if (ref) {
        ref.measure((x, y, w, h, pageX, pageY) => {
          if (pageX !== undefined && pageY !== undefined) {
            setHintsLayouts(prev => ({
              ...prev,
              [nextIdx]: { x, y, width: w, height: h, pageX, pageY }
            }));
          }
          setIsAnimating(false);
        });
      } else {
        setIsAnimating(false);
      }
    }, 350);
  };

  return (
    <View ref={containerRef} style={[styles.container, style, { width, height }]} pointerEvents="box-none">
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
                  scrollToHint(currentHintIndex - 1);
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
                  scrollToHint(currentHintIndex + 1);
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
      
      {(() => {
        const offsetX = 100;
        const offsetY = 500;
        const svgWidth = (containerLayout?.width || 0) + 200;
        const svgHeight = (containerLayout?.height || 0) + 600;
        return (
          <View style={[styles.svgOverlay, { top: -offsetY, left: -offsetX, width: svgWidth, height: svgHeight }]} pointerEvents="none">
            <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
              {renderArrows(offsetX, offsetY)}
            </Svg>
          </View>
        );
      })()}
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
