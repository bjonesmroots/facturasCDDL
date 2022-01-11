$(document).ready(async function() {
    let btn    = $("#generateInvoice"),
        fields = $("#invoice-fields"),
        tipoDocumento = $('#tipoDocumento');

    submitSpinner(btn, fields);
    await initAfipConnection();
    bindDatePicker();
    updateDatePicker().setDate(new Date(Date.now()));
    submitSpinner(btn, fields, false);

    tipoDocumento.on("change", function() {
        handleTipoDocumento(tipoDocumento);
    });
    $('.amount').on("change", function() {
        handleAmount(this);
    });
    
    $('.iva').on("change", function() {
        let item = $(this).closest('.item');
        let amount = $(item).find('.amount');
        handleAmount(amount);
    });
    $('#cuit').on('keypress',function(e) {
        if(e.which == 13 && ['80','86'].indexOf(tipoDocumento.val()) != -1) {
           consultarCuit();
        }
    });
});

function consultarCuit() {
    let input  = $("#cuit");
     getContribuyente(input.val()).then(contribuyente => {
        if (contribuyente && contribuyente.datosGenerales) {
            if (contribuyente.datosGenerales.tipoPersona == 'FISICA') {
                $('#razonSocial').val(contribuyente.datosGenerales.nombre + ' ' + contribuyente.datosGenerales.apellido);
            } else {
                $('#razonSocial').val(contribuyente.datosGenerales.razonSocial);
            }
        } else {
            alert("No existe el cuit indicado");
        }
    });
   
}

function handleAmount(input) {
    let item = $(input).closest('.item');
    let iva = $(item).find('.iva');
    let neto = $(item).find('.neto');
    let amount = parseFloat($(input).val());
    let netoVal = amount / ((1+(parseFloat($(iva).val()))/100));
    $(neto).val(netoVal.toFixed(2));
}

function handleTipoDocumento() {
    if ($(tipoDocumento).val() == 99) {
        $('#cuit').attr('disabled','disabled');
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
        updateDatePicker();
    }

    submitSpinner(btn, fields, false);
}

function agregarDetalle() {
    $("#detalle").append('<div class="field is-grouped item">'+$($(".item")[0]).html()+'</div>');
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
