/**
 * Omni Notifications - Multi-channel notification system
 *
 * Provides a unified API for sending notifications across
 * multiple channels (email, SMS, push, in-app, etc.)
 */

// Types
export interface NotificationConfig {
	channels: NotificationChannel[];
	defaultChannel?: string;
}

export interface NotificationChannel {
	name: string;
	driver: 'mail' | 'sms' | 'push' | 'database' | 'slack' | 'webhook';
	config?: Record<string, any>;
}

export interface Notification {
	id?: string;
	type: string;
	channels: string[];
	data: Record<string, any>;
	readAt?: Date;
	createdAt?: Date;
}

export interface NotificationRecipient {
	id: string;
	email?: string;
	phone?: string;
	pushTokens?: string[];
}

export interface Notifiable {
	routeNotificationFor(channel: string): string | string[] | null;
}

// Notification store (in-memory for now)
const notifications: Notification[] = [];
const channelHandlers = new Map<
	string,
	(notification: Notification, recipient: NotificationRecipient) => Promise<void>
>();

let notificationConfig: NotificationConfig = {
	channels: [{ name: 'database', driver: 'database' }],
	defaultChannel: 'database'
};

/**
 * Configure the notification system
 */
export function configureNotifications(config: NotificationConfig): void {
	notificationConfig = { ...notificationConfig, ...config };
}

/**
 * Register a channel handler
 */
export function registerChannel(
	name: string,
	handler: (notification: Notification, recipient: NotificationRecipient) => Promise<void>
): void {
	channelHandlers.set(name, handler);
}

/**
 * Send a notification to a recipient
 */
export async function notify(
	recipient: NotificationRecipient,
	notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<Notification> {
	const fullNotification: Notification = {
		...notification,
		id: crypto.randomUUID(),
		createdAt: new Date()
	};

	// Store notification
	notifications.push(fullNotification);

	// Dispatch to each channel
	for (const channel of notification.channels) {
		const handler = channelHandlers.get(channel);
		if (handler) {
			try {
				await handler(fullNotification, recipient);
			} catch (error) {
				console.error(`🔔 [Notifications] Failed to send via '${channel}':`, error);
			}
		} else {
			console.warn(
				`🔔 [Notifications] No handler for channel '${channel}'. Notification stored but not delivered.`
			);
		}
	}

	return fullNotification;
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
	userId: string,
	options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
	// TODO: Implement database-backed notification retrieval
	console.warn(`🔔 [Notifications] Database retrieval not yet implemented.`);
	return notifications
		.filter((n) => {
			if (options.unreadOnly && n.readAt) return false;
			return true;
		})
		.slice(0, options.limit || 50);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
	const notification = notifications.find((n) => n.id === notificationId);
	if (notification) {
		notification.readAt = new Date();
	}
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
	// TODO: Filter by userId when backed by database
	notifications.forEach((n) => {
		if (!n.readAt) n.readAt = new Date();
	});
}

/**
 * Get unread notification count
 */
export async function unreadCount(userId: string): Promise<number> {
	return notifications.filter((n) => !n.readAt).length;
}
