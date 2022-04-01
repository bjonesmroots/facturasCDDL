const electronDB   = require('@electron/remote');
const assestPathDB = electronDB.app.getPath("userData");
function createTable() {
    const db = require('better-sqlite3')(assestPathDB + '/facturasCDDL.db', {});
    db.prepare("CREATE TABLE if not exists comprobantes (cae TEXT PRIMARY KEY, cuit TEXT, cliente TEXT, cabecera TEXT, detalle TEXT, vto_cae TEXT, cond_venta TEXT)").run();
    db.close();
}

function insertarComprobante(cae, cliente, cabecera, detalle, vto_cae, cond_venta) {
    const db = require('better-sqlite3')(assestPathDB + '/facturasCDDL.db', {});
    db.prepare("INSERT INTO comprobantes (cae, cuit, cliente, cabecera, detalle, vto_cae, cond_venta) VALUES ('" + cae +"','" + datosContribuyenteFacturador.datosGenerales.idPersona +"','" + cliente +"','" + cabecera +"','" + detalle +"','" + vto_cae +"','" + cond_venta +"')").run();
    db.close();
}

function consultarCae(cae) {
    const db = require('better-sqlite3')(assestPathDB + '/facturasCDDL.db', {});
    result = null;
    result = db.prepare("SELECT * FROM comprobantes WHERE cae='" + cae + "'").get();
    db.close();
    return result;
}