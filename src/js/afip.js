const Afip          = require('@afipsdk/afip.js');
const activeWindow  = electron.getCurrentWindow();
const tempPath      = electron.app.getPath("temp");
let afip, lastInvoiceNumber, lastInvoiceDate, cliente;
const production = false;
async function initAfip() {
    afip = await getAfipUser();

    if (!afip) {
        configurationError();
    }
    else if (!await isServerOnline()) {
        connectionError();
    }
    else if (!await isAuthenticated()) {
        configurationError();
    } 
    else if (!await getPointsOfSale()) {
        pointOfSaleError();
    }

    await updateLastInvoice();
    return afip;
}

async function getAfipUser() {
    let cuit = await getCuit(),
        data = new Afip({ 
        CUIT      : cuit, 
        res_folder: assestPath,
        ta_folder : tempPath,
        cert      : "cert.crt", 
        key       : "key.key",
        production: production
    });

    return cuit ? data : null;
}

async function getContribuyente(cuit) {
    try {
        let response = await afip.RegisterScopeFive.getTaxpayerDetails(parseInt(cuit));
      
        return response;
    } 
    catch (e) {
        errorMessage(e);
    }

    return false;
}

async function getPointsOfSale() {
    try {
        let input  = $("#pointOfSale");
        let points = [{
            'Nro':1,
            'EmisionTipo':'TEST'
        }];
        let pointsAfip = [];
        if (production) {
            pointsAfip = await afip.ElectronicBilling.getSalesPoints();
            if (pointsAfip) {
                points = pointsAfip;
            }
        }
            
        if (input.length && points && points.length) {
            points.forEach(point => {
                input.append($("<option />", { html: `${point.Nro}: ${point.EmisionTipo}`, value: point.Nro }));
            });
    
            if (points.length == 1) {
                input.attr("disabled", "");
            }
            else {
                input.removeAttr("disabled");
            }
        }

        return points && points.length;
    } 
    catch (e) {
        errorMessage(e);
    }

    return false;
}

async function getLastInvoice() {
    try {
        let pointOfSale = $("#pointOfSale").val();
        if (pointOfSale) {
            return await afip.ElectronicBilling.getLastVoucher(pointOfSale, $("#invoiceType").val());
        } else {
            return null;
        }
    } 
    catch (e) {
        errorMessage(e);
        return null;
    }
}

async function getInvoiceInfo(invoice) {
    try {
        let pointOfSale = $("#pointOfSale").val();
        return await afip.ElectronicBilling.getVoucherInfo(invoice, pointOfSale, $("#invoiceType").val());
    } 
    catch (e) {
        errorMessage(e);
        return null;
    }
}

async function getInvoicesListInfo(dateFrom, dateTo) {
    let invoicesList = [];

    try {
        let POS      = $("#pointOfSale").val(),
            invoices = new Uint16Array([...Array(lastInvoiceNumber + 1).keys()]).subarray(1),
            first    = await binaryInvoiceDateSearch(invoices, dateFrom),
            last     = await binaryInvoiceDateSearch(invoices, dateTo),
            inRange  = invoices.subarray(first, last),
            data;
            
        for (let i = 0; i < inRange.length; i++) {
            data = await afip.ElectronicBilling.getVoucherInfo(inRange[i], POS, $("#invoiceType").val());
            invoicesList.push(data);
        }
    } 
    catch (e) {
        errorMessage(e);
    }
    
    return invoicesList;
}

async function getLastInvoiceDate() {
    try {
        let invoice = await getLastInvoice();
        if (invoice) {
            let info = await getInvoiceInfo(invoice);
            return parseInvoiceDate(info.CbteFch);
        }
        return null;
    } 
    catch (e) {
        errorMessage(e);
        return null;
    }
}

async function generateAfipInvoice() {
    if (!await isServerOnline()) {
        errorMessage("El servidor de la AFIP no se encuentra disponible. Intente nuevamente más tarde.");
    }

    try {
        let lastInvoice = await getLastInvoice(),
            invoiceData = await getInvoiceData(lastInvoice);
        console.log(lastInvoice);
        console.log(invoiceData);
        let sentInvoiceData = JSON.stringify(invoiceData);
        let cae = await afip.ElectronicBilling.createVoucher(invoiceData).then((data, err) => {
            if (err || !data.CAE) {
                errorMessage("Se produjo un error al generar la factura.");
                return null;
            }
            let datosCliente = $('#razonSocial').val();
            if (cliente) {
                datosCliente = JSON.stringify(cliente);
            }
            sentInvoiceData = JSON.parse(sentInvoiceData);
            sentInvoiceData.CAEFchVto = data.CAEFchVto;
            sentInvoiceData.condicionVenta =  $("#condicionVenta").val();
            sentInvoiceData.condicionVentaExtra =  $("#condicionVentaExtra").val();
            sentInvoiceData.condicionIVA =  $("#condicionIva option:selected").text();
            insertarComprobante(data.CAE, datosCliente, JSON.stringify(sentInvoiceData), JSON.stringify(getInvoiceDetails()));
            invoiceGenerated(lastInvoice + 1, invoiceData.CbteFch);
            return data.CAE;
        });
        return cae;
    } catch (e) {
        errorMessage(e);
    }
    return null;
}

