$(document).ready(async function() {
    await initAfipConnection();
    let datos = datosContribuyenteFacturador;
    let comprobante = consultarCae(selectedCae);    
    $("#viewer").load(path.join(__dirname, 'invoice.html'));
});
