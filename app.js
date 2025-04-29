// Variables globales
let nombre = '';
let opcion = '';
let gpsRetryCount = 0;
const MAX_GPS_RETRIES = 3;
const WHATSAPP_NUMBER = '573204006436';

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar Feather Icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
  
  // Iniciar la aplicación después de un tiempo breve
  setTimeout(() => {
    document.getElementById('pantalla-video').style.display = 'none';
    document.getElementById('pantalla-01').style.display = 'flex';
  }, 3000);
  
  // Agregar evento de enter para el campo de nombre
  document.getElementById('nombreUsuario').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      aceptarNombre();
    }
  });
  
  // Agregar evento de enter para el campo de destino
  document.getElementById('destino').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      solicitarGPSDestino();
    }
  });
});

/**
 * Valida y guarda el nombre del usuario, luego muestra la pantalla de selección de servicio
 */
function aceptarNombre() {
  nombre = document.getElementById('nombreUsuario').value.trim();
  if (nombre === '') {
    mostrarError('Por favor ingresa tu nombre');
    return;
  }
  
  // Limitar el nombre a 20 caracteres para prevenir problemas con WhatsApp
  if (nombre.length > 20) {
    nombre = nombre.substring(0, 20);
  }
  
  // Sanear el nombre para evitar problemas con la URL de WhatsApp
  nombre = nombre.replace(/[^\w\s]/gi, '');
  
  ocultarTodasLasPantallas();
  document.getElementById('saludo').innerText = `Hola ${nombre}, ¿qué deseas hacer hoy?`;
  document.getElementById('pantalla-02').style.display = 'flex';
}

/**
 * Maneja la selección de servicio y navega a la pantalla correspondiente
 * @param {string} op - La opción seleccionada (Taxi, Mototaxi, Domicilio, Pago de facturas)
 */
function seleccionarOpcion(op) {
  opcion = op;
  if (op === 'Taxi' || op === 'Mototaxi') {
    ocultarTodasLasPantallas();
    document.getElementById('pantalla-03').style.display = 'flex';
  } else {
    solicitarGPSDirecto();
  }
}

/**
 * Solicita la ubicación del usuario para servicios diferentes a transporte
 */
function solicitarGPSDirecto() {
  ocultarTodasLasPantallas();
  document.getElementById('pantalla-gps').style.display = 'flex';
  solicitarGPS(
    (lat, lon) => {
      enviarSolicitudConGPS(`Hola, soy ${nombre}. Solicito ${opcion}.`, lat, lon);
    },
    () => {
      ocultarTodasLasPantallas();
      document.getElementById('pantalla-error-gps').style.display = 'flex';
    }
  );
}

/**
 * Procesa la solicitud de destino y ubicación para servicios de transporte
 */
function solicitarGPSDestino() {
  const destino = document.getElementById('destino').value.trim();
  if (destino === '') {
    mostrarError('Por favor ingresa tu destino');
    return;
  }
  
  ocultarTodasLasPantallas();
  document.getElementById('pantalla-gps').style.display = 'flex';
  
  solicitarGPS(
    (lat, lon) => {
      enviarSolicitudConGPS(`Hola, soy ${nombre}. Deseo un ${opcion} hacia: ${destino}.`, lat, lon);
    },
    () => {
      ocultarTodasLasPantallas();
      document.getElementById('pantalla-error-gps').style.display = 'flex';
    }
  );
}

/**
 * Vuelve a la pantalla de selección de servicio
 */
function volverSeleccion() {
  ocultarTodasLasPantallas();
  document.getElementById('pantalla-02').style.display = 'flex';
}

/**
 * Reintenta obtener la ubicación GPS
 */
function reintentarGPS() {
  if (gpsRetryCount >= MAX_GPS_RETRIES) {
    mostrarError('Has excedido el número máximo de intentos. Por favor, intenta más tarde.');
    return;
  }
  
  gpsRetryCount++;
  ocultarTodasLasPantallas();
  document.getElementById('pantalla-gps').style.display = 'flex';
  
  if (opcion === 'Taxi' || opcion === 'Mototaxi') {
    const destino = document.getElementById('destino').value.trim();
    solicitarGPS(
      (lat, lon) => {
        enviarSolicitudConGPS(`Hola, soy ${nombre}. Deseo un ${opcion} hacia: ${destino}.`, lat, lon);
      },
      () => {
        ocultarTodasLasPantallas();
        document.getElementById('pantalla-error-gps').style.display = 'flex';
      }
    );
  } else {
    solicitarGPS(
      (lat, lon) => {
        enviarSolicitudConGPS(`Hola, soy ${nombre}. Solicito ${opcion}.`, lat, lon);
      },
      () => {
        ocultarTodasLasPantallas();
        document.getElementById('pantalla-error-gps').style.display = 'flex';
      }
    );
  }
}

/**
 * Continúa el proceso sin información de GPS
 */
function continuarSinGPS() {
  if (opcion === 'Taxi' || opcion === 'Mototaxi') {
    const destino = document.getElementById('destino').value.trim();
    const mensaje = `Hola, soy ${nombre}. Deseo un ${opcion} hacia: ${destino}. (No se pudo obtener ubicación)`;
    enviarWhatsApp(mensaje);
  } else {
    const mensaje = `Hola, soy ${nombre}. Solicito ${opcion}. (No se pudo obtener ubicación)`;
    enviarWhatsApp(mensaje);
  }
}

/**
 * Solicita la ubicación GPS del usuario
 * @param {Function} callback - Función de éxito que recibe las coordenadas
 * @param {Function} fallback - Función de error a ejecutar si falla la obtención
 */
function solicitarGPS(callback, fallback) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Reiniciar contador de intentos cuando es exitoso
        gpsRetryCount = 0;
        callback(lat, lon);
      },
      error => {
        console.error('Error obteniendo ubicación', error);
        fallback();
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  } else {
    console.error('Geolocalización no soportada');
    fallback();
  }
}

/**
 * Genera el mensaje y envía la solicitud de servicio con la ubicación GPS
 * @param {string} mensajeBase - El texto base del mensaje
 * @param {number} lat - Latitud
 * @param {number} lon - Longitud
 */
function enviarSolicitudConGPS(mensajeBase, lat, lon) {
  const linkMaps = `https://maps.google.com/?q=${lat},${lon}`;
  const mensaje = `${mensajeBase} Mi ubicación es: ${linkMaps}`;
  enviarWhatsApp(mensaje);
}

/**
 * Envía el mensaje a WhatsApp usando la URL API
 * @param {string} mensaje - El mensaje completo a enviar
 */
function enviarWhatsApp(mensaje) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
  window.location.href = url;
}

/**
 * Muestra un mensaje de error utilizando la API nativa del navegador
 * @param {string} mensaje - El mensaje de error a mostrar
 */
function mostrarError(mensaje) {
  alert(mensaje);
}

/**
 * Oculta todas las pantallas de la aplicación
 */
function ocultarTodasLasPantallas() {
  const pantallas = document.querySelectorAll('.pantalla');
  pantallas.forEach(pantalla => {
    pantalla.style.display = 'none';
  });
}
