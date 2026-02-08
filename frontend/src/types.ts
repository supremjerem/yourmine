export type DownloadStatusType =
  | 'queued'
  | 'processing'
  | 'extracting'
  | 'downloading'
  | 'converting'
  | 'completed'
  | 'failed'

export type AudioFormat = 'mp3' | 'wav'

export type ViewMode = 'current' | 'history'

export type DownloadMode = 'single' | 'batch'

export type ToastType = 'success' | 'error' | 'info'

export interface DownloadProgress {
  status?: string
  percent?: string
  speed?: string
  eta?: string
  message?: string
}

export interface Download {
  id: string
  status: DownloadStatusType
  url: string
  format: AudioFormat
  title?: string
  filename?: string
  error?: string
  progress?: DownloadProgress
  created_at?: string
}

export interface Toast {
  message: string
  type: ToastType
}
