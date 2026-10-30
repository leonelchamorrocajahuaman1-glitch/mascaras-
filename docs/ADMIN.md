# Panel de administración — SPIDER MASKS

Panel privado para gestionar la tienda desde tu PC. Comparte la misma base de datos que la tienda pública: cualquier cambio (producto, precio, stock, estado de un pedido, configuración) se ve en la tienda al recargar la página.

## Acceso

1. Si es la primera vez, en la carpeta del proyecto:
   ```bash
   npm run setup
   ```
   Muestra **una sola vez** el email y la contraseña del **propietario**. Para elegir tu propia contraseña: `npm run setup -- "tu-clave-segura"`.
2. Arranca la web con `npm run dev` y abre **http://localhost:3000/admin**.
3. Para cambiar la contraseña del propietario:
   ```bash
   npm run admin:hash -- "nueva-clave"
   ```
   Copia la línea `ADMIN_PASSWORD_HASH=...` en `.env.local` y reinicia el servidor.

> Las rutas antiguas (`/admin/products`, `/admin/orders`, `/admin/models`) redirigen a las nuevas.

## Roles y permisos

| Acción | Propietario | Administrador | Personal |
|---|:-:|:-:|:-:|
| Ver dashboard, productos, modelos, pedidos, clientes, inventario | ✔ | ✔ | ✔ |
| Cambiar estado de pedidos | ✔ | ✔ | ✔ |
| Entradas, salidas y recuentos de inventario | ✔ | ✔ | ✔ |
| Crear, editar, eliminar productos y categorías | ✔ | ✔ | — |
| Subir, asignar y eliminar modelos 3D | ✔ | ✔ | — |
| Registrar cobros y reembolsos | ✔ | ✔ | — |
| Suspender clientes | ✔ | ✔ | — |
| Cambiar la configuración de la tienda | ✔ | ✔ | — |
| Crear, editar y eliminar usuarios del panel | ✔ | — | — |
| Borrar pedidos de prueba | ✔ | — | — |

- El **propietario** se define en `.env.local` (`ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`). Es el único que crea accesos, en **Configuración → Usuarios del panel**. No hay registro público.
- Los permisos los comprueba el **servidor** en cada petición. Ocultar un botón es solo comodidad: una llamada directa a la API sin permiso devuelve 403.
- Desactivar a un usuario, o cambiar su rol o su contraseña, **cierra sus sesiones al instante**.

## Módulos

| Ruta | Para qué sirve |
|---|---|
| `/admin` | Dashboard. Muestra ventas totales (importe de pedidos no cancelados), ingresos del día y del mes, cobrado (pagos confirmados), nº de pedidos, productos disponibles, stock bajo, agotados, últimos pedidos y un gráfico por día o mes (también como tabla). Todo se calcula con datos reales; los pedidos de prueba no cuentan. |
| `/admin/productos` | Busca, filtra (categoría, visibilidad, stock, con/sin 3D) y ordena. Activa/oculta y destaca con un clic. Elimina con confirmación. |
| `/admin/productos/nuevo` y `/[id]` | Nombre, slug, eslogan, descripción, categoría, precio y precio anterior (descuento), variantes (nombre, SKU, stock, precio propio), fotos, modelo 3D y estilo del laboratorio. Los cambios de stock hechos aquí quedan en el historial de inventario. |
| `/admin/productos/categorias` | Crea, renombra, ordena, oculta y elimina categorías. No deja eliminar una categoría con productos. Las categorías visibles con productos aparecen como filtros en la tienda. |
| `/admin/modelos-3d` | Sube `.glb` (o `.gltf` con sus `.bin` y texturas), valida, previsualiza en 3D (girar, ampliar, ángulos), edita autor, origen, licencia y rotación, asigna, cambia o quita el modelo de un producto, y muestra la cobertura (productos con y sin modelo, y modelos rotos). |
| `/admin/pedidos` | Filtra por estado, pago, fechas y texto. En cada pedido: cliente, productos, cantidades, totales, método y estado de pago, cambio de estado con nota e historial completo. |
| `/admin/clientes` | Clientes registrados automáticamente al comprar (por email), con su historial, importe, notas internas y suspensión. Un cliente suspendido no puede hacer pedidos nuevos. |
| `/admin/inventario` | Stock de cada variante, alertas (bajo/agotado), entradas, salidas y recuentos con motivo y nota, e historial de movimientos (ventas, cancelaciones, ajustes…) con quién los hizo. |
| `/admin/configuracion` | Nombre y email de la tienda, envío y envío gratis, umbral de stock bajo, máximo por artículo, pausar pedidos, aviso del checkout, estado de pagos y base de datos, usuarios del panel y limpieza de pedidos de prueba. |

## Flujo de pedidos y stock

1. El cliente confirma el checkout. El servidor valida stock, precios, el límite por artículo y que el cliente no esté suspendido, y **descuenta el stock en ese momento**, de forma atómica. Si no hay stock suficiente, el pedido se rechaza: nunca se vende por encima de las existencias.
2. Estados: **Pendiente → Confirmado → Preparando → Enviado → Entregado**, o **Cancelado**. El cliente ve el seguimiento en la página de su pedido.
3. **Cancelar** repone el stock. **Reactivar** un pedido cancelado lo vuelve a descontar, si hay existencias. El stock solo se mueve al entrar o salir de "Cancelado", así que nunca se descuenta ni se repone dos veces el mismo pedido.

## Pagos

- No hay pasarela de pago. Los pedidos nacen como **No pagado** con método "Sin pasarela de pago", y la web nunca los marca como pagados por sí sola.
- Si el cliente te paga por transferencia, en efectivo o con TPV, abre el pedido y usa **Registrar cobro recibido** (método + referencia). Queda en el historial con tu usuario. También puedes registrar un reembolso o deshacer un cobro registrado por error.

## Clientes y datos personales

La tienda no tiene cuentas de cliente con contraseña. Por eso no se guardan contraseñas de clientes ni datos de tarjeta. El panel solo muestra los datos necesarios para gestionar y enviar los pedidos.

## Configuraciones manuales pendientes

- [ ] `npm run setup` en tu PC (crea `.env.local` con el propietario y el secreto de sesión).
- [ ] Crear los usuarios del panel que necesites (Configuración → Usuarios del panel).
- [ ] Revisar envío, umbral de stock y aviso del checkout (Configuración).
- [ ] Descargar tus modelos GLB y subirlos en Modelos 3D, con autor y licencia (ver `docs/MODELOS-3D.md`).
- [ ] (Producción) Configurar Supabase: ejecutar `supabase/schema.sql` y rellenar las dos variables en `.env.local`.
- [ ] (Opcional) Integrar una pasarela de pago si quieres cobrar en línea.

## Pruebas

```bash
npm run test:e2e
```

Con el servidor en marcha y `ADMIN_TEST_PASSWORD` definido (ver README). Recorre la tienda, la protección del panel, los permisos por rol y todos los módulos, y borra al final los datos de prueba que crea.
