// index.js
// Constante para la URL base de la API
const API_BASE_URL = 'https://fakestoreapi.com';

/**
 * Función para realizar peticiones a la API.
 * @param {string} endpoint - El endpoint específico de la API (ej: '/products', '/products/1').
 * @param {string} method - El método HTTP (GET, POST, PUT, DELETE).
 * @param {object} [body=null] - El cuerpo de la petición para POST o PUT.
 * @returns {Promise<object>} - La respuesta de la API parseada como JSON. Los datos devueltos por GET siguiendo la estructura JSON:
         products [
        { 
        id:    , 
        title:   ,  
        price:   , 
        description: , 
        category:  , 
        image:  , 
        rating:   
        },
 */

import { argv } from "process";  // importing only the argv property from the built-in Node.js module "process"; por ende, no es necesario importarlo; está línea se podría directamente eliminar, porque process ya viene incluido.
 
async function apiRequest(endpoint, method = 'GET', body = null) {
  // Construye la URL completa para la petición
  const url = `${API_BASE_URL}${endpoint}`;
  // Configura las opciones iniciales para fetch
  const options = {
    method, // Método HTTP (GET, POST, etc.)
    headers: {}, // Cabeceras de la petición
  };

  // Si hay un cuerpo (body) y el método es POST o PUT, configúrar
  if (body && (method === 'POST' || method === 'PUT')) {
    // Establece el tipo de contenido como JSON
    options.headers['Content-Type'] = 'application/json';
    // Convierte el objeto body a una cadena JSON
    options.body = JSON.stringify(body);
  }

  try {
    // Realiza la petición fetch a la API
    const response = await fetch(url, options);

    // Verifica si la respuesta no fue exitosa (código de estado no es 2xx)
    if (!response.ok) {
      // Si no es exitosa, intenta obtener el cuerpo del error
      const errorBody = await response.text(); // Uso text() por si el error no es JSON
      throw new Error(`Error ${response.status}: ${response.statusText}. Body: ${errorBody}`);
    }

    // Si la respuesta es exitosa, verifica si tiene contenido para parsear como JSON
    // Las peticiones DELETE a veces no retornan cuerpo o retornan un cuerpo que no es JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await response.json(); // Parsea la respuesta como JSON
    } else {
      // Retorna un mensaje de éxito si no hay JSON (ej. algunas respuestas DELETE)
      return { message: `Operation successful. Status: ${response.status}`};
    }
  } catch (error) {
    // Captura cualquier error durante la petición o el parseo
    console.error(`API Request Failed for ${method} ${url}:`, error.message);
    // Muestra el error para que sea manejado por la función que llamó a apiRequest
    throw error;
  }
}

/**
 * Función principal que procesa los comandos de la línea de argumentos.
 */
