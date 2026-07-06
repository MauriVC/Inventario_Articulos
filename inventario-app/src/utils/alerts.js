import Swal from 'sweetalert2';

const customClassConfig = {
  popup: 'swal-custom-popup',
  title: 'swal-custom-title',
  htmlContainer: 'swal-custom-text',
  actions: 'swal-custom-actions'
};

export const showSuccess = (message) => {
  return Swal.fire({
    icon: 'success',
    title: 'Éxito',
    text: message,
    buttonsStyling: false,
    customClass: {
      ...customClassConfig,
      confirmButton: 'btn btn-success'
    }
  });
};

export const showError = (message) => {
  return Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    buttonsStyling: false,
    customClass: {
      ...customClassConfig,
      confirmButton: 'btn btn-danger'
    }
  });
};

export const showWarning = (message) => {
  return Swal.fire({
    icon: 'warning',
    title: 'Atención',
    text: message,
    buttonsStyling: false,
    customClass: {
      ...customClassConfig,
      confirmButton: 'btn btn-primary'
    }
  });
};

export const confirmAction = async (title, text, confirmButtonText = 'Aceptar', confirmButtonClass = 'btn-danger') => {
  const result = await Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    buttonsStyling: false,
    confirmButtonText: confirmButtonText,
    cancelButtonText: 'Cancelar',
    customClass: {
      ...customClassConfig,
      confirmButton: `btn ${confirmButtonClass}`,
      cancelButton: 'btn btn-secondary'
    }
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
