// Avisos por correo al cliente usando EmailJS (https://dashboard.emailjs.com).
// Completar EMAILJS con los datos del panel. Mientras esten vacios, no se
// envian correos (solo se avisa por consola) y el pedido se actualiza igual.
import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';

const EMAILJS = {
    publicKey: 'N7_d6eK0DvISDrmxr',
    serviceId: 'service_4gxjudq',
    templateId: 'template_ym3oh7e'
};

// Email de la tienda: recibe los avisos de pedidos nuevos, solicitudes de
// proxy y mensajes de los clientes en el area de proxies.
const EMAIL_ADMIN = 'cartonpintado67@gmail.com';

// Mensajes por evento. Asunto y cuerpo van en el correo (la plantilla de
// EmailJS usa {{asunto}}, {{mensaje}}, {{detalle}}, {{total}} y {{pedidoId}}).
const ASUNTOS = {
    listo_para_despacho: 'Tu pedido ya está listo, Hechicero',
    entregado: '¡Tu pedido ha sido entregado!'
};

const MENSAJES = {
    listo_para_despacho: 'Tu pedido ya está listo para retiro en el lugar acordado. Nos vemos en una próxima aventura.',
    entregado: 'Tu pedido ha sido entregado en el lugar acordado. Nos vemos en una próxima aventura y recuerda: un hechicero nunca llega tarde, llega cuando se le necesita.'
};

function formatearPrecio(precio) {
    const numero = Number(precio);
    if (!Number.isFinite(numero)) return '$' + precio;
    return numero.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function obtenerItems(pedido) {
    if (Array.isArray(pedido.items) && pedido.items.length > 0) {
        return pedido.items;
    }
    return [{
        productoNombre: pedido.productoNombre,
        productoPrecio: pedido.productoPrecio,
        cantidad: pedido.cantidad || 1
    }];
}

function armarDetalle(pedido) {
    return obtenerItems(pedido).map(function (item) {
        const subtotal = Number(item.productoPrecio) * Number(item.cantidad);
        return item.productoNombre + ' x' + item.cantidad + ' — ' + formatearPrecio(subtotal);
    }).join('<br>');
}

function calcularTotal(pedido) {
    const items = obtenerItems(pedido);
    const total = Number.isFinite(Number(pedido.total))
        ? Number(pedido.total)
        : items.reduce(function (t, i) { return t + Number(i.productoPrecio) * Number(i.cantidad); }, 0);
    return formatearPrecio(total);
}

function estaConfigurado() {
    return Boolean(EMAILJS.publicKey && EMAILJS.serviceId && EMAILJS.templateId);
}

async function enviarAvisoPedido(pedido, evento) {
    const destinatario = pedido.usuarioEmail || '';

    if (!destinatario) {
        console.warn('El pedido ' + pedido.id + ' no tiene email de cliente; no se envió aviso.');
        return { ok: false, error: 'El pedido no tiene email' };
    }

    if (!estaConfigurado()) {
        console.warn('EmailJS sin configurar: no se envió el aviso del pedido ' + pedido.id + '.');
        return { ok: false, error: 'EmailJS sin configurar' };
    }

    const asunto = ASUNTOS[evento] || 'Aviso de tu pedido';
    const params = {
        to_email: destinatario,
        name: 'Hechicero',
        cliente: destinatario,
        asunto: asunto,
        titulo: asunto,
        mensaje: MENSAJES[evento] || '',
        detalle: armarDetalle(pedido),
        total: calcularTotal(pedido),
        pedidoId: pedido.id || ''
    };

    try {
        await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, params, { publicKey: EMAILJS.publicKey });
        return { ok: true };
    } catch (error) {
        const mensaje = (error && (error.text || error.message)) || 'Error al enviar el correo';
        console.warn('No se pudo enviar el aviso del pedido ' + pedido.id + ':', mensaje);
        return { ok: false, error: mensaje };
    }
}

// ── Avisos al admin (nuevos pedidos y actividad de proxies) ──