async function main() {
  // Captura los argumentos de la línea de comandos usando process.argv
  // process.argv[0] es 'node'
  // process.argv[1] es 'index.js' (script que se está ejecutando)
  // El primer argumento real es process.argv[2] , es decir, el tercer elemento del array devuelto
  const [, , command, path, ...args] = process.argv; // destructuring de arrays;  al final hay una explicación detallada sobre esto; no confundir args con argv.
  // Muestra un mensaje de ayuda si no se proporcionan suficientes argumentos
  if (!command || !path) {
    console.log(`
Uso: npm run start <COMMAND> <RESOURCE_PATH> [ARGUMENTS... | FIELD_TO_EXTRACT]

Comandos disponibles:
  GET products                                  - Obtiene todos los productos.
  GET products/<productId>                      - Obtiene un producto específico por su ID.
  GET products/<productId> <field>              - Obtiene un campo específico (ej: image, title, price) de un producto.
  POST products <title> <price> <category> [description] [image] - Crea un nuevo producto.
                                      (description e image son opcionales y se usarán valores por defecto si no se proveen)
  DELETE products/<productId>                   - Elimina un producto por su ID.

Ejemplos:
  npm run start GET products
  npm run start GET products/15
  npm run start GET products/20 image
  npm run start GET products/5 title
  npm run start POST products "Amazing T-Shirt" 19.99 "men's clothing" "A great t-shirt" "https://i.pravatar.cc"
  npm run start POST products "Cool Gadget" 299.99 "electronics"
  npm run start DELETE products/7
    `);
    return; // Termina la ejecución si no hay suficientes argumentos
  }

  // Convierte el comando a mayúsculas para facilitar la comparación
  const method = command.toUpperCase();
  // El endpoint se construye a partir del path
  let endpoint = `/${path}`;

  try {
    // Variable para almacenar el resultado de la API
    let result;

    // Switch para manejar los diferentes comandos
    switch (method) {
      case 'GET':
        // Si se pide la lista completa de productos; si se especifica algún atributo del producto, entonces la longitud no es igual a 0
        if (path === 'products' && args.length === 0) {
          result = await apiRequest(endpoint, 'GET');
          console.log('Productos obtenidos:', result);
        }
        // Si se pide un producto específico (con o sin campo a extraer)
        else if (path.startsWith('products/')) {
          // El endpoint ya está construido para obtener el producto (ej: /products/15)
          const productData = await apiRequest(endpoint, 'GET');

          // Si se proporcionó un argumento adicional (el nombre del campo a extraer)
          if (args.length > 0) {
            const fieldToExtract = args[0]; // El primer argumento en 'args' es el campo a extraer; no confundir con argvs
            const productId = path.split('/')[1]; // Extraemos el ID para los mensajes

            // Verifica si el producto tiene ese campo
            if (productData && typeof productData === 'object' && fieldToExtract in productData) {
              // Muestra solo el campo solicitado
              console.log(`Campo '${fieldToExtract}' del producto ${productId}:`, productData[fieldToExtract]);
            } else if (productData && typeof productData === 'object') {
              // Si el campo no existe en el producto, informa al usuario
              console.error(`Error: El campo '${fieldToExtract}' no existe en el producto ${productId}.`);
              console.log('Campos disponibles:', Object.keys(productData));
            } else {
              // Si productData no es un objeto (podría ser un mensaje de error de la API, si el producto no se encontró)
              console.log(`Respuesta de la API para ${path} (posiblemente producto no encontrado):`, productData);
            }
          } else {
            // Si no se especificó un campo, muestra el producto completo
            console.log('Producto obtenido:', productData);
          }
        } else {
          // Si el path no es reconocido para GET
          console.error(`Ruta no válida para GET: '${path}'. Use 'products', 'products/<id>' o 'products/<id> <field>'.`);
        }
        break;

      case 'POST':
        // Si el path es 'products' para crear un nuevo producto
        if (path === 'products') {
          // Verifica que se proporcionen los argumentos mínimos para crear un producto
          if (args.length < 3) {
            console.error('Para POST products, se requieren al menos: <title> <price> <category>.');
            console.error('Ejemplo: npm run start POST products "Mi Producto" 10.99 "electronica"');
            return; // Termina si faltan argumentos
          }
          // Desestructura los argumentos para el nuevo producto
          const [title, priceStr, category, description, image] = args;
          // Convierte el precio a número flotante
          const price = parseFloat(priceStr);

          // Verifica si el precio es un número válido
          if (isNaN(price)) {
            console.error('El precio debe ser un número válido.');
            return; // Termina si el precio no es válido
          }

          // Crea el objeto del nuevo producto
          // FakeStoreAPI espera 'description' e 'image', así que proveemos valores por defecto si no se dan
          const newProduct = {
            title,
            price,
            category,
            description: description || 'Default product description', // Valor por defecto si no se proporciona
            image: image || 'https://calculo-intereses.onrender.com', // Imagen placeholder por defecto; es mi web page.
          };

          // Realiza la petición POST
          result = await apiRequest(endpoint, 'POST', newProduct);
          // Imprime el resultado de la creación
          console.log('Producto creado:', result);
        } else {
          // Si el path no es reconocido para POST
          console.error(`Ruta no válida para POST: ${path}. Use 'products'.`);
        }
        break;

      case 'DELETE':
        // Si el path es 'products/<id>' para eliminar un producto
        if (path.startsWith('products/')) {
          // Extrae el ID del producto del path
          const productId = path.split('/')[1];
          // Verifica que el ID sea un número (aunque la API podría manejar strings, buena práctica validarlo)
          if (!productId || isNaN(parseInt(productId))) {
             console.error('Para DELETE products, se requiere un ID numérico válido: products/<productId>');
             return;
          }
          // Realiza la petición DELETE
          // El endpoint ya incluye el ID (ej: /products/7)
          result = await apiRequest(endpoint, 'DELETE');
          // Imprime el resultado de la eliminación
          // Nota: FakeStoreAPI, en realidad, no borra el item, solo simula la respuesta.
          console.log(`Producto con ID ${productId} (supuestamente) eliminado:`, result);
        } else {
          // Si el path no es reconocido para DELETE
          console.error(`Ruta no válida para DELETE: ${path}. Use 'products/<id>'.`);
        }
        break;

      default:
        // Si el comando no es válido
        console.error(`Comando no reconocido: ${command}. Comandos válidos: GET, POST, DELETE.`);
    }
  } catch (error) {
    // Captura cualquier error que haya ocurrido en las operaciones y lo muestra
    // Los errores específicos de la API ya se muestran automáticamente en apiRequest, sin necesidad de incluirlos en este código
    // Esto es para errores generales.
    console.error('Ocurrió un error en la operación principal:', error.message);
  }
}

