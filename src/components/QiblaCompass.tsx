import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Colors } from '../constants/colors';

interface QiblaCompassProps {
  size: number;
  compassHeading: number;
  qiblaDirection: number;
  isAligned: boolean;
  isCalibrated: boolean;
}

const QiblaCompass: React.FC<QiblaCompassProps> = ({
  size,
  compassHeading,
  qiblaDirection,
  isAligned,
  isCalibrated,
}) => {
  const center = size / 2;
  const outerRadius = size / 2 - 10;
  const innerRadius = outerRadius - 20;
  const needleLength = outerRadius - 30;

  // Calculate relative qibla direction (relative to compass heading)
  const relativeQiblaDirection = qiblaDirection - compassHeading;

  // Convert to radians for calculations
  const qiblaRadians = (relativeQiblaDirection * Math.PI) / 180;
  const northRadians = (-compassHeading * Math.PI) / 180;

  // Calculate needle positions
  const qiblaNeedleX = center + Math.sin(qiblaRadians) * needleLength;
  const qiblaNeedleY = center - Math.cos(qiblaRadians) * needleLength;

  const northNeedleX = center + Math.sin(northRadians) * (needleLength - 20);
  const northNeedleY = center - Math.cos(northRadians) * (needleLength - 20);

  // Compass markings (cardinal directions)
  const getCardinalMarkings = () => {
    const markings = [];
    const directions = ['N', 'E', 'S', 'W'];
    
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 - compassHeading) * Math.PI / 180;
      const x = center + Math.sin(angle) * (outerRadius - 5);
      const y = center - Math.cos(angle) * (outerRadius - 5);
      
      markings.push(
        <SvgText
          key={`direction-${i}`}
          x={x}
          y={y + 5}
          fontSize="16"
          fontWeight="bold"
          fill={i === 0 ? Colors.error : Colors.darkGray}
          textAnchor="middle"
        >
          {directions[i]}
        </SvgText>
      );
    }
    
    return markings;
  };

  // Degree markings
  const getDegreeMarkings = () => {
    const markings = [];
    
    for (let i = 0; i < 36; i++) {
      const angle = (i * 10 - compassHeading) * Math.PI / 180;
      const isMainMark = i % 3 === 0; // Every 30 degrees
      
      const outerX = center + Math.sin(angle) * outerRadius;
      const outerY = center - Math.cos(angle) * outerRadius;
      const innerX = center + Math.sin(angle) * (outerRadius - (isMainMark ? 15 : 8));
      const innerY = center - Math.cos(angle) * (outerRadius - (isMainMark ? 15 : 8));
      
      markings.push(
        <Line
          key={`mark-${i}`}
          x1={outerX}
          y1={outerY}
          x2={innerX}
          y2={innerY}
          stroke={Colors.darkGray}
          strokeWidth={isMainMark ? 2 : 1}
        />
      );
      
      // Add degree numbers for main marks
      if (isMainMark && i % 9 !== 0) { // Skip cardinal directions
        const textX = center + Math.sin(angle) * (outerRadius - 25);
        const textY = center - Math.cos(angle) * (outerRadius - 25);
        
        markings.push(
          <SvgText
            key={`degree-${i}`}
            x={textX}
            y={textY + 4}
            fontSize="12"
            fill={Colors.darkGray}
            textAnchor="middle"
          >
            {i * 10}
          </SvgText>
        );
      }
    }
    
    return markings;
  };

  return (
    <View style={styles.container}>
      <Svg height={size} width={size}>
        <Defs>
          <RadialGradient id="compassGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={Colors.white} stopOpacity="1" />
            <Stop offset="100%" stopColor={Colors.lightGray} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        
        {/* Outer Ring */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="url(#compassGradient)"
          stroke={isCalibrated ? Colors.primary : Colors.warning}
          strokeWidth={4}
        />
        
        {/* Inner Ring */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke={Colors.lightGray}
          strokeWidth={1}
        />
        
        {/* Degree Markings */}
        <G>{getDegreeMarkings()}</G>
        
        {/* Cardinal Direction Labels */}
        <G>{getCardinalMarkings()}</G>
        
        {/* Qibla Direction Needle (Green Arrow) */}
        <G>
          <Polygon
            points={`${center},${center - 10} ${center + 8},${center + 5} ${center},${center} ${center - 8},${center + 5}`}
            fill={isAligned ? Colors.success : Colors.primary}
            stroke={Colors.white}
            strokeWidth={2}
            transform={`rotate(${relativeQiblaDirection} ${center} ${center})`}
          />
          
          {/* Qibla direction line */}
          <Line
            x1={center}
            y1={center}
            x2={qiblaNeedleX}
            y2={qiblaNeedleY}
            stroke={isAligned ? Colors.success : Colors.primary}
            strokeWidth={3}
            strokeDasharray="5,5"
          />
        </G>
        
        {/* North Needle (Red) */}
        <G>
          <Polygon
            points={`${center},${center - 8} ${center + 6},${center + 4} ${center},${center} ${center - 6},${center + 4}`}
            fill={Colors.error}
            stroke={Colors.white}
            strokeWidth={1}
            transform={`rotate(${-compassHeading} ${center} ${center})`}
          />
        </G>
        
        {/* Center Dot */}
        <Circle
          cx={center}
          cy={center}
          r={6}
          fill={Colors.text}
          stroke={Colors.white}
          strokeWidth={2}
        />
        
        {/* Kaaba Symbol at Qibla Direction */}
        <G transform={`translate(${qiblaNeedleX - 8}, ${qiblaNeedleY - 8})`}>
          <Circle
            cx={8}
            cy={8}
            r={12}
            fill={isAligned ? Colors.success : Colors.primary}
            opacity={0.9}
          />
          <SvgText
            x={8}
            y={12}
            fontSize="12"
            fontWeight="bold"
            fill={Colors.white}
            textAnchor="middle"
          >
            ﷽
          </SvgText>
        </G>
      </Svg>
      
      {/* Status Overlay */}
      {!isCalibrated && (
        <View style={styles.calibrationOverlay}>
          <Icon name="warning" size={32} color={Colors.warning} />
          <Text style={styles.calibrationText}>Kalibrasyon Gerekli</Text>
        </View>
      )}
      
      {/* Alignment Feedback */}
      {isAligned && (
        <View style={styles.alignedOverlay}>
          <Icon name="check-circle" size={48} color={Colors.success} />
          <Text style={styles.alignedText}>Kıble Yönü</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calibrationOverlay: {
    position: 'absolute',
    top: '25%',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  calibrationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
    marginTop: 4,
  },
  alignedOverlay: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 50,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alignedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 4,
  },
});

export default QiblaCompass;
