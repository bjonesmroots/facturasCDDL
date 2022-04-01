const ipcRenderer = require("electron").ipcRenderer;
const path        = require('path');
window.$ = window.jQuery = require('jquery');
ipcRenderer.on("printPDF", (event, content) => {
    $("#viewer").hide();
    let comprobante = consultarCae(localStorage.getItem('selectedCae'));
    if (comprobante) {
        let cabecera = JSON.parse(comprobante.cabecera);
        let detalle = JSON.parse(comprobante.detalle);
        let cliente = comprobante.cliente;
        try {
            cliente = JSON.parse(comprobante.cliente)
        } catch (e) {

        }
        $("#viewer").load(path.join(__dirname, 'invoice.html'));
        setTimeout(function() { cargarDatos(cabecera,detalle,cliente,comprobante); }, 1000);
    }
    ipcRenderer.send("readyToPrintPDF");
});


function cargarDatos(cabecera,detalle,cliente,comprobante) {
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_NOMBRE#','LITORAL FIAT'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_NOMBRE2#','Repuestos y Accesorios'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_NOMBRE3#','Nacionales e Importados'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_NOMBRE4#','de Jose A. Mercol'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_DIRECCION#','Eva Peron (ex Córdoba) 4899'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_CIUDAD#','2000 - Rosario'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_TELEFONO#','0341 - 4302123'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_CUIT#','20-11124498-8'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_ING_BRUTOS#','021-157110-4'));
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_INICIO_ACTIVIDADES#','01/04/1994'));
    $("#viewer").html($("#viewer").html().replace('#FECHA_COMPROBANTE#',parsearFecha(cabecera.CbteFch.toString())));
    $("#viewer").html($("#viewer").html().replace('#LETRA_COMPROBANTE#',parsearLetra(cabecera)));
    $("#viewer").html($("#viewer").html().replace('#CODIGO_COMPROBANTE#',parsearCodigo(cabecera)));
    $("#viewer").html($("#viewer").html().replace('#NUMERO_COMPROBANTE#',parsearNumeroComprobante(cabecera.CbteDesde)));
    $("#viewer").html($("#viewer").html().replace('#FECHA_VTO_COMPROBANTE#',parsearFecha(cabecera.CbteFch.toString())));
    $("#viewer").html($("#viewer").html().replace('#CAE_COMPROBANTE#', comprobante.cae));
    $("#viewer").html($("#viewer").html().replace('#VTO_CAE_COMPROBANTE#',parsearFechaCAE(comprobante.vto_cae.toString())));
    $("#viewer").html($("#viewer").html().replace('#TOTAL_COMPROBANTE#',parseFloat(cabecera.ImpTotal).toFixed(2)));
    $("#viewer").html($("#viewer").html().replace('#CONDICION_COMPROBANTE#',comprobante.cond_venta));
    $("#viewer").html($("#viewer").html().replace('#TIPO_COMPROBANTE#', ['1','6'].indexOf(cabecera.CbteTipo) != -1 ? 'FACTURA' : 'NOTA DE CREDITO'));
    cargarDatosContribuyente(cliente,cabecera);

    if (['1','3'].indexOf(cabecera.CbteTipo) != -1) {
        cargarDatosComprobanteA(cabecera);
    } else {
        cargarDatosComprobanteB(cabecera);
    }

    remplazarDetalles(detalle, ['1','3'].indexOf(cabecera.CbteTipo) != -1);
    $("#viewer").show();
}

