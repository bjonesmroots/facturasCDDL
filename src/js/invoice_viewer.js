$(document).ready(async function() {
    $("#viewer").hide();
    await initAfipConnection();
    let datos = datosContribuyenteFacturador;
    let comprobante = consultarCae(localStorage.getItem('selectedCae'));
    if (comprobante) {
        let cabecera = JSON.parse(comprobante.cabecera);
        let detalle = JSON.parse(comprobante.detalle);
        let cliente = JSON.parse(comprobante.cliente);
        $("#viewer").load(path.join(__dirname, 'invoice.html'));
        setTimeout(function() { cargarDatos(cabecera,detalle,cliente); }, 1000);
    }
});

function cargarDatos(cabecera,detalle,cliente) {
    $("#viewer").html($("#viewer").html().replace('#FACTURADOR_NOMBRE#','LITORAL FIAT'));
    $("#viewer").show();
}

function print(elem) {
    let element = document.getElementById('viewer');
    const ipcRenderer = require("electron").ipcRenderer;
    ipcRenderer.send('exportSelectionToPDF',element.innerHTML,localStorage.getItem('selectedCae'));
}