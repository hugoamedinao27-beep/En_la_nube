// Avisos por correo al cliente usando EmailJS (https://dashboard.emailjs.com).
// Completar EMAILJS con los datos del panel. Mientras esten vacios, no se
// envian correos (solo se avisa por consola) y el pedido se actualiza igual.
import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';

const EMAILJS = {
    publicKey: '',
    serviceId: '',
    templateId: ''
};

// Texto que aparece en el correo cuando el pedido queda listo para retiro.
const MENSAJE_RETIRO = 'Su pedido ya está en el lugar acordado. Nos vemos en una próxima aventura.';

const ASUNTOS = {
    listo_para_despacho: 'Tu pedido ya está listo, Hechicero',
    entregado: '¡Gracias por tu compra!'
};

const MENSAJES = {
    listo_para_despacho: MENSAJE_RETIRO,
    entregado: 'Registramos la entrega de tu pedido. ¡Gracias por jugar con nosotros!'
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

export { enviarAvisoPedido };
