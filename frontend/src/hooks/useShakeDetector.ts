import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';

interface UseShakeDetectorOptions {
  onShake: () => void;
  threshold?: number;
  timeout?: number;
}

export const useShakeDetector = ({ 
  onShake, 
  threshold = 1.5,  // Acceleration threshold to detect shake
  timeout = 1000    // Minimum time between shake events (ms)
}: UseShakeDetectorOptions) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const lastShakeTime = useRef(0);
  const subscription = useRef<any>(null);

  useEffect(() => {
    // Shake detection doesn't work well on web
    if (Platform.OS === 'web') {
      return;
    }

    if (!isEnabled) {
      return;
    }

    const startListening = async () => {
      try {
        // Set update interval
        Accelerometer.setUpdateInterval(100);

        subscription.current = Accelerometer.addListener(({ x, y, z }) => {
          const acceleration = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          // Check if acceleration exceeds threshold and cooldown has passed
          if (acceleration > threshold && now - lastShakeTime.current > timeout) {
            lastShakeTime.current = now;
            onShake();
          }
        });
      } catch (error) {
        console.error('Error starting accelerometer:', error);
      }
    };

    startListening();

    return () => {
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
    };
  }, [isEnabled, onShake, threshold, timeout]);

  return { isEnabled, setIsEnabled };
};
