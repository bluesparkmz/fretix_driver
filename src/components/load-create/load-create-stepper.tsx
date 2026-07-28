import { StyleSheet, Text, View } from 'react-native';

import { FretixColors } from '@/constants/theme';

import { LOAD_CREATE_STEPS } from './types';

type LoadCreateStepperProps = {
  currentStep: number;
};

const STEP_LAYOUT = [
  { align: 'flex-start' as const, textAlign: 'left' as const },
  { align: 'center' as const, textAlign: 'center' as const },
  { align: 'flex-end' as const, textAlign: 'right' as const },
];

export function LoadCreateStepper({ currentStep }: LoadCreateStepperProps) {
  const progressRatio = (currentStep - 1) / (LOAD_CREATE_STEPS.length - 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.circlesTrack}>
        <View style={styles.connectorTrack}>
          <View style={styles.connectorBase} />
          <View style={[styles.connectorProgress, { width: `${progressRatio * 100}%` }]} />
        </View>

        <View style={styles.circlesRow}>
          {LOAD_CREATE_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            const isHighlighted = isActive || isCompleted;

            return (
              <View
                key={step.key}
                style={[
                  styles.circle,
                  isHighlighted && styles.circleActive,
                  isActive && styles.circleCurrent,
                ]}>
                <Text
                  style={[
                    styles.circleText,
                    isCompleted && styles.circleTextCompleted,
                    isActive && styles.circleTextActive,
                  ]}>
                  {stepNumber}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.labelsRow}>
        {LOAD_CREATE_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const layout = STEP_LAYOUT[index];

          return (
            <View key={step.key} style={[styles.labelCol, { alignItems: layout.align }]}>
              <Text
                style={[
                  styles.label,
                  { textAlign: layout.textAlign },
                  isActive && styles.labelActive,
                ]}
                numberOfLines={2}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CIRCLE_SIZE = 32;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
  },
  circlesTrack: {
    width: '100%',
    height: CIRCLE_SIZE,
    justifyContent: 'center',
  },
  connectorTrack: {
    position: 'absolute',
    left: CIRCLE_SIZE / 2,
    right: CIRCLE_SIZE / 2,
    top: CIRCLE_SIZE / 2 - 1,
    height: 2,
  },
  connectorBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#3D4654',
  },
  connectorProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 2,
    backgroundColor: FretixColors.yellow,
  },
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: '#3D4654',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111723',
    zIndex: 1,
  },
  circleActive: {
    borderColor: FretixColors.yellow,
    backgroundColor: '#2A2410',
  },
  circleCurrent: {
    backgroundColor: FretixColors.yellow,
    borderColor: FretixColors.yellow,
  },
  circleText: {
    color: '#8D949E',
    fontSize: 13,
    fontWeight: '700',
  },
  circleTextCompleted: {
    color: FretixColors.yellow,
  },
  circleTextActive: {
    color: '#101217',
  },
  labelsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  labelCol: {
    flex: 1,
  },
  label: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
  labelActive: {
    color: FretixColors.yellow,
  },
});
