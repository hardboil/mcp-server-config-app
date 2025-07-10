export interface ToastOptions {
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  message: string;
}

class ToastManager {
  private container: HTMLElement;
  private toasts: Map<string, HTMLElement> = new Map();

  constructor() {
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'toast-container';
    return container;
  }

  show(options: ToastOptions): void {
    const { type, duration = 5000, message } = options;
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    this.container.appendChild(toast);
    this.toasts.set(toastId, toast);

    // Auto-hide after duration
    setTimeout(() => {
      this.hide(toastId);
    }, duration);
  }

  private hide(toastId: string): void {
    const toast = this.toasts.get(toastId);
    if (toast) {
      toast.classList.add('hiding');
      
      // Remove from DOM after animation
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.toasts.delete(toastId);
      }, 300);
    }
  }

  success(message: string, duration?: number): void {
    this.show({ type: 'success', message, duration });
  }

  error(message: string, duration?: number): void {
    this.show({ type: 'error', message, duration });
  }

  info(message: string, duration?: number): void {
    this.show({ type: 'info', message, duration });
  }

  warning(message: string, duration?: number): void {
    this.show({ type: 'warning', message, duration });
  }
}

export const toast = new ToastManager();