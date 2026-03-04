/**
 * Omni Events - Event system
 * 
 * Provides a type-safe event bus for decoupled communication
 * between application components
 */

// Types
export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export interface EventSubscription {
    event: string;
    handler: EventHandler;
    once: boolean;
    unsubscribe: () => void;
}

// Event registry
const listeners = new Map<string, Set<{ handler: EventHandler; once: boolean }>>();

/**
 * Register an event listener
 */
export function on<T = any>(event: string, handler: EventHandler<T>): EventSubscription {
    if (!listeners.has(event)) {
        listeners.set(event, new Set());
    }

    const entry = { handler: handler as EventHandler, once: false };
    listeners.get(event)!.add(entry);

    const subscription: EventSubscription = {
        event,
        handler: handler as EventHandler,
        once: false,
        unsubscribe: () => {
            listeners.get(event)?.delete(entry);
        },
    };

    return subscription;
}

/**
 * Register a one-time event listener
 */
export function once<T = any>(event: string, handler: EventHandler<T>): EventSubscription {
    if (!listeners.has(event)) {
        listeners.set(event, new Set());
    }

    const entry = { handler: handler as EventHandler, once: true };
    listeners.get(event)!.add(entry);

    return {
        event,
        handler: handler as EventHandler,
        once: true,
        unsubscribe: () => {
            listeners.get(event)?.delete(entry);
        },
    };
}

/**
 * Emit an event
 */
export async function emit<T = any>(event: string, payload?: T): Promise<void> {
    const eventListeners = listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) return;

    const toRemove: typeof eventListeners extends Set<infer U> ? U[] : never[] = [];

    for (const entry of eventListeners) {
        try {
            await entry.handler(payload);
        } catch (error) {
            console.error(`⚡ [Events] Error in handler for '${event}':`, error);
        }

        if (entry.once) {
            toRemove.push(entry);
        }
    }

    // Clean up one-time listeners
    for (const entry of toRemove) {
        eventListeners.delete(entry);
    }
}

/**
 * Remove all listeners for an event (or all events)
 */
export function off(event?: string): void {
    if (event) {
        listeners.delete(event);
    } else {
        listeners.clear();
    }
}

/**
 * Get the number of listeners for an event
 */
export function listenerCount(event: string): number {
    return listeners.get(event)?.size || 0;
}

/**
 * Get all registered event names
 */
export function eventNames(): string[] {
    return Array.from(listeners.keys());
}
