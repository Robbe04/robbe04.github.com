/**
 * Notifications Service
 * Handles push notification registration and delivery
 */
class NotificationsService {
    constructor() {
        this.swRegistration = null;
        this.isSubscribed = false;
    }

    /**
     * Initialize notifications service
     */
    async init() {
        // Check if service workers and push messaging are supported
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                // Register service worker
                this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered successfully');
                
                // Check if already subscribed
                this.updateSubscriptionStatus();
                
                // Setup periodic background sync if supported
                if ('periodicSync' in this.swRegistration) {
                    const status = await navigator.permissions.query({
                        name: 'periodic-background-sync',
                    });
                    
                    if (status.state === 'granted') {
                        await this.swRegistration.periodicSync.register('check-new-releases', {
                            minInterval: 24 * 60 * 60 * 1000, // Once a day
                        });
                        console.log('Periodic background sync registered');
                    }
                }
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'CHECK_RELEASES') {
                        app.checkNewReleases(true); // true = background check
                    }
                });
                
                return true;
            } catch (error) {
                console.error('Service Worker Error:', error);
                return false;
            }
        } else {
            console.warn('Push messaging is not supported');
            return false;
        }
    }

    /**
     * Check if the user is already subscribed
     */
    async updateSubscriptionStatus() {
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            this.isSubscribed = subscription !== null;
            return this.isSubscribed;
        } catch (error) {
            console.error('Error checking subscription:', error);
            return false;
        }
    }

    /**
     * Subscribe user to push notifications
     */
    async subscribe() {
        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }
            
            // Subscribe to push notifications
            // In a real application, you would need a backend server for VAPID keys
            // This is a placeholder for demonstration purposes
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
                )
            };
            
            const subscription = await this.swRegistration.pushManager.subscribe(subscribeOptions);
            this.isSubscribed = true;
            
            // Send subscription to your server
            // In a real application, you would send this subscription object to your backend
            console.log('User is subscribed:', subscription);
            
            // Save subscription to localStorage (temporary solution)
            localStorage.setItem('pushSubscription', JSON.stringify(subscription));
            
            return true;
        } catch (error) {
            console.error('Failed to subscribe the user:', error);
            return false;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                this.isSubscribed = false;
                localStorage.removeItem('pushSubscription');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error unsubscribing', error);
            return false;
        }
    }

    /**
     * Send a test notification
     */
    async sendTestNotification() {
        try {
            if (!this.isSubscribed) {
                await this.subscribe();
            }
            
            if (Notification.permission === 'granted') {
                const notification = new Notification('MusicAlert Test', {
                    body: 'Deze melding bevestigt dat notificaties correct werken',
                    icon: 'img/logo-192x192.png',
                    badge: 'img/logo-72x72.png'
                });
                
                notification.onclick = function() {
                    window.focus();
                    notification.close();
                };
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error sending test notification:', error);
            return false;
        }
    }

    /**
     * Manually trigger a check for new releases in the service worker
     */
    async manualCheckForNewReleases() {
        if (!this.swRegistration) {
            console.warn('Service worker not registered');
            return false;
        }

        try {
            // Send manual check message to service worker
            this.swRegistration.active.postMessage({
                type: 'MANUAL_CHECK'
            });
            
            return true;
        } catch (error) {
            console.error('Error triggering manual check:', error);
            return false;
        }
    }

    /**
     * Helper function to convert base64 to Uint8Array
     * (required for applicationServerKey)
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

// Initialize notifications service
const notifications = new NotificationsService();