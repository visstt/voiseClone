# Voice API Hooks

Кастомные React хуки для работы с API голосового клонирования и аудио визуализацией.

## Хуки для работы с API

### useUploadAudio

Хук для загрузки аудио файлов на сервер.

**Возвращает:**

- `uploadAudio(audioBlob: Blob)` - функция для загрузки аудио, возвращает ID загруженного файла
- `isUploading` - статус загрузки
- `error` - ошибка загрузки

**Пример использования:**

```typescript
const { uploadAudio, isUploading, error } = useUploadAudio();
м;

const handleUpload = async (blob: Blob) => {
  const audioId = await uploadAudio(blob);
  if (audioId) {
    console.log("Uploaded with ID:", audioId);
  }
};
```

### useAudioStatus

Хук для отслеживания статуса обработки аудио.

**Возвращает:**

- `pollAudioStatus(id: number, onComplete?: callback)` - функция для проверки статуса
- `isProcessing` - идет ли обработка
- `error` - ошибка обработки

**Пример использования:**

```typescript
const { pollAudioStatus, isProcessing, error } = useAudioStatus();

pollAudioStatus(audioId, (data) => {
  console.log("Processing completed:", data);
  // Выполнить действия после завершения
});
```

### useChatResponses

Хук для загрузки голосовых ответов чата.

**Возвращает:**

- `loadChatResponses(voiceId: string)` - функция для загрузки ответов
- `clearResponses()` - функция для очистки ответов
- `setLoadingState(loading: boolean)` - установка состояния загрузки вручную
- `isLoadingResponses` - статус загрузки
- `chatResponses` - массив ответов
- `error` - ошибка загрузки

**Пример использования:**

```typescript
const {
  loadChatResponses,
  chatResponses,
  isLoadingResponses,
  setLoadingState,
} = useChatResponses();

// Установить состояние загрузки перед началом
setLoadingState(true);

await loadChatResponses(voiceId);
console.log("Responses:", chatResponses);
```

### useAudioPlayer

Хук для воспроизведения аудио ответов с возможностью остановки.

**Возвращает:**

- `playChatResponse(responseId: number, audioUrl: string)` - функция для воспроизведения/остановки
- `stopPlaying()` - остановить воспроизведение
- `currentlyPlaying` - ID текущего воспроизводимого ответа
- `error` - ошибка воспроизведения

**Особенности:**

- При повторном клике на играющее аудио - оно останавливается
- При клике на другую кнопку - предыдущее аудио останавливается автоматически
- Fallback через fetch для случаев с CORS

**Пример использования:**

```typescript
const { playChatResponse, currentlyPlaying, stopPlaying } = useAudioPlayer();

const handlePlay = (id: number, url: string) => {
  playChatResponse(id, url); // Воспроизведение или остановка при повторном клике
};
```

## Хуки для визуализации

### useAudioVisualization

Хук для real-time визуализации аудио волн во время записи.

**Параметры:**

```typescript
{
  canvasRef: React.RefObject<HTMLCanvasElement | null>; // Ссылка на canvas элемент
  onRecordingStop?: (audioBlob: Blob) => void; // Callback при остановке записи
}
```

**Возвращает:**

- `startVisualization()` - начать запись и визуализацию (возвращает Promise<boolean>)
- `stopVisualization()` - остановить запись и визуализацию
- `isAnimating` - идет ли анимация визуализации

**Особенности:**

- Автоматически запрашивает доступ к микрофону
- Создает MediaRecorder для записи
- Рисует real-time волны с градиентами
- Применяет сглаживание для плавной визуализации
- Автоматически очищает ресурсы при размонтировании

**Пример использования:**

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);

const handleRecordingStop = useCallback((audioBlob: Blob) => {
  const url = URL.createObjectURL(audioBlob);
  setAudioURL(url);
}, []);

const { startVisualization, stopVisualization } = useAudioVisualization({
  canvasRef,
  onRecordingStop: handleRecordingStop,
});

// Начать запись
const handleStart = async () => {
  const success = await startVisualization();
  if (success) {
    setIsRecording(true);
  }
};

// Остановить запись
const handleStop = () => {
  stopVisualization();
  setIsRecording(false);
};
```

## Структура данных

### ClonedAudioData

```typescript
{
  id: number;
  originalUrl: string;
  clonedUrl?: string;
  voiceId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

### ChatResponse

```typescript
{
  id: number;
  question: string;
  audioUrl: string;
}
```

## API Endpoints

- `POST /audio/upload` - загрузка аудио файла
- `GET /audio/status/:id` - проверка статуса обработки
- `GET /audio/chat-responses?voiceId=:id` - получение голосовых ответов

## Визуализация

Хук `useAudioVisualization` использует:

- **Web Audio API** - для анализа аудио в реальном времени
- **Canvas API** - для отрисовки волн
- **MediaRecorder API** - для записи аудио
- **AnalyserNode** - настроен с fftSize: 2048, smoothingTimeConstant: 0.8
- **Градиенты** - #7C3AED → #4F46E5 → #3B82F6 для красивой визуализации
