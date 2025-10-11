import { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import "./VoiceRecorder.css";

interface VoiceRecorderProps {
  onAudioRecorded: (audio: Blob) => void;
  onVoiceCloned: (cloned: boolean) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioRecorded,
  onVoiceCloned,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const waveformRef = useRef<HTMLDivElement>(null);
  const realtimeCanvasRef = useRef<HTMLCanvasElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const timerRef = useRef<number | null>(null);

  // Для работы с реальным временем
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
  }, []);

  // Функция для рисования волны в реальном времени
  const drawRealTimeWave = useCallback(() => {
    if (!analyserRef.current || !realtimeCanvasRef.current) {
      console.log("Analyser or canvas not available");
      return;
    }

    const canvas = realtimeCanvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) {
      console.log("Canvas context not available");
      return;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    console.log("Starting animation loop...");
    isAnimatingRef.current = true;

    const draw = () => {
      if (!isAnimatingRef.current) {
        // Очищаем canvas при остановке записи
        canvasCtx.fillStyle = "#141414";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        console.log("Animation stopped");
        return;
      }

      animationIdRef.current = requestAnimationFrame(draw);

      // Получаем данные времени (лучше для визуализации голоса в реальном времени)
      analyser.getByteTimeDomainData(dataArray);

      // Очищаем канвас
      canvasCtx.fillStyle = "#141414";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Рисуем волну как вертикальные полоски (как в WaveSurfer)
      const barWidth = 4; // Увеличиваем ширину полосок
      const barGap = 1;
      const totalBars = Math.floor(canvas.width / (barWidth + barGap));
      const step = Math.floor(bufferLength / totalBars);

      let barsDrawn = 0;
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
        // Уменьшаем базовую линию и увеличиваем чувствительность к звуку
        const baseHeight = 4; // Уменьшенная базовая линия
        const amplifiedValue = Math.pow(normalizedValue, 0.7) * 2.5; // Увеличиваем чувствительность
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
        const radius = Math.min(barWidth / 2, 2); // Радиус закругления
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, barHeight, radius);
        canvasCtx.fill();

        barsDrawn++;
      }

      // Логируем только если есть изменения в аудио
      if (hasAudio) {
        console.log(`Audio detected - Drew ${barsDrawn} bars`);
      }
    };

    // Начинаем цикл анимации
    draw();
  }, []);

  // Инициализация аудио контекста для визуализации в реальном времени
  const initRealtimeVisualization = useCallback(async () => {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("Microphone access granted");
      streamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Увеличиваем для большей детализации
      analyser.smoothingTimeConstant = 0.8; // Увеличиваем сглаживание для более плавной визуализации
      analyser.minDecibels = -90; // Увеличиваем чувствительность к тихим звукам
      analyser.maxDecibels = -10; // Расширяем динамический диапазон
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      console.log("Audio context and analyser created");

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
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onAudioRecorded(audioBlob);
        audioChunks.length = 0;
      };

      console.log("MediaRecorder initialized");
      return true;
    } catch (error) {
      console.error("Ошибка при инициализации визуализации:", error);
      return false;
    }
  }, [onAudioRecorded]);

  useEffect(() => {
    // Cleanup при размонтировании компонента
    return () => {
      stopAnimation();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stopAnimation]);

  // Настройка canvas размеров
  useEffect(() => {
    if (realtimeCanvasRef.current) {
      const canvas = realtimeCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      console.log(`Canvas size set to: ${canvas.width}x${canvas.height}`);
    }
  }, []);

  useEffect(() => {
    // Инициализация WaveSurfer для воспроизведения записанного аудио
    if (waveformRef.current && audioURL) {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#4F46E5",
        progressColor: "#7C3AED",
        cursorColor: "#EC4899",
        barWidth: 3,
        barRadius: 3,
        height: 80,
        normalize: true,
      });

      wavesurferRef.current.load(audioURL);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioURL]);

  const startRecording = async () => {
    console.log("Attempting to start recording...");

    try {
      // Инициализируем визуализацию в реальном времени
      const initialized = await initRealtimeVisualization();
      if (!initialized) {
        alert("Не удалось инициализировать визуализацию");
        return;
      }

      console.log("Visualization initialized successfully");

      // Начинаем запись с MediaRecorder
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingTime(0);

        console.log("Starting real-time visualization...");
        // Запускаем визуализацию
        drawRealTimeWave();

        // Таймер записи (максимум 60 секунд)
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            if (prev >= 60) {
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);

        console.log("Recording started with real-time visualization");
      }
    } catch (error) {
      console.error("Ошибка при записи:", error);
      alert("Не удалось получить доступ к микрофону: " + error);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");

    // Останавливаем анимацию
    stopAnimation();

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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

    console.log("Recording stopped and resources cleaned up");
  };

  const playRecording = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-recorder">
      <div className="app-header">
        <div className="app-icon">🎙️</div>
        <h1 className="app-title">VoiceClone</h1>
      </div>

      <div className="app-main">
        <div className="recording-interface">
          <div className="record-button-wrapper">
            <button
              className={`record-button ${isRecording ? "recording" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              🎙️
            </button>
            <p className="record-status">
              {isRecording ? "Recording..." : "Start recording"}
            </p>
          </div>

          <div
            className={`audio-visualizer ${isRecording ? "visible" : "hidden"}`}
          >
            <canvas
              ref={realtimeCanvasRef}
              className="realtime-waveform"
              width={800}
              height={120}
              style={{
                width: "100%",
                height: "120px",
                backgroundColor: "#141414",
                borderRadius: "8px",
                border: "1px solid #333",
              }}
            />
            {isRecording && (
              <div className="recording-timer">
                {formatTime(recordingTime)} / 1:00
              </div>
            )}
          </div>
        </div>

        {audioURL && !isRecording && (
          <div className="audio-result">
            <div className="result-info">
              <p>Recorded audio ready for playback</p>
            </div>

            <div className="result-actions">
              <button onClick={playRecording} className="action-button primary">
                ▶️ Play Recording
              </button>
            </div>

            <div className="waveform-container">
              <div ref={waveformRef} className="waveform"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