function armarParamsAdmin(asunto, mensaje, detalle, total, refId) {
    return {
        to_email: EMAIL_ADMIN,
        name: 'Admin',
        cliente: EMAIL_ADMIN,
        asunto: asunto,
        titulo: asunto,
        mensaje: mensaje,
        detalle: detalle,
        total: total || '',
        pedidoId: refId || ''
    };
}

async function enviarAvisoAdmin(asunto, mensaje, detalle, total, refId) {
    if (!EMAIL_ADMIN) {
        console.warn('EMAIL_ADMIN sin configurar: no se envió el aviso al admin.');
        return { ok: false, error: 'EMAIL_ADMIN sin configurar' };
    }
    if (!estaConfigurado()) {
        console.warn('EmailJS sin configurar: no se envió el aviso al admin.');
        return { ok: false, error: 'EmailJS sin configurar' };
    }
    try {
        await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, armarParamsAdmin(asunto, mensaje, detalle, total, refId), { publicKey: EMAILJS.publicKey });
        return { ok: true };
    } catch (error) {
        const mensajeError = (error && (error.text || error.message)) || 'Error al enviar el correo';
        console.warn('No se pudo enviar el aviso al admin:', mensajeError);
        return { ok: false, error: mensajeError };
    }
}

function detalleProxy(proxie) {
    const partes = [];
    if (proxie.nombreCarta) partes.push('Carta: ' + proxie.nombreCarta);
    if (proxie.cantidad) partes.push('Cantidad: ' + proxie.cantidad);
    if (proxie.expansion) partes.push('Expansión: ' + proxie.expansion);
    if (proxie.tipo) partes.push('Tipo: ' + proxie.tipo);
    if (proxie.tamano) partes.push('Tamaño: ' + proxie.tamano);
    if (proxie.presupuesto) partes.push('Presupuesto: ' + formatearPrecio(proxie.presupuesto));
    return partes.join('<br>');
}

function mensajeInicialProxy(proxie) {
    if (Array.isArray(proxie.mensajes) && proxie.mensajes.length > 0) {
        return String(proxie.mensajes[0].texto || '');
    }
    return '';
}

// Correo al admin cada vez que un cliente deja un pedido.
async function enviarAvisoNuevoPedido(pedido) {
    const cliente = pedido.usuarioEmail || 'Cliente';
    const cantidad = obtenerItems(pedido).reduce(function (t, i) { return t + Number(i.cantidad); }, 0);
    const asunto = 'Nuevo pedido recibido';
    const mensaje = 'El cliente ' + cliente + ' dejó un pedido de ' + cantidad + ' ítem(s).';
    return enviarAvisoAdmin(asunto, mensaje, armarDetalle(pedido), calcularTotal(pedido), pedido.id);
}

// Correo al admin cuando un cliente crea una solicitud de proxie.
async function enviarAvisoNuevoProxy(proxie) {
    const asunto = 'Nueva solicitud de proxie';
    const mensaje = 'El cliente ' + (proxie.usuarioEmail || 'Cliente') + ' quiere un proxie de "' + (proxie.nombreCarta || 'sin nombre') + '".';
    const inicial = mensajeInicialProxy(proxie);
    const detalle = detalleProxy(proxie) + (inicial ? '<br><br>' + inicial : '');
    return enviarAvisoAdmin(asunto, mensaje, detalle, '', proxie.id);
}

// Correo al admin cuando un cliente escribe un mensaje nuevo en un proxie.
async function enviarAvisoMensajeProxy(proxie, texto) {
    const asunto = 'Nuevo mensaje en un proxie';
    const mensaje = 'El cliente ' + (proxie.usuarioEmail || 'Cliente') + ' escribió en el proxie "' + (proxie.nombreCarta || 'sin nombre') + '":';
    return enviarAvisoAdmin(asunto, mensaje, String(texto || ''), '', proxie.id);
}

export { enviarAvisoPedido, enviarAvisoNuevoPedido, enviarAvisoNuevoProxy, enviarAvisoMensajeProxy };
