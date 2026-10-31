# Conexión de pruebas retirada

La aplicación usa exclusivamente el webhook modificado de comunicaciones, configurado en **Datos y respaldos → Conexión n8n**. No se debe configurar una segunda URL ni usar las antiguas acciones de rechazo.

La URL de llamadas existente se conserva. La clave local antigua de pruebas se elimina al iniciar; si el navegador bloquea su eliminación, se ignora. La copia local incorpora correo real: consulta [la guía manual de Gmail](correo-n8n.md); su configuración remota y prueba siguen a cargo del usuario.

Consulta [la guía de llamadas](llamadas-demo-n8n.md) para el contrato, autenticación y comprobaciones del único flujo actual. Esta actualización no cambia ni ejecuta workflows remotos.
