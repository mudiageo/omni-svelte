/**
 * Omni Storage - File storage abstraction
 *
 * Provides a unified API for file storage with support for
 * multiple backends (local filesystem, S3, Cloudflare R2, etc.)
 */

// Types
export interface StorageConfig {
	driver: 'local' | 's3' | 'r2' | 'gcs';
	defaultDisk?: string;
	disks?: Record<string, DiskConfig>;
}

export interface DiskConfig {
	driver: 'local' | 's3' | 'r2' | 'gcs';
	root?: string; // Local filesystem root
	bucket?: string; // S3/R2/GCS bucket name
	region?: string;
	endpoint?: string;
	credentials?: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	publicUrl?: string; // Base URL for public file access
}

export interface StoredFile {
	path: string;
	url: string;
	size: number;
	contentType: string;
	lastModified: Date;
}

export interface UploadOptions {
	disk?: string;
	directory?: string;
	filename?: string;
	contentType?: string;
	public?: boolean;
}

let storageConfig: StorageConfig = {
	driver: 'local',
	defaultDisk: 'local',
	disks: {
		local: {
			driver: 'local',
			root: './storage',
			publicUrl: '/storage'
		}
	}
};

/**
 * Configure the storage system
 */
export function configureStorage(config: StorageConfig): void {
	storageConfig = { ...storageConfig, ...config };
}

/**
 * Store a file
 */
export async function store(
	file: File | Buffer | string,
	options: UploadOptions = {}
): Promise<StoredFile> {
	const disk = options.disk || storageConfig.defaultDisk || 'local';

	// TODO: Implement actual storage drivers
	console.log(`📁 [Storage] Storing file to disk '${disk}'`);
	console.warn(`📁 [Storage] Driver not yet implemented. File not stored.`);

	return {
		path: `${options.directory || 'uploads'}/${options.filename || `file-${Date.now()}`}`,
		url: '#',
		size: 0,
		contentType: options.contentType || 'application/octet-stream',
		lastModified: new Date()
	};
}

/**
 * Get a file from storage
 */
export async function retrieve(path: string, disk?: string): Promise<Buffer | null> {
	const diskName = disk || storageConfig.defaultDisk || 'local';
	console.warn(`📁 [Storage] Retrieve not yet implemented for disk '${diskName}'.`);
	return null;
}

/**
 * Delete a file from storage
 */
export async function destroy(path: string, disk?: string): Promise<boolean> {
	const diskName = disk || storageConfig.defaultDisk || 'local';
	console.warn(`📁 [Storage] Delete not yet implemented for disk '${diskName}'.`);
	return false;
}

/**
 * Check if a file exists in storage
 */
export async function exists(path: string, disk?: string): Promise<boolean> {
	const diskName = disk || storageConfig.defaultDisk || 'local';
	console.warn(`📁 [Storage] Exists not yet implemented for disk '${diskName}'.`);
	return false;
}

/**
 * Get a temporary URL for a file (signed URL for private files)
 */
export async function temporaryUrl(
	path: string,
	expiresIn: number = 3600,
	disk?: string
): Promise<string> {
	const diskName = disk || storageConfig.defaultDisk || 'local';
	console.warn(`📁 [Storage] Temporary URL not yet implemented for disk '${diskName}'.`);
	return '#';
}

/**
 * Get the public URL of a file
 */
export function url(path: string, disk?: string): string {
	const diskName = disk || storageConfig.defaultDisk || 'local';
	const diskConfig = storageConfig.disks?.[diskName];
	const baseUrl = diskConfig?.publicUrl || '/storage';
	return `${baseUrl}/${path}`;
}
