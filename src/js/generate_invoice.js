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
});

async function filtrarTiposFactura() {
    if (datosContribuyenteFacturador.datosRegimenGeneral) {
        $('#invoiceType').html('<option selected value="1">Factura A</option><option value="6">Factura B</option><option value="3">Nota Credito A</option><option value="8">Nota Credito B</option>');
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
        } else {
            errorMessage("No existe el cuit indicado");
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
    if ($(tipoDocumento).val() == 99) {
        $('#cuit').attr('disabled','disabled');
        $('#cuit').val('');
        if (datosContribuyenteFacturador.datosRegimenGeneral) {
            $('#invoiceType').val(6);
            $('#condicionIva').val(0);
        }
    } else {
        $('#lblCuit').text($('#tipoDocumento option:selected').text());
        $('#cuit').removeAttr('disabled');
    }
}

async function generateInvoice(elem) {
    let btn    = $(elem),
        fields = $("#invoice-fields");

    if (!submitSpinner(btn, fields) && validateForm()) {
        await generateAfipInvoice();
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
    
            if (amount > 0 && amount < 7600) {
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
