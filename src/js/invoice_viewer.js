$(document).ready(async function() {
    await initAfipConnection();
    let cuit = datosContribuyenteFacturador;
    $("#viewer").load(path.join(__dirname, 'invoice.html'));
});
