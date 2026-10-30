# Estado de Pet Doctor

## Alcance acordado

Repositorio de destino: https://github.com/aapintoz-rgb/pet_doctor

Aplicación web académica en HTML y tecnologías complementarias. Archivos JSON cargados/descargados por el usuario como almacenamiento del modelo. CSV para importación y exportación específicas. n8n tentativo; posible uso futuro de Google Apps Script. No se ha definido todavía la conexión ni sus contratos.

## Implementado

- Módulo 1: login académico y cierre de sesión.
- Credenciales iniciales: admin / PetDoctor123.
- Sesión por pestaña con sessionStorage; alternativa en memoria si está bloqueado.
- Pantalla de inicio con módulos pendientes identificados.
- Diseño adaptable a móvil, etiquetas, foco de teclado y errores accesibles.
- Cotizador de seis servicios con datos mínimos, planes, componentes, ajustes por tamaño, descuentos e IGV del 18 %.
- Seis ilustraciones locales generadas para identificar los servicios.
- Carga de registro de dueños y mascotas y recuperación de cotizaciones JSON.
- PDF comercial con desglose, texto de venta, vigencia y disclaimer académico.
- Base maestra JSON de cotizaciones: persistencia local en el navegador, importación, exportación y actualización sin duplicar identificadores.

## Organización

- index.html: acceso y pantalla de inicio.
- assets/auth.js: validación y lectura de sesión.
- assets/app.js: eventos y navegación de vistas.
- assets/styles.css: presentación adaptable.
- assets/catalog.js y assets/pricing.js: catálogo de tarifas y cálculo monetario.
- assets/files.js: validación de cotizaciones, registros y base maestra.
- assets/pdf.js: generación local del PDF comercial.
- assets/quote.js y assets/quote.css: interfaz y comportamiento del cotizador.

## Decisiones

- Login en cliente autorizado expresamente para esta versión académica.
- No guardar la contraseña en la sesión.
- No implementar todavía datos de negocio, CSV ni llamadas a servicios externos.
- Mantener las secciones futuras como información, sin botones que simulen funciones inexistentes.
- Una cotización puede contener varios servicios para una sola mascota.
- El PDF y la base maestra se generan localmente. La base persiste en el almacenamiento del navegador y se respalda mediante descarga JSON.
- Volver a guardar el mismo identificador actualiza su registro en la base maestra en vez de duplicarlo.

## Siguiente tarea

Definir si el siguiente módulo será el registro formal de dueños y mascotas o la programación de citas. El cotizador ya define un contrato mínimo de registro JSON y una base maestra versionada de cotizaciones.

## Verificación

- Comprobación de sintaxis JavaScript aprobada con Node.
- Comprobaciones con DOM simulado aprobadas: credenciales correctas e incorrectas, mostrar/ocultar contraseña, restauración y cierre de sesión, sesión corrupta y almacenamiento bloqueado. También se comprobaron las referencias HTML a scripts y estilos.
- Revisión visual aprobada en navegador mediante servidor local y en la publicación de GitHub Pages.
- Código sincronizado en la rama `main` de https://github.com/aapintoz-rgb/pet_doctor.
- GitHub Pages habilitado desde la raíz de `main`: https://aapintoz-rgb.github.io/pet_doctor/.
- Dieciséis pruebas automatizadas aprobadas para tarifas, límites de peso, descuentos, IGV, archivos y base maestra.
- Comprobación en navegador aprobada para cálculo, persistencia de la base al recargar y descarga PDF.
- PDF verificado con pdfinfo, extracción de texto y renderizado de todas sus páginas a PNG; sin contenido recortado ni superpuesto.
