function createTable() {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(assestPath + '/facturasCDDL.db');
    db.serialize(function() {
        db.run("CREATE TABLE if not exists comprobantes (cae TEXT PRIMARY KEY, cuit TEXT, cabecera TEXT, detalle TEXT)");
    });
    db.close();
}

function insertarComprobante(cae, cabecera, detalle) {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(assestPath + '/facturasCDDL.db');
    db.serialize(function() {
        db.run("INSERT INTO comprobantes (cae, cuit, cabecera, detalle) VALUES ('" + cae +"','" + datosContribuyenteFacturador.datosGenerales.idPersona +"','" + cabecera +"','" + detalle +"')");
    });
    db.close();
}

function consultarCae(cae) {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(assestPath + '/facturasCDDL.db');
    result = null;
    db.each("SELECT * FROM comprobantes WHERE cae='" + cae + "'", function(err, row) {
        result = row;
    });
    db.close();
    return result;
}