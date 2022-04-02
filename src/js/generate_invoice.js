$(document).ready(async function() {
    let btn    = $("#generateInvoice"),
        fields = $("#invoice-fields"),
        tipoDocumento = $('#tipoDocumento');
    createTable();
    submitSpinner(btn, fields);
    await initAfipConnection();
    filtrarTiposFactura();
    bindDatePicker();
    updateDatePicker().setDate(new Date(Date.now()));
    submitSpinner(btn, fields, false);

    tipoDocumento.on("change", function() {
        handleTipoDocumento(tipoDocumento);
    });
    initAmountHandlers();
    $('#cuit').on('keypress',function(e) {
        if(e.which == 13 && ['80','86'].indexOf(tipoDocumento.val()) != -1) {
           consultarCuit();
        }
    });
    $('#cuit').on("change", function() {
        if(['80','86'].indexOf(tipoDocumento.val()) != -1) {
           consultarCuit();
        }
    });
    $('#invoiceType').on("change", function() {
        if(['3','8','13'].indexOf($('#invoiceType').val()) != -1) {
            $('#cbteAsoc').removeAttr('disabled');
        } else {
            $('#cbteAsoc').val('');
            $('#cbteAsoc').attr('disabled','disabled');
        }
    });
    tipoDocumento.val(96);
    handleTipoDocumento(tipoDocumento);
});

async function filtrarTiposFactura() {
    if (datosContribuyenteFacturador.datosRegimenGeneral) {
        $('#invoiceType').html('<option value="1">Factura A</option><option selected value="6">Factura B</option><option value="3">Nota Credito A</option><option value="8">Nota Credito B</option>');
    } else if (datosContribuyenteFacturador.datosMonotributo) {
        $('#invoiceType').html('<option selected value="11">Factura C</option><option value="13">Nota Credito C</option>');
    }
}

function initAmountHandlers() {
    $('.amount').on("change", function() {
        handleAmount(this);
    });
    
    $('.iva').on("change", function() {
        let item = $(this).closest('.detalle-item');
        let amount = $(item).find('.amount');
        handleAmount(amount);
    });
}

function consultarCuit() {
    let input  = $("#cuit");
     getContribuyente(input.val()).then(contribuyente => {
        if (contribuyente && contribuyente.datosGenerales) {
            cliente = contribuyente;
            if (contribuyente.datosGenerales.tipoPersona == 'FISICA') {
                $('#razonSocial').val(contribuyente.datosGenerales.nombre + ' ' + contribuyente.datosGenerales.apellido);
            } else {
                $('#razonSocial').val(contribuyente.datosGenerales.razonSocial);
            }
            if (contribuyente.datosRegimenGeneral) {
                $('#condicionIva').val(11);
            } else if (contribuyente.datosMonotributo) {
                $('#condicionIva').val(6);
            } else {
                $('#condicionIva').val(0);
            }
            if (datosContribuyenteFacturador.datosRegimenGeneral && $('#condicionIva').val() == 11) {
                $('#invoiceType').val(1);
            } else if (datosContribuyenteFacturador.datosRegimenGeneral && $('#condicionIva').val() != 11) {
                $('#invoiceType').val(6);
            } else if (!datosContribuyenteFacturador.datosRegimenGeneral) {
                $('#invoiceType').val(11);
            }
            $('#generateInvoice').removeAttr('disabled');
        } else {
            cliente = null;
            errorMessage("No existe el cuit indicado");
            $('#generateInvoice').attr('disabled','disabled');
        }
    });   
}

function handleAmount(input) {
    let item = $(input).closest('.detalle-item');
    let iva = $(item).find('.iva');
    let neto = $(item).find('.neto');
    let amount = parseFloat($(input).val());
    let netoVal = amount / ((1+(parseFloat($(iva).val()))/100));
    $(neto).val(netoVal.toFixed(2));
}

function handleTipoDocumento() {
    cliente = null;
    $('#generateInvoice').removeAttr('disabled');
    $('#razonSocial').attr('disabled','disabled');
    $('#cuit').attr('disabled','disabled');
    if ($(tipoDocumento).val() == 99 || $(tipoDocumento).val() == 96) {
        $('#razonSocial').val('CONSUMIDOR FINAL');
        $('#cuit').val('');
        $('#generateInvoice').removeAttr('disabled');
        if (datosContribuyenteFacturador.datosRegimenGeneral) {
            $('#invoiceType').val(6);
            $('#condicionIva').val(0);
        }
        if ($(tipoDocumento).val() == 96) {
            $('#lblCuit').text($('#tipoDocumento option:selected').text());
            $('#cuit').removeAttr('disabled');
            $('#razonSocial').removeAttr('disabled');
            $('#razonSocial').val('');
        }
    }
    else {
        $('#razonSocial').val('');
        $('#lblCuit').text($('#tipoDocumento option:selected').text());
        $('#cuit').removeAttr('disabled');
    }
}

async function generateInvoice(elem) {
    let btn    = $(elem),
        fields = $("#invoice-fields");

    if ($(tipoDocumento).val() == 96) {
        if ($('#razonSocial').val() == '' || $('#cuit').val() == '') {
            errorMessage('Error en datos del contribuyente.')
            return;
        }
    }
    if ($(tipoDocumento).val() == 80 || $(tipoDocumento).val() == 86) {
        if (!cliente) {
            errorMessage('Error en datos del contribuyente.')
            return;
        }
    }
    if (!submitSpinner(btn, fields) && validateForm()) {
        let cae = await generateAfipInvoice();
        if (cae) {
            localStorage.setItem('selectedCae', cae);
            localStorage.setItem('selectedCaePrint', 'true');
            localStorage.setItem('selectedCaeSavePdf', 'true');
            const ipcRenderer = require("electron").ipcRenderer;
            ipcRenderer.send("printPDF", '');
        }
    }

    submitSpinner(btn, fields, false);
}

function agregarDetalle() {
    $("#detalle").append('<div class="field is-grouped detalle-item">'+$($(".detalle-item")[0]).html()+'</div>');
    initAmountHandlers();
}

function limpiarDetalles() {
    let detalle = '<div class="field is-grouped detalle-item">'+$($(".detalle-item")[0]).html()+'</div>';
    $("#detalle").html(detalle);
    $('#condicionVentaExtra').val('');
    $('#cuit').val('');
    $('#razonSocial').val('');
    $('#tipoDocumento').val(96);
    $('#invoiceType').val(6);
    $('#condicionVenta').val('Contado');
    initAmountHandlers();
}

function bindDatePicker() {
    let concept     = $("#concept"),
        pointOfSale = $("#pointOfSale");

    concept.on("change", updateDatePicker);
    pointOfSale.on("change", function() {
        updateLastInvoiceDate();
    });
}

function updateDatePicker() {
    let concept   = $("#concept").val(),
        date      = $("#date"),
        oldPicker = $(".datepicker"),
        minDate   = addDate(new Date(), concept > 1 ? -10 : -5);

    if (oldPicker.length) {
        oldPicker.remove();
    }
    
    if (lastInvoiceDate && lastInvoiceDate > minDate) {
        minDate = lastInvoiceDate;
    }

    return generateDatePicker(date, minDate);
}

function validateForm() {
    return validateDatePicker() && validateAmount();
}

function validateAmount() {
    let errors = false;
    $(".amount").each(function (index) {
        try {
            let value  = $(this).val(),
                amount = parseFloat(value);
    
            if (amount != 0) {
                errors = true;
            }
        } 
        catch (e) {
            errorMessage(e);
        }    
        invalidInput($(this));
    });

    return errors;
}
