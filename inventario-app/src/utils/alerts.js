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

export const showToast = (message, type = 'success') => {
  const isPDF = type === 'pdf';
  const isExcel = type === 'excel';
  let background = '#fff';
  let color = '#198754';
  
  if (isPDF) {
    background = '#fff5f5';
    color = '#e53e3e';
  } else if (isExcel) {
    background = '#f0fff4';
    color = '#38a169';
  }

  return Swal.fire({
    toast: true,
    position: 'bottom-end',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: background,
    color: color,
    iconColor: color
  });
};
