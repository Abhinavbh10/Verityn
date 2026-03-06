// Simple event emitter for tab refresh events
type RefreshCallback = () => void;

const listeners: { [key: string]: RefreshCallback[] } = {};

export const TabRefreshEvents = {
  // Subscribe to refresh events for a specific tab
  subscribe: (tabName: string, callback: RefreshCallback) => {
    if (!listeners[tabName]) {
      listeners[tabName] = [];
    }
    listeners[tabName].push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = listeners[tabName].indexOf(callback);
      if (index > -1) {
        listeners[tabName].splice(index, 1);
      }
    };
  },

  // Emit refresh event for a specific tab
  emit: (tabName: string) => {
    if (listeners[tabName]) {
      listeners[tabName].forEach(callback => callback());
    }
  },
};
