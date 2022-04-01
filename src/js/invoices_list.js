$(document).ready(async function() {
    let btn    = $("#loadMore"),
        fields = $("#invoice-fields");

    submitSpinner(btn, fields);
    await initAfipConnection();
    bindPointOfSale();
    updateDateRangePicker().setDates(addDate(new Date(), -1), new Date());
    submitSpinner(btn, fields, false);
});

function bindPointOfSale() {
    let input  = $("#pointOfSale"),
        search = $("#searchInvoices"),
        fields = $("#invoice-fields");

    input.on("change", async function() {
        submitSpinner(search, fields);
        await updateLastInvoice();
        submitSpinner(search, fields, false);
    });
}

function updateDateRangePicker() {
    let range     = $("#range"),
        oldPicker = $(".datepicker");

    if (oldPicker.length) {
        oldPicker.remove();
    }

    return generateDateRangePicker(range);
}

async function searchInvoices(elem) {
    let btn    = $(elem),
        fields = $("#filter-fields");

    if (!submitSpinner(btn, fields) && validateDatePicker(2)) {
        await updateLastInvoice();
        await searchAfipInvoices();
    }

    submitSpinner(btn, fields, false);
}

async function searchAfipInvoices() {
    let spinner  = $("#invoices-loader"),
        list     = $("#invoices-list"),
        template = $("#invoice-list-item-template"),
        noData   = $("#invoice-list-no-items"),
        items    = $(".invoice-list-item:not([id])"),
        total    = $("#invoices-total");

    spinner.addClass("is-active");
    noData.addClass("is-hidden");
    total.addClass("is-hidden");
    items.remove();
    
    if (lastInvoiceNumber > 0) {
        let from = $("[name='start']").val(),
            to   = $("[name='end']").val(),
            invs = await getInvoicesListInfo(getDate(from), addDate(getDate(to), 1)),
            clone, totalAmount;

        if (invs.length) {
            totalAmount = invs.reduce((a, b) => a + (parseInt(b["ImpTotal"]) || 0), 0);
            invs.reverse().forEach(invoice => {
                clone = template.clone();
                
                clone.removeAttr("id");
                clone.removeClass("is-hidden");
                clone.find(".invoice-number").html(invoice.CbteDesde);
                clone.find(".invoice-date").html(parseInvoiceDate(invoice.CbteFch).toLocaleDateString());
                clone.find(".invoice-concept").html(parseInvoiceConcept(invoice.Concepto));
                clone.find(".invoice-cae").html(invoice.CodAutorizacion);
                clone.find(".invoice-amount").html("$" + parseAmount(invoice.ImpTotal));
                clone.appendTo(list);
            });

            total.removeClass("is-hidden");
            total.find(".total-amount").html("$" + parseAmount(totalAmount));
        }
        else {
            noData.removeClass("is-hidden");
        }
    }
    else {
        noData.removeClass("is-hidden");
    }

    spinner.removeClass("is-active");
}

function createViewInvoiceWindow(elem, print, savePdf) {
    let btn = $(elem);
    localStorage.setItem('selectedCae', $($(elem).parent().find('.invoice-cae')).text());
    localStorage.setItem('selectedCaePrint', print);
    localStorage.setItem('selectedCaeSavePdf', savePdf);
    if (!submitSpinner(btn)) {
        const ipcRenderer = require("electron").ipcRenderer;
        ipcRenderer.send("printPDF", '');
    }
    
    submitSpinner(btn, null, false);
  };

  function sendEmail(elem) {
    let btn = $(elem);
    if (!submitSpinner(btn)) {
        let email = prompt("Ingrese la casilla de email:", "");
        if (email) {
            const ipcRenderer = require("electron").ipcRenderer;
            ipcRenderer.send("SendIt", $($(elem).parent().find('.invoice-cae')).text(),email);
        }
    }
    
    submitSpinner(btn, null, false);
  };