function getInvoiceDetails() {
    let detalles = [];
    $(".detalle-item").each(function (index) {
        detalles.push({
            'codigo': $($(this).find('.codigo')).val(),
            'descripcion': $($(this).find('.detalle')).val(),
            'iva': $($(this).find('.iva')).val(),
            'neto': $($(this).find('.neto')).val(),
            'subtotal': $($(this).find('.amount')).val()
        })
    });
    return detalles;
}

async function getInvoiceData(lastInvoice) {
    let concept     = $("#concept").val(),
        pointOfSale = $("#pointOfSale").val(),
        cbteTipo    = $("#invoiceType").val(),
        cbteAsoc    = $("#cbteAsoc").val(),
        docTipo     = $("#tipoDocumento").val(),
        docNro      = $("#cuit").val() == '' ? 0 : $("#cuit").val(),
        date        = $("#date").val(),
        amount      = getInvoiceAmount(cbteTipo),
        neto        = getInvoiceNeto(cbteTipo),
        impIva      = getInvoiceIVA(cbteTipo),
        dateParsed  = serializeInvoiceDate(date),
        serviceDate = parseInt(concept) > 1 ? dateParsed : null,
        currVoucher = lastInvoice + 1,
        iva         = getInvoiceIVAOBJ(cbteTipo)
        invoiceData = {
            'CantReg' 		: 1,            // Cantidad de comprobantes a registrar
            'PtoVta' 		: pointOfSale,  // Punto de venta
            'CbteTipo' 		: cbteTipo,     // Tipo de comprobante (11 Factura C)
            'Concepto' 		: concept,      // Concepto del Comprobante: (1) Productos, (2) Servicios, (3) Productos y Servicios
            'DocTipo' 		: docTipo,      // Tipo de documento del comprador (99 consumidor final)
            'DocNro' 		: docNro,       // Número de documento del comprador (0 consumidor final)
            'CbteDesde' 	: currVoucher,  // Numero de comprobante o numero del primer comprobante en caso de ser mas de uno
            'CbteHasta' 	: currVoucher,  // Numero de comprobante o numero del ultimo comprobante en caso de ser mas de uno
            'CbteFch' 		: dateParsed,   // (Opcional) Fecha del comprobante (yyyymmdd) o fecha actual si es nulo
            'FchServDesde' 	: serviceDate,  // (Opcional) Fecha de inicio del servicio (yyyymmdd), obligatorio para Concepto 2 y 3
            'FchServHasta' 	: serviceDate,  // (Opcional) Fecha de fin del servicio (yyyymmdd), obligatorio para Concepto 2 y 3
            'FchVtoPago' 	: serviceDate,  // (Opcional) Fecha de vencimiento del servicio (yyyymmdd), obligatorio para Concepto 2 y 3
            'ImpTotal' 		: amount,       // Importe total del comprobante
            'ImpTotConc' 	: 0,            // Importe neto no gravado
            'ImpNeto' 		: neto,       // Importe neto gravado
            'ImpOpEx' 		: 0,            // Importe exento de IVA
            'ImpIVA' 		: impIva,          // Importe total de IVA
            'ImpTrib' 		: 0,            // Importe total de tributos
            'MonId' 		: 'PES',        // Tipo de moneda usada en el comprobante ('PES' para pesos argentinos) 
            'MonCotiz' 		: 1,            // Cotización de la moneda usada (1 para pesos argentinos)  
        };
        if (iva) {
            invoiceData.Iva = iva;
        }
        if (['3','8','13'].indexOf(cbteTipo) != -1  && cbteAsoc && cbteAsoc != '') {
            invoiceData.CbtesAsoc = {
                'Tipo': cbteTipo == 3 ? 1 : (cbteTipo == 8 ? 6 : 11),
                'PtoVta': pointOfSale,
                'Nro': cbteAsoc,
            };
        }
    return invoiceData;
}

function getInvoiceAmount(cbteTipo) {
    let amount = 0;
    $(".amount").each(function (index) {
        let value  = $(this).val();
        amount += parseFloat(value);
    });

    return amount;
}

