import { useRef, useCallback, useEffect } from "react";

interface UseAudioVisualizationOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onRecordingStop?: (audioBlob: Blob) => void;
}

interface UseAudioVisualizationReturn {
  startVisualization: () => Promise<boolean>;
  stopVisualization: () => void;
  isAnimating: boolean;
}

export const useAudioVisualization = ({
  canvasRef,
  onRecordingStop,
}: UseAudioVisualizationOptions): UseAudioVisualizationReturn => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // Функция для остановки анимации
  const stopAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Очищаем canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext("2d");
      if (canvasCtx) {
        canvasCtx.fillStyle = "#141414";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [canvasRef]);

  // Функция для рисования волны в реальном времени
  const drawRealTimeWave = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) {
      return;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    isAnimatingRef.current = true;

    const draw = () => {
      if (!isAnimatingRef.current) {
        // Очищаем canvas при остановке записи
        canvasCtx.fillStyle = "#141414";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      animationIdRef.current = requestAnimationFrame(draw);

      // Получаем данные времени (лучше для визуализации голоса в реальном времени)
      analyser.getByteTimeDomainData(dataArray);

      // Очищаем канвас
      canvasCtx.fillStyle = "#141414";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Рисуем волну как вертикальные полоски (как в WaveSurfer)
      const barWidth = 4;
      const barGap = 1;
      const totalBars = Math.floor(canvas.width / (barWidth + barGap));
      const step = Math.floor(bufferLength / totalBars);

      let hasAudio = false;

      // Создаем массив высот для интерполяции
      const barHeights: number[] = [];

      // Сначала вычисляем все высоты
      for (let i = 0; i < totalBars; i++) {
        const dataIndex = i * step;
        const value = dataArray[dataIndex];

        // Для временных данных: нормализуем от центра (128)
        const normalizedValue = Math.abs(value - 128) / 128.0;

        if (normalizedValue > 0.01) hasAudio = true;

        // Создаем более чувствительную и выразительную визуализацию
        const baseHeight = 4;
        const amplifiedValue = Math.pow(normalizedValue, 0.7) * 2.5;
        const barHeight = Math.max(
          baseHeight,
          amplifiedValue * canvas.height * 0.8
        );

        barHeights.push(barHeight);
      }

      // Применяем сглаживание к высотам для более плавных переходов
      const smoothedHeights: number[] = [];
      for (let i = 0; i < barHeights.length; i++) {
        let sum = barHeights[i];
        let count = 1;

        // Усредняем с соседними значениями для плавности
        if (i > 0) {
          sum += barHeights[i - 1];
          count++;
        }
        if (i < barHeights.length - 1) {
          sum += barHeights[i + 1];
          count++;
        }

        smoothedHeights.push(sum / count);
      }

      // Теперь рисуем с плавными высотами
      for (let i = 0; i < totalBars; i++) {
        const barHeight = smoothedHeights[i];

        const x = i * (barWidth + barGap);
        const y = (canvas.height - barHeight) / 2;

        // Создаем градиент для красивого эффекта
        const gradient = canvasCtx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "#7C3AED");
        gradient.addColorStop(0.5, "#4F46E5");
        gradient.addColorStop(1, "#3B82F6");

        canvasCtx.fillStyle = gradient;

        // Рисуем закругленный прямоугольник для более плавного вида
        const radius = Math.min(barWidth / 2, 2);
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, barHeight, radius);
        canvasCtx.fill();
      }

      // Можно добавить логирование при обнаружении аудио
      if (hasAudio) {
        // Audio activity detected
      }
    };

    // Начинаем цикл анимации
    draw();
  }, [canvasRef]);

  // Инициализация аудио контекста для визуализации в реальном времени
  const startVisualization = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Создаем MediaRecorder для записи
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        if (onRecordingStop) {
          onRecordingStop(audioBlob);
        }
        audioChunks.length = 0;
      };

      // Начинаем запись
      mediaRecorder.start();

      // Запускаем визуализацию
      drawRealTimeWave();

      return true;
    } catch (error) {
      console.error("Failed to initialize audio visualization:", error);
      return false;
    }
  }, [drawRealTimeWave, onRecordingStop]);

  // Остановка визуализации и записи
  const stopVisualization = useCallback(() => {
    // Останавливаем анимацию
    stopAnimation();

    // Останавливаем запись
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Очищаем ресурсы
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    mediaRecorderRef.current = null;
    analyserRef.current = null;
  }, [stopAnimation]);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      stopVisualization();
    };
  }, [stopVisualization]);

  return {
    startVisualization,
    stopVisualization,
    isAnimating: isAnimatingRef.current,
  };
};
