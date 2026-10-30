# Pet Doctor

Aplicación web académica para gestión de servicios de mascotas. HTML, CSS y JavaScript sin compilación ni dependencias de ejecución. Las fuentes externas son opcionales; sin conexión se usan las fuentes del sistema.

Sitio publicado: https://aapintoz-rgb.github.io/pet_doctor/

## Abrir

Abre `index.html` en un navegador. También puede servirse el directorio con cualquier servidor HTTP estático o GitHub Pages.

## Acceso de demostración

- Usuario: `admin`
- Contraseña: `PetDoctor123`

Las credenciales están en texto en `assets/auth.js`. Esta validación en el navegador es únicamente académica: no protege datos ni sustituye autenticación en servidor. Se usa `sessionStorage` para conservar el acceso al recargar la pestaña; si no está disponible, funciona en memoria. Cerrar sesión elimina el estado de acceso. No se persiste la contraseña en la sesión.

## Módulos implementados

Login con validación de campos obligatorios, error de credenciales, mostrar/ocultar contraseña, restauración de sesión y cierre de sesión. Inicio con cuatro secciones informativas pendientes de implementación.

Cotizador visual de seis servicios con precios académicos, IGV del 18 %, planes y componentes, datos mínimos, búsqueda opcional en un registro JSON y cálculo en tiempo real.

El botón **Descargar PDF y guardar** genera una cotización comercial en PDF y agrega o actualiza la cotización en una base maestra guardada localmente en el navegador. **Descargar base** crea el respaldo `pet-doctor-cotizaciones.json`; **Cargar base** permite continuar trabajando con ese archivo en otro navegador o equipo. El navegador no puede sobrescribir directamente un archivo existente del equipo.

El PDF incluye texto comercial, desglose de servicios, subtotal, IGV, total, vigencia y disclaimer académico. La cotización no constituye diagnóstico, prescripción, reserva ni comprobante de pago.

## Próximos módulos

Programación de citas; registro de dueños y mascotas e importación CSV; consulta y exportación de atenciones; ficha cliente-mascota e integración n8n. Los datos de negocio se cargarán y descargarán en JSON, sin base remota. Estos módulos aún no están implementados.

Consulta `docs/estado.md` antes de retomar el trabajo.
