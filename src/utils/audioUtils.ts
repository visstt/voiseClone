// Утилиты для работы с аудио

/**
 * Конвертирует audio blob в MP3 формат (симуляция)
 * В реальном приложении здесь должна быть настоящая конвертация
 */
export const convertToMp3 = async (audioBlob: Blob): Promise<Blob> => {
  // Симуляция конвертации
  return new Promise((resolve) => {
    setTimeout(() => {
      // Возвращаем blob с изменённым типом (в реальности нужна библиотека для конвертации)
      const mp3Blob = new Blob([audioBlob], { type: "audio/mp3" });
      resolve(mp3Blob);
    }, 1000);
  });
};

/**
 * Сохраняет аудио файл на устройство
 */
export const downloadAudio = (
  audioBlob: Blob,
  filename: string = "voice-recording.mp3"
) => {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Проверяет поддержку MediaRecorder API
 */
export const isMediaRecorderSupported = (): boolean => {
  return (
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia
  );
};

/**
 * Получает поддерживаемые MIME типы для записи
 */
export const getSupportedMimeTypes = (): string[] => {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
  ];

  return types.filter((type) => MediaRecorder.isTypeSupported(type));
};

/**
 * Форматирует время в формате MM:SS
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Создаёт audiо контекст для анализа звука
 */
export const createAudioContext = (): AudioContext | null => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    return new AudioContextClass();
  } catch (error) {
    console.error("AudioContext не поддерживается:", error);
    return null;
  }
};

/**
 * Симуляция отправки аудио в API для клонирования голоса
 */
 
export const cloneVoice = async (
  audioBlob: Blob
): Promise<{ success: boolean; voiceId?: string }> => {
  return new Promise((resolve) => {
    // Симуляция запроса к API
    setTimeout(() => {
      resolve({
        success: Math.random() > 0.1, // 90% успеха
        voiceId: `voice_${Date.now()}`,
      });
    }, 2000);
  });
};

/**
 * Симуляция генерации речи с клонированным голосом
 */
 
export const generateSpeech = async (
  text: string,
  voiceId: string
): Promise<Blob> => {
  return new Promise((resolve) => {
    // Симуляция генерации речи
    setTimeout(() => {
      // Возвращаем пустой аудио блоб (в реальности это был бы синтезированный голос)
      const audioBlob = new Blob([], { type: "audio/mp3" });
      resolve(audioBlob);
    }, Math.max(1000, text.length * 50));
  });
};
