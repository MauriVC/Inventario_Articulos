import Swal from 'sweetalert2';

export const showSuccess = (message) => {
  return Swal.fire({
    icon: 'success',
    title: 'Éxito',
    text: message,
    confirmButtonColor: '#198754',
  });
};

export const showError = (message) => {
  return Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonColor: '#dc3545',
  });
};

export const showWarning = (message) => {
  return Swal.fire({
    icon: 'warning',
    title: 'Atención',
    text: message,
    confirmButtonColor: '#ffc107',
  });
};

export const confirmAction = async (title, text, confirmButtonText = 'Aceptar', confirmButtonColor = '#dc3545') => {
  const result = await Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: confirmButtonColor,
    cancelButtonColor: '#6c757d',
    confirmButtonText: confirmButtonText,
    cancelButtonText: 'Cancelar'
  });
  return result.isConfirmed;
};
