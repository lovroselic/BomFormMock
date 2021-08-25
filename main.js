/*jshint -W097 */
/*jshint -W117 */
"use strict";
console.clear();

/**
    simplifications:
        assumed  units, no conversions

*/
/**
 * TODO:
 * if ref by mass, ignore mol
 */

var descriptors = ['Component', 'Ref'];
var inputs = ['factor', 'mol', 'mass', 'volume'];
var properties = ['MW', 'density', 'assay'];
var headers = [...descriptors, ...inputs, ...properties];

var CALC = {
    factor(arg) {
        console.log(".....calc factor", arg);
        let value;
        if (arg.selectedFactor === arg.referenceFactor) {
            value = APP.STACK.REFERENCE_FACTOR;
        } else {
            value = arg.selectedFactor / arg.referenceFactor;
        }
        if (Number.isNaN(value)) return "";
        return value.toFixed(2);
    },
    mass(arg) {
        console.log(".....calc mass", arg);
        let value = parseFloat(arg.mol * arg.MW);
        if (Number.isNaN(value)) {
            value = parseFloat(arg.volume * arg.density);
        }
        if (Number.isNaN(value)) return "";
        return Number(value / arg.assay).toFixed(2);
    },
    volume(arg) {
        console.log(".....calc volume", arg);
        let value = parseFloat(arg.mass / arg.density);
        if (Number.isNaN(value)) return "";
        return value.toFixed(2);
    },
    mol(arg) {
        console.log(".....calc mol", arg);
        let value = parseFloat(arg.mass / arg.MW);
        if (Number.isNaN(value)) return "";
        return Number(value * arg.assay).toFixed(2);
    }
};
var APP = {
    version: "0.4.0",
    STACK: {
        TARGET: null,
        REFERENCE_FACTOR: 1
    },
    TABLE: {
        draw() {
            console.log(`%cBOMFormMock v${APP.version}`, 'color: green');
            this.writeHeaders();
            this.writeComponents();
        },
        writeHeaders() {
            let html = "";
            for (let col of headers) {
                html += `<th scope="col">${col}</th>`;
            }
            $("#table > thead > tr").html(html);
        },
        writeComponents() {
            //components
            for (let comp in COMPONENTS) {
                let html = "<tr>";
                // name
                html += `<td>${COMPONENTS[comp].name}</td>`;
                //ref
                html += `<td><input type="radio" name="reference" id="Ref_Component${comp}" value = "Ref_Component${comp}"></td>`;
                //inputs
                for (let inp of inputs) {
                    html += `<td><input class="response Component${comp} ${inp}" type="text" id = "Component${comp}_${inp}"></td>`;
                }
                //properties
                for (let prop of properties) {
                    let propertyValue = COMPONENTS[comp][prop] || "";
                    html += `<td id = "Component${comp}_${prop}">${propertyValue}</td>`;
                }

                html += "</tr>";
                //insert row
                $("#table > tbody").append(html);
            }
            //sum
            let html = `<tr class="table-dark"><td colspan="2">Sum</td>`;
            for (let inp of inputs) {
                html += `<td id = "S_${inp}"></td>`;
            }
            html += `<td colspan=${properties.length}></td></tr>`;
            $("#table > tbody").append(html);
            $("#table > tbody").append(`<tr class="table-dark"><td colspan=${headers.length}>Products</td></tr>`);
            //products
            for (let comp in PRODUCTS) {
                let html = '<tr>';
                // name
                html += `<td>${PRODUCTS[comp].name}</td>`;
                //ref
                html += `<td><input type="radio" name="reference" id="Ref_Product${comp}" value = "Ref_Product${comp}"></td>`;
                //inputs
                for (let inp of inputs) {
                    html += `<td><input class="response Product${comp} ${inp}" type="text" id = "Product${comp}_${inp}"></td>`;
                }
                //properties
                for (let prop of properties) {
                    let propertyValue = PRODUCTS[comp][prop] || "";
                    html += `<td id = "Product${comp}_${prop}">${propertyValue}</td>`;
                }

                html += "</tr>";
                //insert row
                $("#table > tbody").append(html);
            }
            // first checked by default
            $("#Ref_Component1").prop("checked", true);
            // first factor 1 by default
            $("#Component1_factor").val(1);
        }
    },
    getReferenceRow() {
        let R = $('input[name=reference]:checked').val();
        R = R.substring(R.indexOf("_") + 1);
        return R;
    },
    handle() {
        console.clear();
        let id = this.id;
        let row = id.substring(0, id.indexOf("_"));
        let column = id.substring(id.indexOf("_") + 1);
        let referenceBy = $('input[name=whichref]:checked').val();
        console.log('OLD APP.STACK.TARGET', APP.STACK.TARGET);
        console.log('OLD APP.STACK.REFERENCE_FACTOR', APP.STACK.REFERENCE_FACTOR);
        console.log("HANDLE", "id", id, "row", row, "column", column, "referenceBy", referenceBy);
        let R = APP.getReferenceRow();
        console.log(".R", R);
        let rowResponses = $(`.${row}`);

        // calc all in the row
        for (let response of rowResponses) {
            if (response.id === id) continue; //this was entered
            console.log("..", response.id);
            let responseColumn = response.id.substring(id.indexOf("_") + 1);
            let ARG = APP.packArguments(row, R, referenceBy);
            console.log("....Column: ", responseColumn, " #### ");
            $(`#${response.id}`).val(CALC[responseColumn](ARG));
        }
        //calc scale factor and scale the row
        //let oldFactor = parseFloat($(`#${row}_${referenceBy}`).val()) / parseFloat($(`#${R}_${referenceBy}`).val());
        let oldFactor;
        if (row !== R) {
            oldFactor = parseFloat($(`#${row}_${referenceBy}`).val()) / parseFloat($(`#${R}_${referenceBy}`).val());
        } else {
            // can't calculate old reference factor from changed data;
            oldFactor = APP.STACK.REFERENCE_FACTOR;
        }
        let scaleFactor = parseFloat($(`#${row}_factor`).val()) / oldFactor;
        console.log("oldFactor", oldFactor, "scaleFactor", scaleFactor);
        //scale the row
        if (!Number.isNaN(scaleFactor)) {
            for (let inp of inputs) {
                if (inp === 'factor') continue;
                $(`#${row}_${inp}`).val(Number($(`#${row}_${inp}`).val() * scaleFactor).toFixed(2));
            }
        }

        //if row is Reference, then all the table needs to be recalcd, except Reference row
        console.log("----------------------\n", row, R, row === R);

        if (row === R) {
            let allResponses = $(".response");
            for (let response of allResponses) {
                if (response.id === id) continue; //this was entered
                let rowIdentifier = response.id.substring(0, response.id.indexOf("_"));
                if (rowIdentifier === R) continue; //skip Reference row
                let columnIdentifier = response.id.substring(response.id.indexOf("_") + 1);
                console.log("... recalc:", response.id);
                let targetScaleFactor = parseFloat($(`#${R}_${referenceBy}`).val()) / APP.STACK.TARGET;
                console.log('....targetScaleFactor', targetScaleFactor);
                let value = parseFloat($(`#${response.id}`).val());
                value *= targetScaleFactor;
                if (Number.isNaN(value)) {
                    value = "";
                } else {
                    value = Number(value).toFixed(2);
                }
                console.log("....value", value, "id", rowIdentifier + "_" + columnIdentifier);
                $(`#${response.id}`).val(value);
            }
        }

        //mass sum
        let massSum = 0;
        for (let component = 1; component <= Object.keys(COMPONENTS).length; component++) {
            massSum += parseFloat($(`#Component${component}_mass`).val()) || 0;
        }
        $(`#S_mass`).html(massSum.toFixed(2));
        APP.storeReferences(R, referenceBy);
    },
    /*handle() {
        //let element = this;
        let value = parseFloat(this.value);
        let id = this.id;
        let row = id.substring(0, id.indexOf("Input"));
        console.log("row", row);
        let R = $('input[name=reference]:checked').val();
        let referenceBy = $('input[name=whichref]:checked').val();
        //console.log("handler", id, value, "R", R, referenceBy);
        // all responses in a row to be processed
        let responses = $(".response");
        console.log("responses", responses);
        var refIndex = inputs.indexOf(referenceBy);
        for (let response of responses) { 
            if (response.id === id) continue; //this was entered
            let inputIdentifier = parseInt(response.id.substring(response.id.indexOf("Input") + "Input".length), 10);
            let rowIdentifier = response.id.substring(0, response.id.indexOf("Input"));
            if (rowIdentifier !== row) continue; //
            let ref = `${R.substring(3)}Input${refIndex}`;
            let selected = `${rowIdentifier}Input${refIndex}`;
            let ratio = APP.getRatio(selected, ref);
            console.log("response.id", response.id);
            if (inputIdentifier === inputs.indexOf("ratio")) {
                $(`#${response.id}`).val(ratio || "");

            } else {
                //if (referenceBy === "mass" && inputIdentifier === inputs.indexOf("mol")) continue; //
                let ARG = APP.packArguments(rowIdentifier);
                ARG.ratio = ratio;
                let func = CALC[inputs[inputIdentifier]];
                //console.log(".func", func);
                //calc value
                $(`#${response.id}`).val(func.call(null, ARG));
                //
                //break;
            }

        }
        //mass sum
        let massSum = 0;
        for (let component = 1; component <= Object.keys(COMPONENTS).length; component++) {
            massSum += parseFloat($(`#Component${component}Input${inputs.indexOf("mass")}`).val()) || 0;
        }
        $(`#S${inputs.indexOf("mass")}`).html(massSum);

        //if reference by mass fill massSum as target value
        if (referenceBy === 'mass') {
            //$("#Product1Input1").val(massSum); //direct, does not scale, refactor!!
            $(`#Product1Input${inputs.indexOf("mass")}`).val(massSum);
        }

    },*/

    handleReferenceRowChange() {
        console.clear();
        let R = APP.getReferenceRow();
        let referenceBy = $('input[name=whichref]:checked').val();
        console.log(".R", R);
        APP.storeReferences(R, referenceBy);
        //reference was changed so we need to change target
        /*APP.STACK.TARGET = parseFloat($(`#${R}_${referenceBy}`).val());
        console.log('APP.STACK.TARGET', APP.STACK.TARGET);*/
    },
    packArguments(row, R, referenceBy) {
        let arg = {};
        //inputs
        for (let inp of inputs) {
            let id = `${row}_${inp}`;
            arg[inp] = parseFloat($(`#${id}`).val());
        }
        //properties
        for (let prop of properties) {
            let id = `${row}_${prop}`;
            arg[prop] = parseFloat($(`#${id}`).html());
        }
        arg.assay = arg.assay || 1;
        console.log(">>>", `#${R}_${referenceBy}`, `#${row}_${referenceBy}`);
        arg.referenceFactor = parseFloat($(`#${R}_${referenceBy}`).val());
        arg.selectedFactor = parseFloat($(`#${row}_${referenceBy}`).val());
        return arg;
    },
    storeReferences(R, referenceBy) {
        // store target for reference
        APP.STACK.TARGET = parseFloat($(`#${R}_${referenceBy}`).val());
        APP.STACK.REFERENCE_FACTOR = parseFloat($(`#${R}_factor`).val());
        console.log('APP.STACK.TARGET', APP.STACK.TARGET);
        console.log('APP.STACK.REFERENCE_FACTOR', APP.STACK.REFERENCE_FACTOR);
    }
};

APP.TABLE.draw();
$('input[type=radio][name=reference]').change(APP.handleReferenceRowChange);
$(".response").change(APP.handle);