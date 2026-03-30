import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PreparedAvatarUpload {
  file: File;
  previewUrl: string;
}

interface AvatarFormatCandidate {
  mimeType: 'image/webp' | 'image/jpeg' | 'image/png';
  quality?: number;
}

const AVATAR_BUCKET = 'avatars';
const DEFAULT_AVATAR_URL = 'assets/avatars/default-profile.png';
const MAX_AVATAR_SIZE_BYTES = 400 * 1024;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DIMENSION_CANDIDATES = [256, 192, 128];
const STORAGE_FILE_BASENAME = 'avatar';
const FORMAT_CANDIDATES: AvatarFormatCandidate[] = [
  { mimeType: 'image/webp', quality: 0.9 },
  { mimeType: 'image/webp', quality: 0.8 },
  { mimeType: 'image/webp', quality: 0.7 },
  { mimeType: 'image/jpeg', quality: 0.85 },
  { mimeType: 'image/jpeg', quality: 0.72 },
  { mimeType: 'image/png' }
];

@Injectable({ providedIn: 'root' })
export class AvatarService {
  readonly defaultAvatarUrl = DEFAULT_AVATAR_URL;
  readonly maxAvatarSizeBytes = MAX_AVATAR_SIZE_BYTES;

  constructor(private supabase: SupabaseService) {}

  resolveAvatarUrl(avatarUrl?: string | null): string {
    return avatarUrl?.trim() || this.defaultAvatarUrl;
  }

  revokePreviewUrl(url?: string | null): void {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  async prepareAvatarUpload(file: File): Promise<PreparedAvatarUpload> {
    this.validateFileType(file);

    const image = await this.loadImage(file);
    const optimizedBlob = await this.optimizeImage(image);

    if (optimizedBlob.size > this.maxAvatarSizeBytes) {
      throw new Error('No se pudo optimizar la imagen por debajo de 400 KB.');
    }

    const preparedFile = new File([optimizedBlob], `avatar.${this.getExtension(optimizedBlob.type)}`, {
      type: optimizedBlob.type
    });

    return {
      file: preparedFile,
      previewUrl: URL.createObjectURL(preparedFile)
    };
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const storagePath = this.buildStoragePath(userId, file.type);

    await this.removeExistingAvatarVariants(userId);

    const { error } = await this.supabase.client.storage.from(AVATAR_BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true
    });

    if (error) {
      throw new Error(error.message || 'No se pudo subir la foto de perfil.');
    }

    const { data } = this.supabase.client.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  private validateFileType(file: File): void {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      throw new Error('Formato no valido. Usa JPG, JPEG, PNG o WEBP.');
    }
  }

  private async removeExistingAvatarVariants(userId: string): Promise<void> {
    const candidatePaths = [
      `${userId}/${STORAGE_FILE_BASENAME}.webp`,
      `${userId}/${STORAGE_FILE_BASENAME}.jpg`,
      `${userId}/${STORAGE_FILE_BASENAME}.png`
    ];

    await this.supabase.client.storage.from(AVATAR_BUCKET).remove(candidatePaths);
  }

  private buildStoragePath(userId: string, mimeType: string): string {
    return `${userId}/${STORAGE_FILE_BASENAME}.${this.getExtension(mimeType)}`;
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
        element.src = objectUrl;
      });

      return image;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private async optimizeImage(image: HTMLImageElement): Promise<Blob> {
    let smallestBlob: Blob | null = null;

    for (const dimension of DIMENSION_CANDIDATES) {
      const canvas = this.drawSquareAvatar(image, dimension);

      for (const format of FORMAT_CANDIDATES) {
        const blob = await this.canvasToBlob(canvas, format.mimeType, format.quality);
        if (!blob) continue;

        if (!smallestBlob || blob.size < smallestBlob.size) {
          smallestBlob = blob;
        }

        if (blob.size <= this.maxAvatarSizeBytes) {
          return blob;
        }
      }
    }

    if (!smallestBlob) {
      throw new Error('No se pudo procesar la imagen seleccionada.');
    }

    return smallestBlob;
  }

  private drawSquareAvatar(image: HTMLImageElement, size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo preparar la imagen.');
    }

    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max((image.naturalWidth - cropSize) / 2, 0);
    const sourceY = Math.max((image.naturalHeight - cropSize) / 2, 0);

    context.clearRect(0, 0, size, size);
    context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);

    return canvas;
  }

  private canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
  }

  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/webp':
        return 'webp';
      case 'image/png':
        return 'png';
      default:
        return 'jpg';
    }
  }
}
