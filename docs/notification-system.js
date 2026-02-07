// Theme.js removed: No dark mode or theme switching
// Unified Notification & Toast System
(function initNotificationSystem() {
  // Create notification container
  function createNotificationContainer() {
    if (document.querySelector('.notification-container')) {
      return; // Already exists
    }

    const container = document.createElement('div');
    container.className = 'notification-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .notification-container {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      }

      @media (max-width: 768px) {
        .notification-container {
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }

      .notification {
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        animation: slideIn 0.3s ease-out forwards;
        border-left: 4px solid;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }

      .notification.hide {
        animation: slideOut 0.3s ease-out forwards;
      }

      .notification-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .notification-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .notification-title {
        font-weight: 700;
        font-size: 14px;
      }

      .notification-message {
        font-size: 13px;
        opacity: 0.9;
      }

      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        flex-shrink: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
        padding: 0;
        margin: -4px -4px 0 0;
      }

      .notification-close:hover {
        opacity: 1;
      }

      /* Success Notification */
      .notification.success {
        background-color: #f0fdf4;
        color: #166534;
        border-left-color: #22c55e;
      }

      /* Error Notification */
      .notification.error {
        background-color: #fef2f2;
        color: #991b1b;
        border-left-color: #ef4444;
      }

      /* Warning Notification */
      .notification.warning {
        background-color: #fffbeb;
        color: #92400e;
        border-left-color: #f59e0b;
      }

      /* Info Notification */
      .notification.info {
        background-color: #eff6ff;
        color: #1e3a8a;
        border-left-color: #3b82f6;
      }
    `;
    document.head.appendChild(style);
  }

  // Show notification
  window.showNotification = function(message, type = 'info', title = null, duration = 5000) {
    createNotificationContainer();

    const container = document.querySelector('.notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    const titleHtml = title ? `<div class="notification-title">${title}</div>` : '';

    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        ${titleHtml}
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" aria-label="Close notification">×</button>
    `;

    container.appendChild(notification);

    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', function() {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 300);
    });

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.classList.add('hide');
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }

    return notification;
  };

  // Convenience functions
  window.showSuccess = function(message, title = 'Success', duration = 5000) {
    return showNotification(message, 'success', title, duration);
  };

  window.showError = function(message, title = 'Error', duration = 7000) {
    return showNotification(message, 'error', title, duration);
  };

  window.showWarning = function(message, title = 'Warning', duration = 6000) {
    return showNotification(message, 'warning', title, duration);
  };

  window.showInfo = function(message, title = 'Info', duration = 5000) {
    return showNotification(message, 'info', title, duration);
  };
})();
