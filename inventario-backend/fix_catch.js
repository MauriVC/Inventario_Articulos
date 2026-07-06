const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const filesToUpdate = ['categorias.routes.js', 'marcas.routes.js', 'unidades.routes.js', 'colores.routes.js', 'atributos.routes.js'];

for (const file of filesToUpdate) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/if \(err\.code === 'ER_DUP_ENTRY'\) \{/g, 
    "if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