// Ejecuta la función principal
main();


/*   ******************************************************************************************

Recordatorio de la Configuración del Proyecto (Requerimiento #1):
Asegúrate de que tu proyecto esté configurado correctamente:
Directorio del proyecto: fake-store-cli .
Archivo package.json:
Ejecuta npm init -y en la raíz del proyecto.
Añade "type": "module" al package.json.
Añade o modifica el script start en package.json:
{
  "name": "fake-store-cli",
  "version": "1.0.0",
  "description": "A CLI tool to interact with FakeStore API",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["fakestore", "api", "cli"],
  "author": "Tu Nombre",
  "license": "ISC"
}

*/

/* ************************************************************************************************
El script index.js está diseñado para ser una herramienta de línea de comandos (CLI) que interactúa con la FakeStore API. Su funcionamiento se puede resumir en los siguientes pasos clave:

Configuración Inicial y Constantes:
API_BASE_URL: Se define una constante con la URL base de la FakeStore API (https://fakestoreapi.com).

Función apiRequest (Módulo de Comunicación con la API):

Propósito: Encapsular toda la lógica para realizar peticiones HTTP a la API. Es una función async reutilizable.

Parámetros:

endpoint: La ruta específica del recurso (ej: /products, /products/1).

method: El método HTTP (GET, POST, DELETE), con GET como valor por defecto.

body: Un objeto con los datos a enviar en peticiones POST (por defecto null).

Pasos Internos:

Construye la URL completa concatenando API_BASE_URL y endpoint.

Configura las options para la función fetch:

Establece el method.

Si es POST y hay body, añade la cabecera Content-Type: application/json y convierte el body a una cadena JSON usando JSON.stringify().

Realiza la petición usando await fetch(url, options).

Manejo de Respuesta:

Verifica si response.ok es false (errores HTTP 4xx, 5xx). Si hay error, intenta leer el cuerpo del error y lanza una excepción personalizada.

Si la respuesta es exitosa, verifica el Content-Type. Si es application/json, parsea la respuesta con await response.json().

Si no es JSON (ej. algunas respuestas DELETE), devuelve un objeto con un mensaje de éxito.

Manejo de Errores: Utiliza try...catch para capturar errores de red o durante el proceso y los reporta, luego relanza el error para que la función llamante lo maneje.

Función main (Orquestador Principal de la Aplicación):

Propósito: Es la función async principal que se ejecuta al iniciar el script. Controla el flujo de la aplicación.

Pasos Internos:

Captura de Argumentos de Línea de Comandos:

Usa process.argv y destructuring (const [,, command, path, ...args] = process.argv;) para obtener:

command: La acción a realizar (GET, POST, DELETE).

path: El recurso o ruta (products, products/ID).

args: Un array con los argumentos adicionales (ej: datos para POST, o el campo a extraer para GET); no confundir con argv.

Validación de Argumentos Mínimos y Ayuda:

Si command o path no se proporcionan, muestra un mensaje de ayuda detallado con instrucciones de uso y ejemplos, y luego termina la ejecución.

Procesamiento del Comando:

Convierte command a mayúsculas (method = command.toUpperCase();).

Prepara el endpoint para la API (ej: /${path}).

Estructura switch (method) para Ejecutar Acciones:

case 'GET':

Si path es products (y no hay args adicionales): Llama a apiRequest para obtener todos los productos.

Si path es products/<productId>:

Llama a apiRequest para obtener el producto específico.

Si args contiene un nombre de campo (ej: image, title): Extrae y muestra solo ese campo del producto.

Si el campo no existe, informa al usuario.

Si no se especifica un campo en args, muestra el objeto completo del producto.

case 'POST':

Si path es products:

Valida que se proporcionen los args mínimos (título, precio, categoría).

Desestructura los args para obtener title, price, category, description (opcional), image (opcional).

Convierte el precio a número y valida.

Crea un objeto newProduct con los datos (usando valores por defecto para descripción e imagen si no se proporcionan).

Llama a apiRequest con el método POST y newProduct como cuerpo.

case 'DELETE':

Si path es products/<productId>:

Extrae el productId del path y lo valida.

Llama a apiRequest con el método DELETE.

default (Comando no reconocido): Muestra un mensaje de error.

Salida: Imprime en la consola el resultado de la operación de la API o mensajes de error.

Manejo de Errores General: Envuelve la lógica principal en un try...catch para capturar cualquier error no manejado previamente y mostrar un mensaje.

Ejecución:

Se llama a main() al final del script para iniciar la aplicación.

En esencia, el script:

Interpreta los comandos y argumentos que el usuario escribe en la terminal.

Construye la petición HTTP adecuada (método, URL, cuerpo) basada en esos comandos.

Envía la petición a la FakeStore API usando fetch.

Recibe y procesa la respuesta de la API (parsea JSON, maneja errores).

Muestra la información relevante (datos del producto, mensajes de confirmación o errores) en la consola.

Es una estructura común para aplicaciones CLI que interactúan con servicios web, priorizando la claridad, la reutilización de código (con apiRequest) y un manejo adecuado de las entradas del usuario y las respuestas de la API.
*/