function getInvoiceNeto(cbteTipo) {
    let amount = 0;
    if (['11','13'].includes(cbteTipo)) {
        $(".amount").each(function (index) {
            let value  = $(this).val();
            amount += parseFloat(value);
        });
    } else {
        $(".amount").each(function (index) {
            let item = $(this).closest('.detalle-item');
            let iva = $(item).find('.iva');
            amount += parseFloat($(this).val()) / ((1+(parseFloat($(iva).val()))/100));
        });
    }

    return amount.toFixed(2);
}

function getInvoiceIVA(cbteTipo) {
    if (['11','13'].includes(cbteTipo)) {
        return 0;
    }
    let iva = 0;
    $(".amount").each(function (index) {
        iva += calculateIVA(this);
    });

    return iva.toFixed(2);
}

function getInvoiceIVAOBJ(cbteTipo) {
    if (['11','13'].includes(cbteTipo)) {
        return null;
    }
    let iva21 = calculateIVAOBJ('21');
    let iva105 = calculateIVAOBJ('10.5');
    let iva0 = calculateIVAOBJ('0');
    let iva27 = calculateIVAOBJ('27');

    return iva21.concat(iva105).concat(iva0).concat(iva27)
}

function calculateIVA(input) {
    let item = $(input).closest('.detalle-item');
    let iva = $(item).find('.iva');
    let neto = $(item).find('.neto');
    let amount = parseFloat($(input).val());
    let netoVal = amount / ((1+(parseFloat($(iva).val()))/100));
    return amount - netoVal;
}

function calculateIVAOBJ(ivaVal) {
    let amount = 0;
    let netoVal = 0;
    $(".amount").each(function (index) {
        let item = $(this).closest('.detalle-item');
        let iva = $(item).find('.iva');
        if ($(iva).val() == ivaVal) {
            amount += parseFloat($(this).val());
            netoVal += parseFloat($(this).val()) / ((1+(parseFloat($(iva).val()))/100));
        }
    });
    if (amount != 0) {
        return [{
            'Id': ivaVal == '10.5' ? '4' : (ivaVal == '21' ? '5' : (ivaVal == '27' ? '6' : '3')),
            'BaseImp': netoVal.toFixed(2),
            'Importe': (amount - netoVal).toFixed(2),
        }];
    } else {
        return [];
    }
}

function serializeInvoiceDate(date) {
    let parsed = getDate(date),
        offset = new Date().getTimezoneOffset() * 60000;

    return parseInt(new Date(parsed).toISOString().split('T')[0].replace(/-/g, ''))
}

function parseInvoiceDate(date) {
    let year  = date.substr(0, 4),
        month = date.substr(4, 2),
        day   = date.substr(6, 2);

    return new Date(year, month - 1, day);
}

function parseInvoiceConcept(concept) {
    switch (concept) {
        case 1:
            return "Productos";
        case 2:
            return "Servicios";
        case 3:
            return "Productos y Servicios";
        default:
            return "Error al parsear el concepto";
    }
}

function invoiceGenerated(invoiceNumber, invoiceDate) {
    let btn    = $("#generateInvoice"),
        fields = $("#invoice-fields");

    $("#amount").val("");
    updateLastInvoice(invoiceNumber, invoiceDate);
    submitSpinner(btn, fields, false);
    successMessage(`Comprobante nº ${invoiceNumber} generado correctamente.`);
    updateDatePicker();
    limpiarDetalles();
}

async function updateLastInvoice(number, date) {
    lastInvoiceNumber = number ? parseInt(number.toString()) : await getLastInvoice();
    lastInvoiceDate = date ? parseInvoiceDate(date.toString()) : await getLastInvoiceDate();
}

async function isServerOnline() {
    return await afip.ElectronicBilling.getServerStatus().then(async function(status) {
        if (!status || status.AppServer != "OK" || status.DbServer != "OK" || status.AuthServer != "OK") {
            return false;
        }
        
        return true;
    }).catch(_ => false);
}

async function isAuthenticated() {
    return await afip.ElectronicBilling.getWSInitialRequest().then(async function(data) {
        if (!data || !data.Auth || !data.Auth.Cuit) {
            return false;
        }
        
        return true;
    }).catch(_ => false);
}

function configurationError() {
    activeWindow.loadFile(path.join(__dirname, 'error/configuration.html'));
}

function connectionError() {
    activeWindow.loadFile(path.join(__dirname, 'error/connection.html'));
}

function pointOfSaleError() {
    activeWindow.loadFile(path.join(__dirname, 'error/point_of_sale.html'));
}

async function binaryInvoiceDateSearch(list, date) {
    let from = 0, to = lastInvoiceNumber - 1, m, i, d;

    while (from  <= to) {
        m = parseInt(from + (to - from) / 2);
        i = await getInvoiceInfo(list[m]);
        d = parseInvoiceDate(i.CbteFch);

        if (d < date) {
            from = m + 1;
        } 
        else {
            to = m - 1;
        }
    }

    return to + 1;
}
