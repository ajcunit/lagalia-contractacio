import Swal from 'sweetalert2';

/**
 * Utilitats per a avisos visuals premium utilitzant SweetAlert2
 */

export const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
    return Swal.fire({
        title: title || (type === 'success' ? 'Èxit' : type === 'error' ? 'Error' : 'Avís'),
        text: message,
        icon: type,
        confirmButtonColor: '#3b82f6', // primary-500
        confirmButtonText: 'D\'acord',
        customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg px-6 py-2'
        }
    });
};

export const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    return Toast.fire({
        icon: type,
        title: message
    });
};

export const showConfirm = (title: string, text: string, confirmText: string = 'Sí, confirmar', cancelText: string = 'Cancel·lar') => {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#ef4444',
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg px-6 py-2',
            cancelButton: 'rounded-lg px-6 py-2'
        }
    });
};
