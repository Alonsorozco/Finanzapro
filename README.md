# FinanzaPro - Versión Java Portátil

Esta versión de la aplicación está diseñada para ejecutarse en cualquier computador que tenga **Java** instalado, sin necesidad de instalar Node.js o herramientas adicionales.

## Requisitos
- Tener instalado **Java 11** o superior.

## Cómo ejecutar en tu computador
1. Descarga los archivos `Main.java`, `index.html`, `app.js` y `data.json` en una misma carpeta.
2. Abre una terminal o consola en esa carpeta.
3. Ejecuta el siguiente comando:
   ```bash
   java Main.java
   ```
4. Abre tu navegador y entra a: `http://localhost:3000`

## Notas sobre las fechas
La aplicación utiliza la zona horaria local de tu computador para registrar las transacciones, evitando problemas de desfase horario.

## Base de Datos
Tus datos se guardan automáticamente en el archivo `data.json` en la misma carpeta del programa.