/*     ****************************************************************************************************************************
Destructuring de arrays, combinado con el parámetro rest (...args). "rest" significa los restantes parámetros que hubiera 

const [, , command, path, ...args] = process.argv;   // no cofundir argv  con args;  la coma es el separador y se ignoran los 2 primeros elementos del array, cuyo nombre es const

process.argv: es una propiedad global que devuelve un array que contiene los argumentos de la línea de comandos pasados.
El primer elemento (process.argv[0]) es siempre la ruta al ejecutable de Node.js.
El segundo elemento (process.argv[1]) es siempre la ruta al archivo JavaScript que se está ejecutando.

Los elementos subsiguientes (process.argv[2], process.argv[3], etc.) son los argumentos adicionales que son proporcionados al ejecutar el script.

Por ejemplo, si se ejecuta el script así:
npm run start GET products/15 image
Internamente, npm run start se traduce (según el package.json) a algo como:
node index.js GET products/15 image
Entonces, process.argv devuleve un array similar a esto:

[
  '/usr/local/bin/node',  // process.argv[0] - Ruta a node
  '/ruta/a/tu/proyecto/fake-store-cli/index.js', // process.argv[1] - Ruta a tu script
  'GET',                  // process.argv[2]
  'products/15',          // process.argv[3] ; la coma es el separador de elementos del array
  'image'                 // process.argv[4]
]

const [ ... ] = process.argv; (Destructuring de Array):

Esto significa que se extraen elementos del array process.argv y se asignan a nuevas variables (const). La posición de las variables dentro de los corchetes [] corresponde a la posición de los elementos en el array.

, , (Comas para ignorar elementos):

La primera coma , significa "ignora el primer elemento de process.argv" (que es la ruta a Node).

La segunda coma , (después de la primera) significa "ignora el segundo elemento de process.argv" (que es la ruta a tu script index.js).

No se necesitan estos dos primeros elementos, que son omitidos de la asignación a variables con nombre.

command:

Esta variable se asignará al tercer elemento de process.argv (es decir, process.argv[2]).  command sería "GET".

path:

Esta variable se asignará al cuarto elemento de process.argv (es decir, process.argv[3]).   path sería "products/15".

...args (Parámetro Rest, restantes):

El operador ... (spread/rest) aquí funciona como un parámetro rest.

Significa: "toma todos los elementos restantes de process.argv (desde el quinto en adelante) y agrúpalos en un nuevo array llamado args".

En nuestro ejemplo (node index.js GET products/15 image):

args se convertiría en ["image"].

Si tuvieras más argumentos, como node index.js POST products "Nuevo Título"  9.99  "categoría":

command sería "POST"

path sería "products"

args sería ["Nuevo Título", "9.99", "categoría"]

En resumen:

Esta línea es una forma concisa y legible de:

Ignorar los dos primeros argumentos de la línea de comandos (que son estándar de Node.js y generalmente no los necesitas directamente para la lógica de la aplicación).

Capturar el tercer argumento en una variable llamada command.

Capturar el cuarto argumento en una variable llamada path.

Capturar todos los argumentos subsiguientes en un array llamado args.

Esto hace que sea mucho más fácil trabajar con los argumentos de la línea de comandos específicos de tu aplicación sin tener que acceder a ellos mediante índices numéricos como process.argv[2], process.argv[3], etc., lo cual es menos legible y más propenso a errores.
*/


/*
import { argv } from "process";  // importing only the argv property from the built-in Node.js module process; por ende, no es necesario importarlo.

import ... from ...: This is standard ES Module (ESM) syntax. It's used to bring in code (variables, functions, classes, etc.) from other modules (files or built-in Node.js modules) into your current file.

"process":

This refers to a built-in Node.js module named process.

The process object is a global object in Node.js that provides information about, and control over, the current Node.js process. You don't strictly need to import it to use it in many cases (e.g., you can often just write console.log(process.argv)), but explicitly importing it is good practice in ES Modules for clarity and can be enforced by linters.

{ argv }:

This is called a "named import." It means you are specifically importing only the argv property (which is an array) from the process module.

The process.argv property is an array containing the command-line arguments passed when the Node.js process was launched.

*/