function cargarDatosContribuyente(cliente,cabecera) {    
    $("#viewer").html($("#viewer").html().replace('#CLIENTE_CUIT#',cabecera.DocNro));
    if (typeof cliente === 'object') {
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_NOMBRE#',cliente.datosGenerales.razonSocial ?? cliente.datosGenerales.nombre + ' ' + cliente.datosGenerales.nombre));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_DIRECCION#',capitalizeFirstLetter(cliente.datosGenerales.domicilioFiscal.direccion)));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_CIUDAD#',cliente.datosGenerales.domicilioFiscal.localidad ?? cliente.datosGenerales.domicilioFiscal.datoAdicional));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_CP#',cliente.datosGenerales.domicilioFiscal.codPostal));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_PROVINCIA#',cliente.datosGenerales.domicilioFiscal.descripcionProvincia));
    } else {
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_NOMBRE#',cliente));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_DIRECCION#',''));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_CIUDAD#',''));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_CP#',''));
        $("#viewer").html($("#viewer").html().replace('#CLIENTE_PROVINCIA#',''));
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function remplazarDetalles(detalle, tieneIva) {
    for (let i = 0; i < 15; i++) {
        if (i + 1 <= detalle.length) {
            $("#viewer").html($("#viewer").html().replace('#DETALLE_DESC_' + (i+1) + '#',detalle[i].descripcion));
            $("#viewer").html($("#viewer").html().replace('#DETALLE_VALOR_' + (i+1) + '#', tieneIva ? detalle[i].neto : detalle[i].subtotal));
            $("#viewer").html($("#viewer").html().replace('#DETALLE_IVA_' + (i+1) + '#',tieneIva ? detalle[i].iva + '%' : ''));
        } else {
            $("#viewer").html($("#viewer").html().replace('#DETALLE_DESC_' + (i+1) + '#',''));
            $("#viewer").html($("#viewer").html().replace('#DETALLE_VALOR_' + (i+1) + '#',''));
            $("#viewer").html($("#viewer").html().replace('#DETALLE_IVA_' + (i+1) + '#',''));
        }
    }
}

function cargarDatosComprobanteA(cabecera) {
    $("#viewer").html($("#viewer").html().replace('#IVA21_TEXTO#','IVA 21%:'));
    $("#viewer").html($("#viewer").html().replace('#IVA105_TEXTO#','IVA 10.5%:'));
    $("#viewer").html($("#viewer").html().replace('#NETO_TEXTO#','Importe Neto Gravado: $'));
    $("#viewer").html($("#viewer").html().replace('#IVA_TEXTO#','IVA:'));
    $("#viewer").html($("#viewer").html().replace('#ALICUOTA_TEXTO#','Alicuota'));
    $("#viewer").html($("#viewer").html().replace('#ALICUOTA_IVA_TEXTO#','IVA'));
    $("#viewer").html($("#viewer").html().replace('#IVA_COMPROBANTE#',parseFloat(cabecera.ImpIVA).toFixed(2)));
    $("#viewer").html($("#viewer").html().replace('#NETO_COMPROBANTE#',parseFloat(cabecera.ImpNeto).toFixed(2)));
    $("#viewer").html($("#viewer").html().replace('#IVA105_COMPROBANTE#','0.00'));
    $("#viewer").html($("#viewer").html().replace('#IVA21_COMPROBANTE#',cabecera.Iva[0].Importe));
}

function cargarDatosComprobanteB(cabecera) {
    $("#viewer").html($("#viewer").html().replace('#IVA21_TEXTO#',''));
    $("#viewer").html($("#viewer").html().replace('#IVA105_TEXTO#',''));
    $("#viewer").html($("#viewer").html().replace('#NETO_TEXTO#',''));
    $("#viewer").html($("#viewer").html().replace('#IVA_TEXTO#',''));
    $("#viewer").html($("#viewer").html().replace('#ALICUOTA_TEXTO#',''));
    $("#viewer").html($("#viewer").html().replace('#ALICUOTA_IVA_TEXTO#',''));
    $("#viewer").html($("#viewer").html().replace('#IVA_COMPROBANTE#',''));
    $("#viewer").html($("#viewer").html().replace('#NETO_COMPROBANTE#',''));
    $("#viewer").html($("#viewer").html().replace('#IVA105_COMPROBANTE#',''));
    $("#viewer").html($("#viewer").html().replace('#IVA21_COMPROBANTE#',''));
}

function parsearFecha(fecha) {
    return fecha.substring(6,8) + '/' + fecha.substring(4,6) + '/' + fecha.substring(0,4);
}
function parsearFechaCAE(fecha) {
    return fecha.substring(8,10) + '/' + fecha.substring(5,7) + '/' + fecha.substring(0,4);
}
function parsearLetra(cabecera) {
    return ['1','3'].indexOf(cabecera.CbteTipo) != -1 ? 'A' : 'B';
}

function parsearCodigo(cabecera) {
    return ('0' + cabecera.CbteTipo).slice(-2);
}

function parsearNumeroComprobante(numero) {
    return ('00000000' + numero).slice(-8);
}