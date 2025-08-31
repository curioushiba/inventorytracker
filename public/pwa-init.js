// PWA Initialization Script
(function() {
  'use strict';
  
  // Track if the app is installable
  let deferredPrompt = null;
  
  // Handle the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', function(e) {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    // Dispatch a custom event that React components can listen to
    window.dispatchEvent(new CustomEvent('pwa-installable', { detail: e }));
    
    // Log for debugging
    console.log('PWA: Install prompt captured and stored');
  });
  
  // Handle app installed event
  window.addEventListener('appinstalled', function() {
    // Clear the deferred prompt
    deferredPrompt = null;
    
    // Dispatch a custom event
    window.dispatchEvent(new CustomEvent('pwa-installed'));
    
    console.log('PWA: App was installed');
  });
  
  // Make the prompt available globally for React components
  window.getPWAPrompt = function() {
    return deferredPrompt;
  };
  
  // Function to trigger the install prompt
  window.showPWAPrompt = async function() {
    if (!deferredPrompt) {
      console.log('PWA: No install prompt available');
      return false;
    }
    
    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;
      
      // Log the outcome
      console.log(`PWA: User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
      
      // Clear the prompt
      if (outcome === 'accepted') {
        deferredPrompt = null;
      }
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('PWA: Error showing install prompt:', error);
      return false;
    }
  };
  
  // Check if app is already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('PWA: App is already installed');
    window.dispatchEvent(new CustomEvent('pwa-already-installed'));
  }
})();