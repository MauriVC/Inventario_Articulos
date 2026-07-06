function obtenerPrimerasTresLetras(texto) {
  if (!texto || texto.trim() === '') return '';
  texto = texto.trim().toUpperCase();
  // Obtener solo letras
  const letrasMatch = texto.match(/[A-ZÁÉÍÓÚÑ]/gu);
  if (!letrasMatch) return '';
  let letras = letrasMatch.slice(0, 3);
  while (letras.length < 3) {
    letras.push('X');
  }
  return letras.join('');
}

function generarPalabraCodigo(nombre, categoria) {
  const NOMBRES_ESPECIFICOS = {
    'CARTA': 'CAR',
    'MEDIO OFICIO': 'MEOF',
    'OFICIO': 'OF',
    'PAQUETE': 'PACK'
  };

  const nombreUpper = nombre.trim().toUpperCase();
  
  for (const [palabra, codigo] of Object.entries(NOMBRES_ESPECIFICOS)) {
    if (nombreUpper.includes(palabra)) {
      return codigo;
    }
  }

  const letrasNombre = obtenerPrimerasTresLetras(nombre);
  
  if (categoria) {
    const letrasCategoria = obtenerPrimerasTresLetras(categoria);
    return letrasNombre + letrasCategoria;
  }

  return letrasNombre;
}

console.log(generarPalabraCodigo('Cuaderno', 'Papelería'));
console.log(generarPalabraCodigo('Papel Carta', 'Papelería'));
console.log(generarPalabraCodigo('Resma Oficio', 'Papel'));
console.log(generarPalabraCodigo('A', 'B'));
