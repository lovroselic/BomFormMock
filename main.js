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
        let value = arg.selectedFactor / arg.referenceFactor;
        if (Number.isNaN(value)) return "";
        return value;
    },
    mass(arg) {
        console.log(".....calc mass", arg);
        let value = parseFloat(arg.mol * arg.MW);
        if (Number.isNaN(value)) {
            value = parseFloat(arg.volume * arg.density);
        }
        if (Number.isNaN(value)) return "";
        return value / arg.assay;
    },
    volume(arg) {
        console.log(".....calc volume", arg);
        let value = parseFloat(arg.mass / arg.density);
        if (Number.isNaN(value)) return "";
        return value;
    },
    mol(arg) {
        console.log(".....calc mol", arg);
        let value = parseFloat(arg.mass / arg.MW);
        if (Number.isNaN(value)) return "";
        return value * arg.assay;
    }
};
var APP = {
    version: "0.2.1",
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
    handle() {
        console.clear();
        //let value = parseFloat(this.value);
        let id = this.id;
        let row = id.substring(0, id.indexOf("_"));
        let column = id.substring(id.indexOf("_") + 1);
        let referenceBy = $('input[name=whichref]:checked').val();
        console.log("HANDLE", id, row, column, "referenceBy", referenceBy);
        let R = $('input[name=reference]:checked').val();
        R = R.substring(R.indexOf("_") + 1);
        console.log(".R", R);
        //let allResponses = $(".response");
        let rowResponses = $(`.${row}`);

        // calc all in the row
        for (let response of rowResponses) {
            if (response.id === id) continue; //this was entered
            // if (!response.id.startsWith(`${row}_`)) continue;
            console.log("..", response.id);
            let responseColumn = response.id.substring(id.indexOf("_") + 1);
            let ARG = APP.packArguments(row, R, referenceBy);
            console.log("....Column: ", responseColumn, " #### ");
            $(`#${response.id}`).val(CALC[responseColumn](ARG));
        }
        //calc scale factor and scale the row
        let oldFactor = parseFloat($(`#${row}_${referenceBy}`).val()) / parseFloat($(`#${R}_${referenceBy}`).val());
        let scaleFactor = parseFloat($(`#${row}_factor`).val()) / oldFactor;
        console.log("oldFactor", oldFactor, "scaleFactor", scaleFactor);
        //scale the row
        for (let inp of inputs){
            if (inp === 'factor') continue; 
            $(`#${row}_${inp}`).val($(`#${row}_${inp}`).val() * scaleFactor);
        }
        //if row is Reference, then all the table needs to be recalcd, except Reference row
        console.log("\n");
        if (row === R){
            let allResponses = $(".response");
            for (let response of allResponses){
                if (response.id === id) continue; //this was entered
                let rowIdentifier = response.id.substring(0, id.indexOf("_"));
                if (rowIdentifier === R) continue; //skip Reference row
                console.log("... recalc:", response.id);
            }
        }


        //mass sum
        let massSum = 0;
        for (let component = 1; component <= Object.keys(COMPONENTS).length; component++) {
            massSum += parseFloat($(`#Component${component}_mass`).val()) || 0;
        }
        $(`#S_mass`).html(massSum);
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
    getRatio(selected, ref) {
        return parseFloat($(`#${selected}`).val()) / parseFloat($(`#${ref}`).val());
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
    }
};
APP.TABLE.draw();
$(".response").change(APP.handle);