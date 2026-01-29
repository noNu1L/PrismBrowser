import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type DownloadState = 'progressing' | 'completed' | 'cancelled' | 'interrupted';

export interface DownloadItem {
  id: string; // Use file path or a unique ID from main process
  fileName: string;
  url: string;
  savePath: string;
  state: DownloadState;
  receivedBytes: number;
  totalBytes: number;
  startTime: number;
}

export const useDownloadsStore = defineStore('downloads', () => {
  const downloads = ref<DownloadItem[]>([]);

  // For UI development, add some sample data
  if (process.env.NODE_ENV === 'development' && downloads.value.length === 0) {
    downloads.value.push(
      { id: '1', fileName: 'file1.zip', url: '', savePath: '', state: 'completed', receivedBytes: 5242880, totalBytes: 5242880, startTime: Date.now() - 10000 },
      { id: '2', fileName: 'document.pdf', url: '', savePath: '', state: 'progressing', receivedBytes: 2097152, totalBytes: 10485760, startTime: Date.now() - 5000 },
      { id: '3', fileName: 'image.jpg', url: '', savePath: '', state: 'cancelled', receivedBytes: 102400, totalBytes: 204800, startTime: Date.now() - 20000 },
    );
  }

  const addOrUpdateDownload = (item: DownloadItem) => {
    const existingIndex = downloads.value.findIndex(d => d.id === item.id);
    if (existingIndex !== -1) {
      downloads.value[existingIndex] = { ...downloads.value[existingIndex], ...item };
    } else {
      downloads.value.unshift(item);
    }
  };

  const clearDownloads = () => {
    downloads.value = downloads.value.filter(d => d.state === 'progressing');
  };

  const downloadsInProgress = computed(() => downloads.value.filter(d => d.state === 'progressing'));
  const completedDownloads = computed(() => downloads.value.filter(d => d.state !== 'progressing'));

  return {
    downloads,
    addOrUpdateDownload,
    clearDownloads,
    downloadsInProgress,
    completedDownloads,
  };
}); 